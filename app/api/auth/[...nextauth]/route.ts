export const runtime = "edge";
export const dynamic = "force-dynamic";

// Simple stub auth endpoint to keep edge-compatible build.
export async function GET() {
  return Response.json({ ok: true, user: { id: "local-user" } });
}

export async function POST() {
  return GET();
}
