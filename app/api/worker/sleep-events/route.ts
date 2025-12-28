import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../_utils";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const body = await req.text();
  return forwardToWorker(`/sleep-events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...buildAuthHeaders(auth.session!),
    },
    body,
  });
}
