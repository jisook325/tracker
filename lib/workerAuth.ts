import crypto from "crypto";

const WORKER_SECRET = process.env.WORKER_SECRET;

export function buildWorkerAuthHeaders(userId: string, email?: string | null) {
  if (!WORKER_SECRET) {
    return {
      "x-mock-user": userId,
      ...(email ? { "x-mock-email": email } : {}),
    };
  }

  const ts = Date.now().toString();
  const payload = `${userId}|${email ?? ""}|${ts}`;
  const sig = crypto.createHmac("sha256", WORKER_SECRET).update(payload).digest("hex");

  return {
    "x-user-id": userId,
    "x-user-email": email ?? "",
    "x-user-ts": ts,
    "x-user-sig": sig,
  };
}
