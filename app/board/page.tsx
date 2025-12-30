import Link from "next/link";
import { headers } from "next/headers";
import { CellState, DaySummary } from "../../lib/workerApi";
import { getSession } from "../../lib/session";

export const dynamic = "force-dynamic";
export const runtime = "edge";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getKstDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function dateFromKey(key: string) {
  const [y, m, d] = key.split("-").map((v) => Number(v));
  return new Date(y, m - 1, d);
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function buildMonthMatrix(year: number, monthIndex0: number): { key: string; isBlank: boolean }[][] {
  const first = new Date(year, monthIndex0, 1);
  const last = new Date(year, monthIndex0 + 1, 0);

  // Monday-first index: 0..6
  const firstDow = (first.getDay() + 6) % 7;

  const cells: { key: string; isBlank: boolean }[] = [];
  for (let i = 0; i < firstDow; i++) cells.push({ key: "", isBlank: true });

  for (let day = 1; day <= last.getDate(); day++) {
    const d = new Date(year, monthIndex0, day);
    cells.push({ key: toKey(d), isBlank: false });
  }

  while (cells.length % 7 !== 0) cells.push({ key: "", isBlank: true });

  const weeks: { key: string; isBlank: boolean }[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const moodColorMap: Record<string, string> = {
  좋음: "#FF3B30",
  그럭저럭: "#FF9500",
  피곤: "#FFCC00",
  스트레스: "#34C759",
  행복: "#007AFF",
};

function sleepColorFromMinutes(minutes: number) {
  if (minutes <= 120) return "#4B5563"; // dark gray
  if (minutes <= 360) return "#F97316"; // orange
  if (minutes <= 480) return "#22C55E"; // green
  return "#3B82F6"; // blue
}

async function fetchWorkerDays() {
  const envBaseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL;
  const requestHeaders = await headers();
  const baseUrl =
    envBaseUrl?.replace(/\/$/, "") ||
    (() => {
      const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
      const proto = requestHeaders.get("x-forwarded-proto") ?? "http";
      return host ? `${proto}://${host}` : "http://127.0.0.1:3000";
    })();
  const cookie = requestHeaders.get("cookie");
  const outboundHeaders: Record<string, string> = {
    "content-type": "application/json",
  };
  if (cookie) outboundHeaders.cookie = cookie;

  const res = await fetch(`${baseUrl}/api/worker/days`, {
    method: "GET",
    headers: outboundHeaders,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `worker days failed ${res.status}`);
  }

  return (await res.json()) as { from: string; to: string; days: DaySummary[]; pairs?: { durationMinutes: number; wakeDate: string }[] };
}

function cellStyle(
  state: CellState,
  isBlank: boolean,
  isToday: boolean,
  mood?: string | null,
  sleepMinutes?: number | null,
  sleepPartial?: boolean,
  activeTab?: "mood" | "sleep",
) {
  if (isBlank) return { background: "#ffffff", border: "1px solid transparent" };

  let background = "#e9e9e9"; // empty
  if (activeTab === "sleep") {
    if (typeof sleepMinutes === "number") {
      background = sleepColorFromMinutes(sleepMinutes);
    } else if (sleepPartial) {
      background = "#e5e7eb";
    }
  } else if (mood && moodColorMap[mood]) {
    background = moodColorMap[mood];
  } else if (state === "partial") {
    background = "#7CFFB2";
  } else if (state === "full") {
    background = "#1B8A3A";
  }

  return {
    background,
    border: "1px solid #e5e7eb",
    borderRadius: 6,
    width: 22,
    height: 22,
    outline: isToday ? "2px solid #111" : "none",
    outlineOffset: 2,
  } as const;
}

export default async function BoardPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  // mock/session based auth to stay edge-compatible
  await getSession();

  let dayStateMap = new Map<string, CellState>();
  let dayMoodMap = new Map<string, string | null>();
  let daySleepMinutesMap = new Map<string, number>();
  let daySleepPartialMap = new Map<string, boolean>();
  let lastSleepSummary: { date: string; minutes: number }[] = [];
  let lastMoodEntries: { date: string; mood: string }[] = [];
  let latestDetails: DaySummary[] = [];
  const resolvedParams = searchParams ? await searchParams : undefined;
  const tabParamRaw = Array.isArray(resolvedParams?.tab) ? resolvedParams?.tab[0] : resolvedParams?.tab;
  const tabParam = typeof tabParamRaw === "string" ? tabParamRaw.toLowerCase() : "";
  const activeTab = tabParam === "sleep" ? "sleep" : "mood";
  try {
    const result = await fetchWorkerDays();
    dayStateMap = new Map(result.days.map((d) => [d.date, d.state]));
    dayMoodMap = new Map(result.days.map((d) => [d.date, d.mood ?? null]));
    result.days.forEach((d) => {
      if (d.sleepPairs && d.sleepPairs.length > 0) {
        const last = d.sleepPairs[d.sleepPairs.length - 1];
        daySleepMinutesMap.set(d.date, last.durationMinutes);
      } else if (d.sleepEvents && d.sleepEvents.length > 0) {
        daySleepPartialMap.set(d.date, true);
      }
    });
    latestDetails = result.days;
    lastMoodEntries = result.days.filter((d) => d.mood).map((d) => ({ date: d.date, mood: d.mood! }));
    if (result.pairs) {
      lastSleepSummary = result.pairs.map((p) => ({ date: p.wakeDate, minutes: p.durationMinutes }));
    }
  } catch (err) {
    console.error("failed to fetch day states", err);
  }

  const todayKey = getKstDateKey();
  const now = dateFromKey(todayKey);
  const year = now.getFullYear();

  const baseMonth = now.getMonth();
  const months = [baseMonth - 1, baseMonth, baseMonth + 1].filter((m) => m >= 0 && m <= 11);

  return (
    <main style={{ minHeight: "100vh", background: "white" }}>
      {/* Top tabs (디자인 반영: Mood/Sleep 탭은 track에서 실제 입력, board에는 시각적으로만 둘 수도 있음) */}
      <header style={{ padding: 16, borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Link
            href="/board?tab=mood"
            style={{
              padding: "8px 12px",
              border: "1px solid #7CFFB2",
              background: activeTab === "mood" ? "#39FF8F" : "#BFFFD9",
              fontSize: 12,
              color: "#111",
              fontWeight: activeTab === "mood" ? 800 : 600,
            }}
          >
            Mood
          </Link>
          <Link
            href="/board?tab=sleep"
            style={{
              padding: "8px 12px",
              border: "1px solid #7CFFB2",
              background: activeTab === "sleep" ? "#1B8A3A" : "#BFFFD9",
              fontSize: 12,
              color: activeTab === "sleep" ? "#fff" : "#111",
              fontWeight: activeTab === "sleep" ? 800 : 600,
            }}
          >
            Sleep
          </Link>
        </div>
      </header>

      <section style={{ padding: 16 }}>
        {/* Weekday header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "36px repeat(7, 22px)",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            color: "#222",
            marginBottom: 8,
          }}
        >
          <div />
          {["Mon", "Tue", "Wed", "Thr", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} style={{ textAlign: "center" }}>
              {d}
            </div>
          ))}
        </div>

        {/* Months */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {months.map((m) => {
            const matrix = buildMonthMatrix(year, m);
            const label = new Date(year, m, 1).toLocaleString("en-US", { month: "short" });

            return (
              <div key={m} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {matrix.map((week, wi) => (
                  <div
                    key={wi}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "36px repeat(7, 22px)",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {/* month label only on first week */}
                    <div style={{ fontSize: 12, color: "#222" }}>{wi === 0 ? label : ""}</div>

                    {week.map((cell, ci) => {
                      const isToday = !cell.isBlank && cell.key === todayKey;
                      const state = cell.isBlank ? "empty" : dayStateMap.get(cell.key) ?? "empty";
                      const mood = cell.isBlank || activeTab === "sleep" ? null : dayMoodMap.get(cell.key) ?? null;
                      const sleepMinutes =
                        cell.isBlank || activeTab !== "sleep" ? null : daySleepMinutesMap.get(cell.key) ?? null;
                      const sleepPartial =
                        cell.isBlank || activeTab !== "sleep" ? false : daySleepPartialMap.get(cell.key) ?? false;
                      const renderState: CellState =
                        activeTab === "sleep"
                          ? sleepMinutes !== null || sleepPartial
                            ? "partial"
                            : "empty"
                          : mood
                          ? "partial"
                          : "empty";

                      return (
                        <div
                          key={`${m}-${wi}-${ci}-${cell.key}`}
                          data-date={cell.key} // 내부 날짜 매핑은 유지 (요구사항)
                          style={cellStyle(renderState, cell.isBlank, isToday, mood, sleepMinutes, sleepPartial, activeTab)}
                          // 클릭/호버 없음: 보드는 비인터랙션
                        >
                          {activeTab === "sleep" && sleepPartial ? (
                            <span style={{ fontSize: 12, fontWeight: 800, color: "#374151" }}>V</span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Recent info */}
        <div style={{ marginTop: 16, fontSize: 12, color: "#4b5563", display: "flex", flexDirection: "column", gap: 6 }}>
          {activeTab === "mood" ? (
            lastMoodEntries.length > 0 ? (
              <div>
                최근 mood:{" "}
                {lastMoodEntries
                  .slice(-3)
                  .map((m) => `${m.date} (${m.mood})`)
                  .join(", ")}
              </div>
            ) : (
              <div>최근 mood 기록 없음</div>
            )
          ) : lastSleepSummary.length > 0 ? (
            <div>
              최근 수면:{" "}
              {lastSleepSummary
                .slice(-3)
                .map((s) => `${s.date} (${s.minutes}분)`)
                .join(", ")}
            </div>
          ) : (
            <div>최근 수면 기록 없음</div>
          )}

          {/* Last day detail */}
          {latestDetails.length > 0 ? (
            <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.5 }}>
              최근 상태 상세:
              <ul style={{ margin: "4px 0 0 14px", padding: 0 }}>
                {latestDetails.slice(-3).map((d) => (
                  <li key={d.date}>
                    {d.date} → {d.state}{" "}
                    {activeTab === "mood"
                      ? d.mood
                        ? `(mood: ${d.mood}${d.moodDateSource ? `, source=${d.moodDateSource}` : ""})`
                        : "(mood 없음)"
                      : d.sleepPairs && d.sleepPairs.length > 0
                      ? `| sleep pairs: ${d.sleepPairs.map((p) => `${p.durationMinutes}분`).join(", ")}`
                      : d.sleepEvents && d.sleepEvents.length > 0
                      ? `| sleep events: ${d.sleepEvents.map((s) => s.type).join(", ")}`
                      : "| sleep 없음"}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        {/* CTA */}
        <div style={{ marginTop: 20 }}>
          <Link
            href={activeTab === "sleep" ? "/track?tab=sleep" : "/track?tab=mood"}
            style={{
              display: "block",
              width: "100%",
              textAlign: "center",
              padding: "16px 12px",
              fontWeight: 800,
              background: "#39FF8F",
              border: "1px solid #25d874",
              color: "#111",
            }}
          >
            기록하기
          </Link>
        </div>
      </section>
    </main>
  );
}
