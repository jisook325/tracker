import { drizzle } from "drizzle-orm/d1";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { dayEntries, sleepEvents, users } from "../db/schema";
import { analyzeSleepEvents } from "./sleep";
import { CellState } from "./types";

type Env = {
  DB: D1Database;
  WORKER_SECRET?: string;
};

const schema = { dayEntries, sleepEvents, users };

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
  "Access-Control-Allow-Headers": "content-type,x-mock-user,x-mock-email,x-user-id,x-user-email,x-user-ts,x-user-sig",
};

const jsonWithCors = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json", ...corsHeaders },
    ...init,
  });

async function parseBody<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch (err) {
    console.error("JSON parse error", err);
    return null;
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");
const toDateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function defaultRange() {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 30);
  const to = new Date(today);
  to.setDate(today.getDate() + 1);
  return { from: toDateKey(from), to: toDateKey(to) };
}

async function ensureUser(db: ReturnType<typeof drizzle>, googleUserId: string, email?: string) {
  const existing = await db.query.users.findFirst({
    where: eq(users.googleUserId, googleUserId),
  });
  if (existing) return existing;

  await db.insert(users).values({ googleUserId, email });
  const created = await db.query.users.findFirst({
    where: eq(users.googleUserId, googleUserId),
  });
  return created!;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const db = drizzle(env.DB, { schema });

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    let userId = req.headers.get("x-mock-user") ?? "mock-user";
    let userEmail = req.headers.get("x-mock-email") ?? undefined;

    if (env.WORKER_SECRET) {
      const headerUserId = req.headers.get("x-user-id");
      const headerEmail = req.headers.get("x-user-email") ?? "";
      const headerTs = req.headers.get("x-user-ts");
      const headerSig = req.headers.get("x-user-sig");

      if (!headerUserId || !headerTs || !headerSig) {
        return jsonWithCors({ error: "unauthorized" }, { status: 401 });
      }

      const payload = `${headerUserId}|${headerEmail}|${headerTs}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env.WORKER_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const expected = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      const now = Date.now();
      const ts = Number(headerTs);
      if (!Number.isFinite(ts) || Math.abs(now - ts) > 5 * 60 * 1000) {
        return jsonWithCors({ error: "unauthorized" }, { status: 401 });
      }

      if (expected !== headerSig) {
        return jsonWithCors({ error: "unauthorized" }, { status: 401 });
      }

      userId = headerUserId;
      userEmail = headerEmail || undefined;
    }

    const user = await ensureUser(db, userId, userEmail);

    if (url.pathname === "/health") {
      return jsonWithCors({ ok: true, userId: user.id });
    }

    if (req.method === "PUT" && url.pathname.startsWith("/days/")) {
      const date = url.pathname.replace("/days/", "");
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return jsonWithCors({ error: "invalid date" }, { status: 400 });

      const body = await parseBody<{ mood?: string; moodDateSource?: "today" | "yesterday" }>(req);
      if (!body || !body.mood) return jsonWithCors({ error: "mood required" }, { status: 400 });

      await db
        .insert(dayEntries)
        .values({
          userId: user.id,
          date,
          mood: body.mood,
          moodDateSource: body.moodDateSource ?? "today",
        })
        .onConflictDoUpdate({
          target: [dayEntries.userId, dayEntries.date],
          set: { mood: body.mood, moodDateSource: body.moodDateSource ?? "today" },
        });

      return jsonWithCors({ ok: true, date, mood: body.mood });
    }

    if (req.method === "POST" && url.pathname === "/sleep-events") {
      const body = await parseBody<{ type?: "bed" | "wake"; date?: string; timeMinute?: number; timestamp?: string }>(req);
      if (!body || !body.type) return jsonWithCors({ error: "type required" }, { status: 400 });
      if (body.type !== "bed" && body.type !== "wake") return jsonWithCors({ error: "invalid type" }, { status: 400 });

      let timestampLocal = body.timestamp;

      if (!timestampLocal) {
        if (!body.date || typeof body.timeMinute !== "number") return jsonWithCors({ error: "date and timeMinute required" }, { status: 400 });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return jsonWithCors({ error: "invalid date" }, { status: 400 });

        const minutes = Math.max(0, Math.min(1439, Math.floor(body.timeMinute)));
        const hh = pad2(Math.floor(minutes / 60));
        const mm = pad2(minutes % 60);
        timestampLocal = `${body.date}T${hh}:${mm}`;
      }

      await db.insert(sleepEvents).values({
        userId: user.id,
        type: body.type,
        timestampLocal,
      });

      return jsonWithCors({ ok: true });
    }

    if (req.method === "GET" && url.pathname === "/days") {
      const from = url.searchParams.get("from") ?? defaultRange().from;
      const to = url.searchParams.get("to") ?? defaultRange().to;

      const entries = await db
        .select()
        .from(dayEntries)
        .where(and(eq(dayEntries.userId, user.id), gte(dayEntries.date, from), lte(dayEntries.date, to)));

      const sleep = await db
        .select()
        .from(sleepEvents)
        .where(
          and(eq(sleepEvents.userId, user.id), gte(sleepEvents.timestampLocal, `${from}T00:00`), lte(sleepEvents.timestampLocal, `${to}T23:59`)),
        )
        .orderBy(asc(sleepEvents.timestampLocal));

      const analysis = analyzeSleepEvents(sleep);
      const pairs = analysis.pairs;

      const days = new Map<
        string,
        {
          date: string;
          mood?: string | null;
          moodDateSource?: string | null;
          hasSleep?: boolean;
          sleepEvents?: { type: string; timestampLocal: string }[];
          sleepPairs?: { durationMinutes: number; bedTimestamp: string; wakeTimestamp: string }[];
          state: CellState;
        }
      >();

      for (const entry of entries) {
        const existing = days.get(entry.date) ?? { date: entry.date, state: "empty" as CellState };
        existing.mood = entry.mood;
        existing.moodDateSource = entry.moodDateSource;
        days.set(entry.date, existing);
      }

      for (const pair of pairs) {
        const date = pair.wakeDate;
        const existing = days.get(date) ?? { date, state: "empty" as CellState };
        existing.hasSleep = true;
        existing.sleepPairs = [
          ...(existing.sleepPairs ?? []),
          { durationMinutes: pair.durationMinutes, bedTimestamp: pair.bed.timestampLocal, wakeTimestamp: pair.wake.timestampLocal },
        ];
        days.set(date, existing);
      }

      // Unpaired events (partial sleep) still count as partial
      for (const s of sleep) {
        const date = s.timestampLocal.slice(0, 10);
        const existing = days.get(date) ?? { date, state: "empty" as CellState };
        if (!existing.hasSleep) {
          existing.hasSleep = true;
        }
        existing.sleepEvents = [...(existing.sleepEvents ?? []), { type: s.type, timestampLocal: s.timestampLocal }];
        days.set(date, existing);
      }

      for (const [date, info] of days.entries()) {
        const hasMood = Boolean(info.mood);
        const hasSleep = Boolean(info.hasSleep);
        const state: CellState = hasMood && hasSleep ? "full" : hasMood || hasSleep ? "partial" : "empty";
        days.set(date, { ...info, state });
      }

      // Sorted response for frontend ease
      const result = Array.from(days.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
      return jsonWithCors({
        from,
        to,
        days: result,
        pairs,
        sleepUnmatched: {
          beds: analysis.unmatchedBeds.length,
          wakes: analysis.unmatchedWakes.length,
        },
      });
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
