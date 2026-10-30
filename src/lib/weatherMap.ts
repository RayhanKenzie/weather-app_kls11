/**
 * Weather grid used by the map overlay.
 *
 * Open-Meteo accepts several coordinates in one request, so a whole viewport
 * is sampled in a single call and the result is painted as a soft colour
 * layer on top of the basemap.
 */

import { clampLatitude, normalizeLongitude, type LatLng, type MapBounds } from "./mapTiles";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const CURRENT_FIELDS = [
  "temperature_2m",
  "precipitation",
  "cloud_cover",
  "wind_speed_10m",
  "wind_direction_10m",
].join(",");

/** Keep the request URL comfortable — 63 points is a little over 1 kB. */
export const MAP_COLUMNS = 7;
export const MAP_ROWS = 9;

export type MapLayer = "temperature" | "rain" | "clouds" | "wind";

export interface MapWeatherPoint extends LatLng {
  /** Degrees Celsius, regardless of the display unit. */
  temperature: number;
  /** Millimetres in the last 15 minutes. */
  precipitation: number;
  cloudCover: number;
  /** km/h, regardless of the display unit. */
  windSpeed: number;
  /** Degrees the wind comes from. */
  windDirection: number;
}

export interface WeatherGrid {
  points: MapWeatherPoint[];
  columns: number;
  rows: number;
}

interface OpenMeteoGridEntry {
  latitude?: number;
  longitude?: number;
  current?: {
    temperature_2m?: number;
    precipitation?: number;
    cloud_cover?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
  };
}

/**
 * Samples the visible area on a uniform grid. Returns the sampled points in
 * row-major order so the caller can reason about neighbouring cells.
 */
export async function fetchWeatherGrid(
  bounds: MapBounds,
  columns = MAP_COLUMNS,
  rows = MAP_ROWS,
  signal?: AbortSignal
): Promise<WeatherGrid> {
  const latitudeSpan = Math.max(0.0001, bounds.north - bounds.south);
  const longitudeSpan = Math.max(
    0.0001,
    bounds.east >= bounds.west ? bounds.east - bounds.west : 360 - (bounds.west - bounds.east)
  );

  const latitudes: number[] = [];
  const longitudes: number[] = [];

  for (let row = 0; row < rows; row += 1) {
    const latitude = clampLatitude(bounds.north - (row / Math.max(1, rows - 1)) * latitudeSpan);
    for (let column = 0; column < columns; column += 1) {
      const longitude = normalizeLongitude(
        bounds.west + (column / Math.max(1, columns - 1)) * longitudeSpan
      );
      latitudes.push(latitude);
      longitudes.push(longitude);
    }
  }

  const params = new URLSearchParams({
    latitude: latitudes.map((value) => value.toFixed(3)).join(","),
    longitude: longitudes.map((value) => value.toFixed(3)).join(","),
    current: CURRENT_FIELDS,
    timezone: "auto",
    wind_speed_unit: "kmh",
  });

  const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });
  if (!response.ok) throw new Error(`Weather grid failed: ${response.status}`);

  const json = (await response.json()) as OpenMeteoGridEntry | OpenMeteoGridEntry[];
  const entries = Array.isArray(json) ? json : [json];

  const points: MapWeatherPoint[] = [];
  entries.forEach((entry, index) => {
    const current = entry?.current;
    const temperature = Number(current?.temperature_2m);
    if (!current || !Number.isFinite(temperature)) return;

    // The model snaps coordinates to its own grid; the requested values keep
    // the overlay evenly spaced on screen.
    points.push({
      latitude: latitudes[index] ?? bounds.north,
      longitude: longitudes[index] ?? bounds.west,
      temperature,
      precipitation: Number(current.precipitation ?? 0),
      cloudCover: Number(current.cloud_cover ?? 0),
      windSpeed: Number(current.wind_speed_10m ?? 0),
      windDirection: Number(current.wind_direction_10m ?? 0),
    });
  });

  return { points, columns, rows };
}

interface ColorStop {
  value: number;
  color: string;
}

/**
 * Colour ramps are authored in the API units (°C, mm, %, km/h) so the same
 * point always gets the same colour no matter which unit the UI displays.
 */
const LAYER_STOPS: Record<MapLayer, ColorStop[]> = {
  temperature: [
    { value: -20, color: "#6C63C7" },
    { value: -8, color: "#5F95E8" },
    { value: 2, color: "#4EC5DB" },
    { value: 12, color: "#63C98D" },
    { value: 21, color: "#F3CD52" },
    { value: 30, color: "#F0993F" },
    { value: 40, color: "#E9604D" },
  ],
  rain: [
    { value: 0, color: "#B7DDF6" },
    { value: 0.2, color: "#7DBCF1" },
    { value: 0.8, color: "#4290E4" },
    { value: 2, color: "#2C5AC8" },
    { value: 4, color: "#6A3FC4" },
  ],
  clouds: [
    { value: 0, color: "#E3EEF8" },
    { value: 35, color: "#C3D6E6" },
    { value: 70, color: "#94AEC4" },
    { value: 100, color: "#5E7488" },
  ],
  wind: [
    { value: 0, color: "#6FC6A3" },
    { value: 12, color: "#4FA8E8" },
    { value: 30, color: "#F0B93F" },
    { value: 55, color: "#E9604D" },
  ],
};

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([red, green, blue]: [number, number, number]): string {
  return `#${[red, green, blue]
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Linear interpolation between the stops around `value`. */
function colorForValue(stops: ColorStop[], value: number): string {
  if (!Number.isFinite(value) || value <= stops[0].value) return stops[0].color;
  const last = stops[stops.length - 1];
  if (value >= last.value) return last.color;

  for (let index = 0; index < stops.length - 1; index += 1) {
    const start = stops[index];
    const end = stops[index + 1];
    if (value <= end.value) {
      const ratio = (value - start.value) / Math.max(0.0001, end.value - start.value);
      const from = hexToRgb(start.color);
      const to = hexToRgb(end.color);
      return rgbToHex([
        from[0] + (to[0] - from[0]) * ratio,
        from[1] + (to[1] - from[1]) * ratio,
        from[2] + (to[2] - from[2]) * ratio,
      ]);
    }
  }

  return last.color;
}

/** Raw value driving the colour layer for one sampled point. */
export function layerValue(layer: MapLayer, point: MapWeatherPoint): number {
  switch (layer) {
    case "rain":
      return point.precipitation;
    case "clouds":
      return point.cloudCover;
    case "wind":
      return point.windSpeed;
    default:
      return point.temperature;
  }
}

export function layerColor(layer: MapLayer, point: MapWeatherPoint): string {
  return colorForValue(LAYER_STOPS[layer], layerValue(layer, point));
}

/**
 * Opacity of the soft blob. Rain and cloud cells fade out when there is
 * nothing to show, which gives the rain layer its radar-like look.
 */
export function layerOpacity(layer: MapLayer, point: MapWeatherPoint): number {
  switch (layer) {
    case "rain":
      if (point.precipitation <= 0.02) return 0;
      return 0.28 + Math.min(0.4, point.precipitation * 0.3);
    case "clouds":
      if (point.cloudCover <= 2) return 0;
      return 0.14 + (point.cloudCover / 100) * 0.32;
    case "wind":
      return 0.9;
    default:
      return 0.34;
  }
}

export interface LayerSummary {
  min: number;
  max: number;
  gradient: [string, string, ...string[]];
}

/** Range + legend gradient for the active layer. */
export function layerSummary(layer: MapLayer, points: MapWeatherPoint[]): LayerSummary | null {
  if (points.length === 0) return null;

  const values = points
    .map((point) => layerValue(layer, point))
    .filter((value) => Number.isFinite(value));
  if (values.length === 0) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat range still needs a visible bar.
  const span = Math.max(0.0001, max - min);

  const samples = 9;
  const gradient = Array.from({ length: samples }, (_, index) =>
    colorForValue(LAYER_STOPS[layer], min + (span * index) / (samples - 1))
  ) as [string, string, ...string[]];

  return { min, max, gradient };
}
