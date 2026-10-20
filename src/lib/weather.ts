/**
 * Open-Meteo client.
 *
 * Docs: https://open-meteo.com/en/docs
 * The API is free and needs no API key, which keeps the project easy to run
 * for the whole class.
 */

import { buildOfflineBundle } from "./mock";
import type { City, CurrentWeather, DailyWeather, HourlyWeather, WeatherBundle } from "./types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "surface_pressure",
  "wind_speed_10m",
  "wind_direction_10m",
].join(",");

const HOURLY_FIELDS = [
  "temperature_2m",
  "weather_code",
  "precipitation_probability",
  "relative_humidity_2m",
  "wind_speed_10m",
  "is_day",
].join(",");

const DAILY_FIELDS = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "sunrise",
  "sunset",
  "precipitation_probability_max",
  "wind_speed_10m_max",
  "uv_index_max",
].join(",");

interface OpenMeteoResponse {
  current?: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    weather_code: number;
    cloud_cover: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    weather_code: number[];
    precipitation_probability: number[];
    relative_humidity_2m: number[];
    wind_speed_10m: number[];
    is_day: number[];
  };
  daily?: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
  };
  utc_offset_seconds?: number;
  timezone?: string;
}

function at<T>(list: T[] | undefined, index: number, fallback: T): T {
  if (!list || index < 0 || index >= list.length) return fallback;
  const value = list[index];
  return value === undefined || value === null ? fallback : value;
}

/**
 * Fetches the full weather bundle for a city.
 * Never throws: when the network fails we return an offline bundle instead.
 */
export async function fetchWeather(city: City, signal?: AbortSignal): Promise<WeatherBundle> {
  try {
    const params = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: CURRENT_FIELDS,
      hourly: HOURLY_FIELDS,
      daily: DAILY_FIELDS,
      timezone: "auto",
      forecast_days: "7",
      wind_speed_unit: "kmh",
    });

    const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });
    if (!response.ok) throw new Error(`Forecast failed: ${response.status}`);
    const json = (await response.json()) as OpenMeteoResponse;

    if (!json.current || !json.hourly || !json.daily) {
      throw new Error("Forecast payload is missing fields");
    }

    const currentIndex = json.hourly.time.findIndex(
      (time) => time.slice(0, 13) === json.current!.time.slice(0, 13)
    );
    const nowIndex = currentIndex >= 0 ? currentIndex : 0;

    const current: CurrentWeather = {
      time: json.current.time,
      temperature: json.current.temperature_2m,
      apparentTemperature: json.current.apparent_temperature,
      humidity: json.current.relative_humidity_2m,
      precipitation: json.current.precipitation,
      weatherCode: json.current.weather_code,
      isDay: json.current.is_day === 1,
      cloudCover: json.current.cloud_cover,
      pressure: json.current.surface_pressure,
      windSpeed: json.current.wind_speed_10m,
      windDirection: json.current.wind_direction_10m,
      uvIndex: 0,
      visibility: 10,
      sunrise: at(json.daily?.sunrise, 0, "06:00").slice(-5),
      sunset: at(json.daily?.sunset, 0, "18:00").slice(-5),
    };

    const hourly: HourlyWeather[] = json.hourly.time.slice(nowIndex, nowIndex + 24).map((time, i) => ({
      time,
      temperature: at(json.hourly?.temperature_2m, nowIndex + i, 0),
      weatherCode: at(json.hourly?.weather_code, nowIndex + i, 0),
      precipitationProbability: at(json.hourly?.precipitation_probability, nowIndex + i, 0),
      humidity: at(json.hourly?.relative_humidity_2m, nowIndex + i, 0),
      windSpeed: at(json.hourly?.wind_speed_10m, nowIndex + i, 0),
      isDay: at(json.hourly?.is_day, nowIndex + i, 1) === 1,
    }));

    const daily: DailyWeather[] = json.daily.time.map((date, i) => ({
      date,
      weatherCode: at(json.daily?.weather_code, i, 0),
      maxTemperature: at(json.daily?.temperature_2m_max, i, 0),
      minTemperature: at(json.daily?.temperature_2m_min, i, 0),
      sunrise: at(json.daily?.sunrise, i, "").slice(-5),
      sunset: at(json.daily?.sunset, i, "").slice(-5),
      precipitationProbability: at(json.daily?.precipitation_probability_max, i, 0),
      windSpeed: at(json.daily?.wind_speed_10m_max, i, 0),
      uvIndex: at(json.daily?.uv_index_max, i, 0),
    }));

    // The UV index is only reported for the current hour in the daily set.
    current.uvIndex = daily[0]?.uvIndex ?? 0;

    return {
      city,
      current,
      hourly,
      daily,
      offline: false,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error;
    return buildOfflineBundle(city);
  }
}

/** Lightweight request used by the "My cities" list (current conditions only). */
export async function fetchCurrentOnly(
  city: City,
  signal?: AbortSignal
): Promise<CurrentWeather | null> {
  try {
    const params = new URLSearchParams({
      latitude: String(city.latitude),
      longitude: String(city.longitude),
      current: CURRENT_FIELDS,
      timezone: "auto",
      wind_speed_unit: "kmh",
    });
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`, { signal });
    if (!response.ok) return null;
    const json = (await response.json()) as OpenMeteoResponse;
    if (!json.current) return null;
    return {
      time: json.current.time,
      temperature: json.current.temperature_2m,
      apparentTemperature: json.current.apparent_temperature,
      humidity: json.current.relative_humidity_2m,
      precipitation: json.current.precipitation,
      weatherCode: json.current.weather_code,
      isDay: json.current.is_day === 1,
      cloudCover: json.current.cloud_cover,
      pressure: json.current.surface_pressure,
      windSpeed: json.current.wind_speed_10m,
      windDirection: json.current.wind_direction_10m,
      uvIndex: 0,
      visibility: 10,
      sunrise: "06:00",
      sunset: "18:00",
    };
  } catch {
    return null;
  }
}
