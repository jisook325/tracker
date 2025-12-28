import { Suspense } from "react";
import TrackClient from "./track-client";

export const dynamic = "force-dynamic";

export default function TrackPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: "100vh", background: "white" }} />}>
      <TrackClient />
    </Suspense>
  );
}
