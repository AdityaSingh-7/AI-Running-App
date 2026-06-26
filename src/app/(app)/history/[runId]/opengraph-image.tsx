import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const alt = "RunCoach AI — Run Stats";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function formatPace(secsPerKm: number | null | undefined): string {
  if (!secsPerKm || secsPerKm <= 0) return "--:--";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default async function RunOGImage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    select: {
      title: true,
      startedAt: true,
      totalDistanceM: true,
      totalDurationS: true,
      avgPaceSPerKm: true,
    },
  });

  const distanceKm = run ? (run.totalDistanceM / 1000).toFixed(2) : "0.00";
  const pace = run ? formatPace(run.avgPaceSPerKm) : "--:--";
  const duration = run ? formatDuration(run.totalDurationS) : "--";
  const runDate = run
    ? new Date(run.startedAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";
  const runTitle =
    run?.title?.trim() ||
    (run
      ? new Date(run.startedAt).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Run");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#000000",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 40,
                height: 40,
                backgroundColor: "#CFFF04",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ fontSize: 22, fontWeight: 900, color: "#000000" }}>R</span>
            </div>
            <span
              style={{
                fontSize: 22,
                fontWeight: 900,
                color: "#FFFFFF",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              RUNCOACH
            </span>
          </div>
          <span style={{ fontSize: 16, color: "#555555", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            AI
          </span>
        </div>

        {/* Run title */}
        <div style={{ display: "flex", marginTop: 48, marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#888888", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {runTitle}
          </span>
        </div>

        {/* Distance */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 120, fontWeight: 900, color: "#CFFF04", lineHeight: 1, letterSpacing: "-0.04em" }}>
            {distanceKm}
          </span>
          <span style={{ fontSize: 48, fontWeight: 700, color: "#CFFF04", opacity: 0.7, letterSpacing: "0.06em" }}>
            KM
          </span>
        </div>

        {/* Pace · Duration */}
        <div style={{ display: "flex", alignItems: "center", gap: 32, marginTop: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "#555555", letterSpacing: "0.12em", textTransform: "uppercase" }}>Avg Pace</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
              {pace}
              <span style={{ fontSize: 20, fontWeight: 400, color: "#555555", marginLeft: 4 }}>/km</span>
            </span>
          </div>
          <div style={{ width: 1, height: 48, backgroundColor: "#222222" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 13, color: "#555555", letterSpacing: "0.12em", textTransform: "uppercase" }}>Duration</span>
            <span style={{ fontSize: 36, fontWeight: 700, color: "#FFFFFF", letterSpacing: "0.02em" }}>
              {duration}
            </span>
          </div>
        </div>

        {/* Date bottom right */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "auto", paddingTop: 32 }}>
          <span style={{ fontSize: 16, color: "#444444", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            {runDate}
          </span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
