import { type NextRequest } from "next/server";
import { getWeatherAtLocation } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return Response.json(
      { error: "lat and lng query parameters are required" },
      { status: 400 }
    );
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    return Response.json(
      { error: "lat and lng must be valid numbers" },
      { status: 400 }
    );
  }

  try {
    const weather = await getWeatherAtLocation(lat, lng);
    return Response.json(weather);
  } catch (err) {
    console.error("[weather] fetch error:", err);
    return Response.json(
      { error: "Failed to fetch weather data" },
      { status: 502 }
    );
  }
}
