/**
 * Weatherly domain models.
 */

export interface City {
  id: string;
  name: string;
  country: string;
  /** Region / province, e.g. "Daerah Khusus Ibukota Jakarta". */
  region?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  cloudCover: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  uvIndex: number;
  visibility: number;
  sunrise: string;
  sunset: string;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  weatherCode: number;
  precipitationProbability: number;
  humidity: number;
  windSpeed: number;
  isDay: boolean;
}

export interface DailyWeather {
  date: string;
  weatherCode: number;
  maxTemperature: number;
  minTemperature: number;
  sunrise: string;
  sunset: string;
  precipitationProbability: number;
  windSpeed: number;
  uvIndex: number;
}

export interface WeatherBundle {
  city: City;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  /** `true` when the payload was generated locally (offline / demo mode). */
  offline: boolean;
  fetchedAt: string;
}

export type TemperatureUnit = "c" | "f";
export type SpeedUnit = "kmh" | "mph";
