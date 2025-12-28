export type CellState = "empty" | "partial" | "full";

export type DaySummary = {
  date: string;
  mood?: string | null;
  moodDateSource?: "today" | "yesterday" | null;
  hasSleep?: boolean;
  sleepEvents?: { type: string; timestampLocal: string }[];
  sleepPairs?: { durationMinutes: number; bedTimestamp: string; wakeTimestamp: string }[];
  state: CellState;
};

const baseUrl = "/api/worker";

async function apiFetch<T>(path: string, init?: RequestInit & { skipAuthHeaders?: boolean }): Promise<T> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };

  const res = await fetch(`${baseUrl}${path}`, {
    cache: "no-store",
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("worker api error", res.status, text);
    throw new Error(text || `Request failed ${res.status}`);
  }

  return (await res.json()) as T;
}

export async function fetchDays(params?: { from?: string; to?: string }) {
  const query = new URLSearchParams();
  if (params?.from) query.set("from", params.from);
  if (params?.to) query.set("to", params.to);
  const q = query.toString();
  return apiFetch<{ from: string; to: string; days: DaySummary[]; pairs?: { durationMinutes: number; wakeDate: string; bedTimestamp: string; wakeTimestamp: string }[] }>(
    `/days${q ? `?${q}` : ""}`,
  );
}

export async function putMood(date: string, mood: string, moodDateSource: "today" | "yesterday" = "today") {
  if (!date) {
    console.error("putMood missing date");
    throw new Error("missing date");
  }
  return apiFetch(`/days/${date}`, {
    method: "PUT",
    body: JSON.stringify({ mood, moodDateSource }),
  });
}

export async function postSleepEvent(date: string, type: "bed" | "wake", timeMinute: number) {
  return apiFetch(`/sleep-events`, {
    method: "POST",
    body: JSON.stringify({ date, type, timeMinute }),
  });
}
