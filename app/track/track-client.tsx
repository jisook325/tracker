"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { postSleepEvent, putMood } from "../../lib/workerApi";

type Tab = "mood" | "sleep";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function minutesFromNow(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

function hhmmFromMinutes(min: number) {
  const m = ((min % 1440) + 1440) % 1440; // safe wrap
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad2(hh)}:${pad2(mm)}`;
}

function getTodayKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

function isValidDateKey(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export default function TrackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab")?.toLowerCase() === "sleep" ? "sleep" : "mood";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    setTab(searchParams.get("tab")?.toLowerCase() === "sleep" ? "sleep" : "mood");
  }, [searchParams]);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState<"mood" | "wake" | "bed" | null>(null);
  const [lastResult, setLastResult] = useState<{ type: "mood" | "wake" | "bed"; date: string; timeLabel?: string; mood?: string } | null>(
    null,
  );

  // “오늘”을 시스템이 잡는다 (유저에게는 노출 최소)
  const todayKey = useMemo(() => getTodayKey(), []);

  // Sleep 입력용 시간 (기본값: 현재 시간)
  const [minuteValue, setMinuteValue] = useState<number>(() => minutesFromNow(new Date()));

  // 페이지 진입 시 최신 현재시간으로 한 번 동기화
  useEffect(() => {
    setMinuteValue(minutesFromNow(new Date()));
  }, []);

  const timeLabel = useMemo(() => hhmmFromMinutes(minuteValue), [minuteValue]);

  const handleMood = async (mood: string) => {
    setLoading("mood");
    setStatus("기록 중...");
    try {
      const dateKey = getTodayKey();
      if (!isValidDateKey(dateKey)) {
        console.error("invalid date key", { dateKey });
        setStatus("오류: 날짜 계산 실패");
        return;
      }
      console.log("mood save dateKey", dateKey);
      await putMood(dateKey, mood);
      setStatus(`기록 완료: mood=${mood}`);
      setLastResult({ type: "mood", date: dateKey, mood });
      console.log("mood saved", { date: dateKey, mood });
      router.push("/board?tab=mood");
    } catch (err) {
      console.error("failed to save mood", err);
      setStatus("오류: mood 저장 실패");
    } finally {
      setLoading(null);
    }
  };

  const handleSleep = async (type: "bed" | "wake") => {
    setLoading(type);
    setStatus("기록 중...");
    try {
      const dateKey = getTodayKey();
      if (!isValidDateKey(dateKey)) {
        console.error("invalid date key", { dateKey });
        setStatus("오류: 날짜 계산 실패");
        return;
      }
      console.log("sleep save dateKey", dateKey, type);
      await postSleepEvent(dateKey, type, minuteValue);
      setStatus(`기록 완료: ${type === "bed" ? "취침" : "기상"} ${timeLabel}`);
      setLastResult({ type, date: dateKey, timeLabel });
      console.log("sleep event saved", { date: dateKey, type, minuteValue, timeLabel });
      router.push("/board?tab=sleep");
    } catch (err) {
      console.error("failed to save sleep event", err);
      setStatus("오류: 수면 기록 실패");
    } finally {
      setLoading(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "white" }}>
      {/* Top tabs */}
      <header style={{ padding: 16, borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTab("mood")}
            style={{
              padding: "8px 12px",
              borderRadius: 0,
              border: "1px solid #7CFFB2",
              background: tab === "mood" ? "#39FF8F" : "#BFFFD9",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Mood
          </button>
          <button
            onClick={() => setTab("sleep")}
            style={{
              padding: "8px 12px",
              borderRadius: 0,
              border: "1px solid #7CFFB2",
              background: tab === "sleep" ? "#39FF8F" : "#BFFFD9",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            Sleep
          </button>
        </div>

        {/* 내부적으로만 오늘 키를 사용(지금은 디버그 최소 노출) */}
        <div style={{ marginTop: 8, fontSize: 11, color: "#999" }}>
          today: {todayKey}
        </div>
      </header>

      {/* Content */}
      {tab === "mood" ? (
        <MoodView onSelect={handleMood} isSaving={loading === "mood"} status={status} lastResult={lastResult} />
      ) : (
        <SleepView
          timeLabel={timeLabel}
          onPlus30={() => setMinuteValue((v) => v + 30)}
          onMinus30={() => setMinuteValue((v) => v - 30)}
          onWake={() => handleSleep("wake")}
          onBed={() => handleSleep("bed")}
          isSavingWake={loading === "wake"}
          isSavingBed={loading === "bed"}
          status={status}
          lastResult={lastResult}
        />
      )}
    </main>
  );
}

function MoodView(props: {
  onSelect: (mood: string) => void;
  isSaving: boolean;
  status: string | null;
  lastResult: { type: "mood" | "wake" | "bed"; date: string; timeLabel?: string; mood?: string } | null;
}) {
  // MVP: mood 옵션은 임시 하드코딩. (다음 마일스톤에서 user_settings로 이동)
  const moods = ["좋음", "그럭저럭", "피곤", "스트레스", "행복"];

  return (
    <section style={{ padding: 16 }}>
      <div style={{ textAlign: "center", padding: "56px 0 24px" }}>
        <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>mood</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        {moods.map((m) => (
          <button
            key={m}
            style={{
              width: 220,
              height: 56,
              background: "#d1d1d1",
              border: "1px solid #cfcfcf",
              cursor: props.isSaving ? "wait" : "pointer",
              fontSize: 14,
              fontWeight: 700,
              color: "#111",
            }}
            onClick={() => props.onSelect(m)}
            disabled={props.isSaving}
          >
            {m}
          </button>
        ))}

        {props.status ? (
          <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4, textAlign: "center" }}>{props.status}</div>
        ) : null}
        {props.lastResult?.type === "mood" ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, textAlign: "center" }}>
            최근 기록: {props.lastResult.date} mood={props.lastResult.mood}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SleepView(props: {
  timeLabel: string;
  onPlus30: () => void;
  onMinus30: () => void;
  onWake: () => void;
  onBed: () => void;
  isSavingWake: boolean;
  isSavingBed: boolean;
  status: string | null;
  lastResult: { type: "mood" | "wake" | "bed"; date: string; timeLabel?: string; mood?: string } | null;
}) {
  return (
    <section style={{ padding: 16 }}>
      <div style={{ textAlign: "center", padding: "48px 0 16px" }}>
        <div style={{ fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>{props.timeLabel}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 8 }}>
        <button
          onClick={props.onPlus30}
          style={{
            width: 120,
            height: 40,
            background: "#BFFFD9",
            border: "1px solid #7CFFB2",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          +30분
        </button>
        <button
          onClick={props.onMinus30}
          style={{
            width: 120,
            height: 40,
            background: "#BFFFD9",
            border: "1px solid #7CFFB2",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          -30분
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 80 }}>
        <button
          onClick={props.onWake}
          style={{
            width: 140,
            height: 52,
            background: "#39FF8F",
            border: "1px solid #25d874",
            cursor: props.isSavingWake ? "wait" : "pointer",
            fontSize: 14,
            fontWeight: 800,
          }}
          disabled={props.isSavingWake}
        >
          {props.isSavingWake ? "저장 중..." : "기상"}
        </button>
        <button
          onClick={props.onBed}
          style={{
            width: 140,
            height: 52,
            background: "#39FF8F",
            border: "1px solid #25d874",
            cursor: props.isSavingBed ? "wait" : "pointer",
            fontSize: 14,
            fontWeight: 800,
          }}
          disabled={props.isSavingBed}
        >
          {props.isSavingBed ? "저장 중..." : "취침"}
        </button>
      </div>

      {props.status ? (
        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 12, textAlign: "center" }}>{props.status}</div>
      ) : null}
      {props.lastResult && props.lastResult.type !== "mood" ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, textAlign: "center" }}>
          최근 기록: {props.lastResult.date} {props.lastResult.type === "bed" ? "취침" : "기상"} {props.lastResult.timeLabel}
        </div>
      ) : null}
    </section>
  );
}
