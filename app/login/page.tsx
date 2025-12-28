"use client";

import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 360, border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Daily Life Tracker</h1>
        <p style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
          Google 로그인만 지원합니다. (MVP)
        </p>

        <button
          style={{
            marginTop: 20,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #e5e7eb",
            fontWeight: 600,
            fontSize: 13,
            background: "white",
            cursor: "pointer",
          }}
          onClick={() => signIn("google", { callbackUrl: "/board" })}
        >
          Google로 시작하기
        </button>
      </div>
    </main>
  );
}
