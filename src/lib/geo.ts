export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function calculatePace(
  distanceMeters: number,
  durationSeconds: number
): number {
  if (distanceMeters <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return durationSeconds / distanceKm;
}

export function formatPace(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return "--:--";
  }
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDistance(
  meters: number,
  unit: "km" | "miles"
): string {
  if (unit === "miles") {
    const miles = meters / 1609.344;
    return `${miles.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

export function formatDuration(seconds: number): string {
  const totalSeconds = Math.max(0, Math.round(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function isValidGpsPoint(point: {
  accuracy?: number;
  speed?: number;
}): boolean {
  if (point.accuracy !== undefined && point.accuracy >= 30) {
    return false;
  }
  if (point.speed !== undefined && point.speed >= 12) {
    return false;
  }
  return true;
}

export function smoothPace(
  points: Array<{ pace: number }>,
  windowSize: number
): number {
  if (points.length === 0) return 0;

  const window = points.slice(-windowSize);
  const validPoints = window.filter(
    (p: { pace: number }) => p.pace > 0 && isFinite(p.pace)
  );

  if (validPoints.length === 0) return 0;

  const sum = validPoints.reduce(
    (acc: number, p: { pace: number }) => acc + p.pace,
    0
  );
  return sum / validPoints.length;
}
