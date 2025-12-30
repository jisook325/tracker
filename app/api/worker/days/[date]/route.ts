import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../../_utils";

export const runtime = "edge";

export async function PUT(req: NextRequest, context: any) {
  const params = context?.params as { date?: string } | undefined;
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const pathDate = req.nextUrl.pathname.split("/").pop();
  const date = params?.date || pathDate;
  if (!date) {
    return new Response(JSON.stringify({ error: "missing date", path: req.nextUrl.pathname }), { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: "invalid date", date }), { status: 400 });
  }

  const body = await req.text();
  const headers = new Headers();
  headers.set("content-type", "application/json");
  const authHeaders = await buildAuthHeaders(auth.session!);
  Object.entries(authHeaders).forEach(([key, value]) => headers.set(key, value));
  return forwardToWorker(`/days/${date}`, {
    method: "PUT",
    headers,
    body,
  });
}
