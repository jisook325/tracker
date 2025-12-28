import { NextRequest } from "next/server";
import { buildAuthHeaders, forwardToWorker, requireSession } from "../_utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  const search = req.nextUrl.search;
  return forwardToWorker(`/days${search}`, {
    method: "GET",
    headers: buildAuthHeaders(auth.session!),
  });
}
