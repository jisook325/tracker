import { cookies } from "next/headers";

export type Session = {
  user: { id: string; email?: string | null };
};

// Lightweight mock session for Edge runtime.
export async function getSession(): Promise<Session> {
  const store = await cookies();
  const id = store.get("mock-user")?.value || "local-user";
  const email = store.get("mock-email")?.value || "local@example.com";
  return { user: { id, email } };
}
