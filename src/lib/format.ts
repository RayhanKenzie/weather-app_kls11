/**
 * Formatting helpers shared by every screen.
 */

import type { SpeedUnit, TemperatureUnit } from "./types";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function convertTemperature(value: number, unit: TemperatureUnit): number {
  return unit === "f" ? Math.round((value * 9) / 5 + 32) : Math.round(value);
}

export function formatTemperature(value: number, unit: TemperatureUnit, withDegree = true): string {
  const converted = convertTemperature(value, unit);
  return withDegree ? `${converted}°` : `${converted}`;
}

export function convertSpeed(value: number, unit: SpeedUnit): number {
  return unit === "mph" ? Math.round(value * 0.621371) : Math.round(value);
}

export function formatSpeed(value: number, unit: SpeedUnit): string {
  return `${convertSpeed(value, unit)} km/h`;
}

/** Converts an ISO timestamp (without timezone suffix) into a local `Date`. */
export function parseIso(value: string): Date {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const withZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date(withZone.replace("Z", "")) : parsed;
}

/** "14:00" style label for an hourly entry. */
export function formatHour(value: string): string {
  const date = parseIso(value);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "Now" for the first slot, otherwise the hour label. */
export function formatHourLabel(value: string, index: number): string {
  return index === 0 ? "Now" : formatHour(value);
}

export function formatDayName(date: string, index: number): string {
  if (index === 0) return "Today";
  const parsed = parseIso(date);
  return WEEKDAYS[parsed.getUTCDay()];
}

export function formatShortDay(date: string, index: number): string {
  if (index === 0) return "Today";
  const parsed = parseIso(date);
  return WEEKDAYS[parsed.getUTCDay()].slice(0, 3);
}

export function formatDate(date: string): string {
  const parsed = parseIso(date);
  return `${MONTHS[parsed.getUTCMonth()]} ${parsed.getUTCDate()}`;
}

export function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

/** Turns a wind bearing into a compass point. */
export function windDirection(degrees: number): string {
  const points = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ];
  const index = Math.round(((degrees % 360) / 360) * 16) % 16;
  return points[index];
}

export function uvLabel(uvIndex: number): string {
  if (uvIndex < 3) return "Low";
  if (uvIndex < 6) return "Moderate";
  if (uvIndex < 8) return "High";
  if (uvIndex < 11) return "Very high";
  return "Extreme";
}

export function humidityLabel(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 80) return "Humid";
  return "Very humid";
}

export function visibilityLabel(visibility: number): string {
  if (visibility >= 20) return "Crystal clear";
  if (visibility >= 10) return "Clear";
  if (visibility >= 5) return "Moderate haze";
  return "Poor visibility";
}

export function pressureLabel(pressure: number): string {
  if (pressure < 1000) return "Low pressure";
  if (pressure <= 1020) return "Normal pressure";
  return "High pressure";
}

export function precipitationLabel(amount: number): string {
  if (amount <= 0) return "No precipitation";
  if (amount < 1) return "Light rain";
  if (amount < 4) return "Moderate rain";
  if (amount < 10) return "Heavy rain";
  return "Very heavy rain";
}

export function windLabel(speed: number): string {
  if (speed < 6) return "Calm";
  if (speed < 20) return "Light breeze";
  if (speed < 39) return "Moderate breeze";
  if (speed < 62) return "Fresh breeze";
  return "Strong wind";
}

export function celsiusToFahrenheit(value: number): number {
  return Math.round((value * 9) / 5 + 32);
}
