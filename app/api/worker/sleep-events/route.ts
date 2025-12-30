import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../_utils";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const body = await req.text();
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const authHeaders = await buildAuthHeaders(auth.session!);
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
  return forwardToWorker(`/sleep-events`, {
    method: "POST",
    headers,
    body,
  });
}
