import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const search = req.nextUrl.search;
  const headers = new Headers();
  const authHeaders = buildAuthHeaders(auth.session!) as Record<string, string>;
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
  return forwardToWorker(`/days${search}`, {
    method: "GET",
    headers,
  });
}
