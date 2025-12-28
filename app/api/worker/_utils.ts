import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/authOptions";
import { buildWorkerAuthHeaders } from "../../../lib/workerAuth";

const WORKER_BASE_URL =
  process.env.WORKER_BASE_URL ||
  process.env.NEXT_PUBLIC_WORKER_BASE_URL ||
  "http://127.0.0.1:8787";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!session || !userId) {
    return { session: null, response: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  return { session, response: null };
}

export async function forwardToWorker(path: string, init?: RequestInit) {
  try {
    const outboundHeaders = new Headers(init?.headers || {});

    const res = await fetch(`${WORKER_BASE_URL}${path}`, {
      ...init,
      headers: outboundHeaders,
    });
    const body = await res.arrayBuffer();

    const responseHeaders = new Headers(res.headers);
    // Avoid double-decoding issues when proxying compressed responses.
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("content-length");
    responseHeaders.delete("transfer-encoding");

    const response = new NextResponse(body, {
      status: res.status,
      headers: responseHeaders,
    });
    return response;
  } catch (err) {
    console.error("worker fetch failed", err);
    return NextResponse.json({ error: "worker_unreachable" }, { status: 502 });
  }
}

export function buildAuthHeaders(session: NonNullable<Awaited<ReturnType<typeof getServerSession>>>) {
  const user = (session as any)?.user as { id?: string; email?: string } | undefined;
  const userId = user?.id || user?.email || "local-user";
  return buildWorkerAuthHeaders(userId, user?.email);
}
