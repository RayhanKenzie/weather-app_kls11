/**
 * WMO weather interpretation codes (Open-Meteo) mapped to the labels and
 * icon kinds used across the app.
 */

export type WeatherKind =
  | "clear"
  | "mostly-clear"
  | "partly-cloudy"
  | "cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "rain"
  | "heavy-rain"
  | "snow"
  | "thunder";

export interface WeatherDescriptor {
  kind: WeatherKind;
  label: string;
  /** Short description used in the hourly/weekly lists. */
  short: string;
}

const DESCRIPTORS: Record<number, WeatherDescriptor> = {
  0: { kind: "clear", label: "Clear sky", short: "Sunny" },
  1: { kind: "mostly-clear", label: "Mainly clear", short: "Mostly sunny" },
  2: { kind: "partly-cloudy", label: "Partly cloudy", short: "Partly cloudy" },
  3: { kind: "overcast", label: "Overcast", short: "Overcast" },
  45: { kind: "fog", label: "Fog", short: "Foggy" },
  48: { kind: "fog", label: "Depositing rime fog", short: "Foggy" },
  51: { kind: "drizzle", label: "Light drizzle", short: "Drizzle" },
  53: { kind: "drizzle", label: "Moderate drizzle", short: "Drizzle" },
  55: { kind: "drizzle", label: "Dense drizzle", short: "Drizzle" },
  56: { kind: "drizzle", label: "Light freezing drizzle", short: "Drizzle" },
  57: { kind: "drizzle", label: "Dense freezing drizzle", short: "Drizzle" },
  61: { kind: "rain", label: "Slight rain", short: "Light rain" },
  63: { kind: "rain", label: "Moderate rain", short: "Rainy" },
  65: { kind: "heavy-rain", label: "Heavy rain", short: "Heavy rain" },
  66: { kind: "drizzle", label: "Light freezing rain", short: "Freezing rain" },
  67: { kind: "rain", label: "Heavy freezing rain", short: "Freezing rain" },
  71: { kind: "snow", label: "Slight snowfall", short: "Light snow" },
  73: { kind: "snow", label: "Moderate snowfall", short: "Snowy" },
  75: { kind: "snow", label: "Heavy snowfall", short: "Heavy snow" },
  77: { kind: "snow", label: "Snow grains", short: "Snowy" },
  80: { kind: "rain", label: "Slight rain showers", short: "Showers" },
  81: { kind: "rain", label: "Moderate rain showers", short: "Showers" },
  82: { kind: "heavy-rain", label: "Violent rain showers", short: "Heavy showers" },
  85: { kind: "snow", label: "Slight snow showers", short: "Snow showers" },
  86: { kind: "snow", label: "Heavy snow showers", short: "Snow showers" },
  95: { kind: "thunder", label: "Thunderstorm", short: "Thunderstorm" },
  96: { kind: "thunder", label: "Thunderstorm with hail", short: "Thunderstorm" },
  99: { kind: "thunder", label: "Heavy thunderstorm with hail", short: "Thunderstorm" },
};

export const FALLBACK_DESCRIPTOR: WeatherDescriptor = {
  kind: "partly-cloudy",
  label: "Partly cloudy",
  short: "Partly cloudy",
};

export function describeWeather(code: number | undefined | null): WeatherDescriptor {
  if (code == null || Number.isNaN(code)) return FALLBACK_DESCRIPTOR;
  return DESCRIPTORS[code] ?? FALLBACK_DESCRIPTOR;
}

/** Groups of weather codes that share the same visual treatment. */
export function weatherFamily(code: number | undefined | null): WeatherKind {
  return describeWeather(code).kind;
}
