const WORKER_SECRET = process.env.WORKER_SECRET;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function buildWorkerAuthHeaders(userId: string, email?: string | null) {
  if (!WORKER_SECRET) {
    return {
      "x-mock-user": userId,
      ...(email ? { "x-mock-email": email } : {}),
    };
  }

  const ts = Date.now().toString();
  const payload = `${userId}|${email ?? ""}|${ts}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(WORKER_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sigBuf = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  const sig = toHex(sigBuf);

  return {
    "x-user-id": userId,
    "x-user-email": email ?? "",
    "x-user-ts": ts,
    "x-user-sig": sig,
  };
}
