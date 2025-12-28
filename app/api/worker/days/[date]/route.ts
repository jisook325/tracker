import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../../_utils";

export const runtime = "nodejs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ date: string }> }) {
  const resolved = await params;
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const pathDate = req.nextUrl.pathname.split("/").pop();
  const date = resolved?.date || pathDate;
  if (!date) {
    return new Response(JSON.stringify({ error: "missing date", path: req.nextUrl.pathname }), { status: 400 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return new Response(JSON.stringify({ error: "invalid date", date }), { status: 400 });
  }

  const body = await req.text();
  return forwardToWorker(`/days/${date}`, {
    method: "PUT",
    headers: new Headers({
      "content-type": "application/json",
      ...buildAuthHeaders(auth.session!),
    }),
    body,
  });
}
