import { SleepEvent } from "./types";

export type SleepPair = {
  bed: SleepEvent;
  wake: SleepEvent;
  durationMinutes: number;
  wakeDate: string;
};

export type SleepAnalysis = {
  pairs: SleepPair[];
  unmatchedBeds: SleepEvent[];
  unmatchedWakes: SleepEvent[];
};

const MAX_PAIR_MINUTES = 18 * 60;

function parseTimestamp(ts: string) {
  return Date.parse(ts.replace(" ", "T"));
}

// Given a list of sleep events (sorted by timestamp), pair bed→wake.
export function analyzeSleepEvents(events: SleepEvent[]): SleepAnalysis {
  const pairs: SleepPair[] = [];
  const beds: SleepEvent[] = [];
  const unmatchedWakes: SleepEvent[] = [];

  for (const ev of events) {
    if (ev.type === "bed") {
      beds.push(ev);
      continue;
    }

    if (ev.type === "wake") {
      let matchedIndex = -1;
      let matchedDuration = 0;
      const wakeTs = parseTimestamp(ev.timestampLocal);

      for (let i = beds.length - 1; i >= 0; i -= 1) {
        const bed = beds[i];
        const bedTs = parseTimestamp(bed.timestampLocal);
        const durationMinutes = Math.round((wakeTs - bedTs) / 60000);
        if (durationMinutes < 0) continue;
        if (durationMinutes > MAX_PAIR_MINUTES) continue;
        matchedIndex = i;
        matchedDuration = durationMinutes;
        break;
      }

      if (matchedIndex === -1) {
        unmatchedWakes.push(ev);
        continue;
      }

      const bed = beds.splice(matchedIndex, 1)[0];
      const wakeDate = ev.timestampLocal.slice(0, 10);
      pairs.push({
        bed,
        wake: ev,
        durationMinutes: matchedDuration,
        wakeDate,
      });
    }
  }

  return { pairs, unmatchedBeds: beds, unmatchedWakes };
}
