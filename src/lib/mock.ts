/**
 * Deterministic offline weather generator.
 *
 * The app talks to the free Open-Meteo API, but the demo has to keep working
 * in classrooms/schools where the network is unreliable. When a request fails
 * we synthesise a plausible payload from the city coordinates so every screen
 * still renders meaningful numbers.
 */

import type { City, CurrentWeather, DailyWeather, HourlyWeather, WeatherBundle } from "./types";

/** Small, fast, stable string hash → 32 bit integer. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pseudo random number generator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEATHER_CODES = [0, 1, 2, 2, 3, 61, 80, 45, 95, 2, 1, 0];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function toLocalISO(date: Date, offsetHours: number): string {
  const shifted = new Date(date.getTime() + offsetHours * 3600 * 1000);
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate()
  )}T${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}

export function buildOfflineBundle(city: City, now: Date = new Date()): WeatherBundle {
  const random = rng(hash(`${city.name}-${city.latitude.toFixed(2)}-${city.longitude.toFixed(2)}`));
  const offsetHours = Math.round(city.longitude / 15);

  // Equatorial locations stay warm, higher latitudes cool down.
  const latitudeFactor = 30 - Math.abs(city.latitude) * 0.42;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const season = Math.sin(((dayOfYear - 100) / 365) * Math.PI * 2);
  const baseTemperature = latitudeFactor + season * 4 + (random() - 0.5) * 3;

  const localNow = new Date(now.getTime() + offsetHours * 3600 * 1000);
  const currentHour = localNow.getUTCHours();

  const sunrise = "05:45";
  const sunset = "18:05";
  const isDay = currentHour >= 6 && currentHour < 18;

  const weatherCode = WEATHER_CODES[Math.floor(random() * WEATHER_CODES.length)];

  const current: CurrentWeather = {
    time: toLocalISO(now, offsetHours),
    temperature: round(baseTemperature + (isDay ? 1.5 : -1.2)),
    apparentTemperature: round(baseTemperature + 2.4 + (isDay ? 1.5 : -1.2)),
    humidity: Math.round(58 + random() * 34),
    precipitation: round(random() * 1.4, 1),
    weatherCode,
    isDay,
    cloudCover: Math.round(12 + random() * 70),
    pressure: Math.round(1004 + random() * 14),
    windSpeed: round(4 + random() * 16),
    windDirection: Math.round(random() * 360),
    uvIndex: round((isDay ? 4 : 0) + random() * 3, 1),
    visibility: round(6 + random() * 9, 1),
    sunrise,
    sunset,
  };

  const hourly: HourlyWeather[] = [];
  for (let offset = 0; offset < 24; offset++) {
    const hour = (currentHour + offset) % 24;
    const daylight = hour >= 6 && hour < 18;
    const curve = Math.sin(((hour - 9) / 24) * Math.PI * 2);
    hourly.push({
      time: toLocalISO(new Date(now.getTime() + offset * 3600 * 1000), offsetHours),
      temperature: round(baseTemperature + curve * 3.4 + (random() - 0.5) * 0.8),
      weatherCode: daylight ? WEATHER_CODES[Math.floor(random() * 8)] : 1,
      precipitationProbability: Math.round(random() * 45),
      humidity: Math.round(60 + random() * 30),
      windSpeed: round(3 + random() * 14),
      isDay: daylight,
    });
  }

  const daily: DailyWeather[] = [];
  for (let day = 0; day < 7; day++) {
    const date = new Date(now.getTime() + day * 86400000);
    const dayRandom = rng(hash(`${city.name}-${day}`))();
    daily.push({
      date: toLocalISO(date, offsetHours).slice(0, 10),
      weatherCode: WEATHER_CODES[Math.floor(dayRandom * WEATHER_CODES.length)],
      maxTemperature: round(baseTemperature + 3.6 + dayRandom * 1.6),
      minTemperature: round(baseTemperature - 3.4 - dayRandom * 1.2),
      sunrise,
      sunset,
      precipitationProbability: Math.round(dayRandom * 60),
      windSpeed: round(4 + dayRandom * 14),
      uvIndex: round(3 + dayRandom * 5, 1),
    });
  }

  return {
    city,
    current,
    hourly,
    daily,
    offline: true,
    fetchedAt: now.toISOString(),
  };
}

function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
