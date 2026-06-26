import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function formatPace(secsPerKm: number | null | undefined): string {
  if (!secsPerKm || secsPerKm <= 0) return "";
  const m = Math.floor(secsPerKm / 60);
  const s = Math.round(secsPerKm % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { runId } = await params;
  const format = request.nextUrl.searchParams.get("format") ?? "gpx";

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { points: { orderBy: { timestamp: "asc" } } },
  });

  if (!run) return new Response("Run not found", { status: 404 });
  if (run.userId !== session.user.id)
    return new Response("Forbidden", { status: 403 });

  const runTitle =
    run.title?.trim() ||
    `Run ${new Date(run.startedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;

  if (format === "gpx") {
    const trackPoints = run.points
      .map((p) => {
        const ele =
          p.altitude != null ? `<ele>${p.altitude.toFixed(1)}</ele>` : "";
        const time = `<time>${new Date(p.timestamp).toISOString()}</time>`;
        return `    <trkpt lat="${p.latitude.toFixed(7)}" lon="${p.longitude.toFixed(7)}">${ele}${time}</trkpt>`;
      })
      .join("\n");

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RunCoach AI"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${runTitle}</name>
    <time>${new Date(run.startedAt).toISOString()}</time>
  </metadata>
  <trk>
    <name>${runTitle}</name>
    <trkseg>
${trackPoints}
    </trkseg>
  </trk>
</gpx>`;

    const filename = `${runTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.gpx`;
    return new Response(gpx, {
      headers: {
        "Content-Type": "application/gpx+xml",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  if (format === "csv") {
    const header = "timestamp,latitude,longitude,altitude,speed,pace\n";
    const rows = run.points
      .map((p) => {
        const ts = new Date(p.timestamp).toISOString();
        const alt = p.altitude != null ? p.altitude.toFixed(1) : "";
        const spd = p.speed != null ? p.speed.toFixed(2) : "";
        const paceVal =
          p.speed != null && p.speed > 0
            ? formatPace(1000 / p.speed)
            : "";
        return `${ts},${p.latitude.toFixed(7)},${p.longitude.toFixed(7)},${alt},${spd},${paceVal}`;
      })
      .join("\n");

    const csv = header + rows;
    const filename = `${runTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response("Invalid format. Use ?format=gpx or ?format=csv", {
    status: 400,
  });
}
