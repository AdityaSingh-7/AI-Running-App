export interface WeatherData {
  temperature: number; // Celsius
  feelsLike: number;
  humidity: number;
  windSpeed: number; // km/h
  condition: string; // "Clear", "Cloudy", "Rain", etc.
  icon: string; // emoji
}

// WMO Weather interpretation codes → condition + emoji
// https://open-meteo.com/en/docs#weathervariables
const WMO_CODE_MAP: Record<number, { condition: string; icon: string }> = {
  0: { condition: "Clear", icon: "☀️" },
  1: { condition: "Mostly Clear", icon: "🌤️" },
  2: { condition: "Partly Cloudy", icon: "⛅" },
  3: { condition: "Overcast", icon: "☁️" },
  45: { condition: "Foggy", icon: "🌫️" },
  48: { condition: "Icy Fog", icon: "🌫️" },
  51: { condition: "Light Drizzle", icon: "🌦️" },
  53: { condition: "Drizzle", icon: "🌦️" },
  55: { condition: "Heavy Drizzle", icon: "🌦️" },
  56: { condition: "Freezing Drizzle", icon: "🌨️" },
  57: { condition: "Heavy Freezing Drizzle", icon: "🌨️" },
  61: { condition: "Light Rain", icon: "🌧️" },
  63: { condition: "Rain", icon: "🌧️" },
  65: { condition: "Heavy Rain", icon: "🌧️" },
  66: { condition: "Freezing Rain", icon: "🌨️" },
  67: { condition: "Heavy Freezing Rain", icon: "🌨️" },
  71: { condition: "Light Snow", icon: "🌨️" },
  73: { condition: "Snow", icon: "❄️" },
  75: { condition: "Heavy Snow", icon: "❄️" },
  77: { condition: "Snow Grains", icon: "🌨️" },
  80: { condition: "Light Showers", icon: "🌦️" },
  81: { condition: "Showers", icon: "🌧️" },
  82: { condition: "Heavy Showers", icon: "🌧️" },
  85: { condition: "Snow Showers", icon: "🌨️" },
  86: { condition: "Heavy Snow Showers", icon: "🌨️" },
  95: { condition: "Thunderstorm", icon: "⛈️" },
  96: { condition: "Thunderstorm with Hail", icon: "⛈️" },
  99: { condition: "Thunderstorm with Heavy Hail", icon: "⛈️" },
};

function decodeWeatherCode(code: number): { condition: string; icon: string } {
  return WMO_CODE_MAP[code] ?? { condition: "Unknown", icon: "🌡️" };
}

export async function getWeatherAtLocation(
  lat: number,
  lng: number
): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code`;

  const res = await fetch(url, { next: { revalidate: 600 } }); // cache 10 min
  if (!res.ok) {
    throw new Error(`Open-Meteo returned ${res.status}`);
  }

  const data = (await res.json()) as {
    current: {
      temperature_2m: number;
      apparent_temperature: number;
      relative_humidity_2m: number;
      wind_speed_10m: number;
      weather_code: number;
    };
  };

  const c = data.current;
  const { condition, icon } = decodeWeatherCode(c.weather_code);

  return {
    temperature: Math.round(c.temperature_2m * 10) / 10,
    feelsLike: Math.round(c.apparent_temperature * 10) / 10,
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m * 10) / 10,
    condition,
    icon,
  };
}
