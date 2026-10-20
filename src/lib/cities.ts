/**
 * City catalogue + geocoding helpers.
 *
 * Remote search uses the free Open-Meteo geocoding endpoint. The bundled
 * catalogue keeps the popular-city chips and the "All cities" list populated
 * even without a network connection.
 */

import type { City } from "./types";

export const POPULAR_CITIES: City[] = [
  {
    id: "jakarta",
    name: "Jakarta",
    country: "Indonesia",
    region: "Daerah Khusus Ibukota Jakarta",
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: "Asia/Jakarta",
  },
  {
    id: "bandung",
    name: "Bandung",
    country: "Indonesia",
    region: "Jawa Barat",
    latitude: -6.9175,
    longitude: 107.6191,
    timezone: "Asia/Jakarta",
  },
  {
    id: "surabaya",
    name: "Surabaya",
    country: "Indonesia",
    region: "Jawa Timur",
    latitude: -7.2575,
    longitude: 112.7521,
    timezone: "Asia/Jakarta",
  },
  {
    id: "bali",
    name: "Bali",
    country: "Indonesia",
    region: "Bali",
    latitude: -8.4095,
    longitude: 115.1889,
    timezone: "Asia/Makassar",
  },
  {
    id: "yogyakarta",
    name: "Yogyakarta",
    country: "Indonesia",
    region: "DI Yogyakarta",
    latitude: -7.7956,
    longitude: 110.3695,
    timezone: "Asia/Jakarta",
  },
  {
    id: "medan",
    name: "Medan",
    country: "Indonesia",
    region: "Sumatera Utara",
    latitude: 3.5952,
    longitude: 98.6722,
    timezone: "Asia/Jakarta",
  },
];

export const ALL_CITIES: City[] = [
  ...POPULAR_CITIES,
  {
    id: "semarang",
    name: "Semarang",
    country: "Indonesia",
    region: "Jawa Tengah",
    latitude: -6.9667,
    longitude: 110.4167,
    timezone: "Asia/Jakarta",
  },
  {
    id: "makassar",
    name: "Makassar",
    country: "Indonesia",
    region: "Sulawesi Selatan",
    latitude: -5.1477,
    longitude: 119.4327,
    timezone: "Asia/Makassar",
  },
  {
    id: "hanoi",
    name: "Hanoi",
    country: "Vietnam",
    region: "Hà Nội",
    latitude: 21.0278,
    longitude: 105.8342,
    timezone: "Asia/Bangkok",
  },
  {
    id: "singapore",
    name: "Singapore",
    country: "Singapore",
    region: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    timezone: "Asia/Singapore",
  },
  {
    id: "tokyo",
    name: "Tokyo",
    country: "Japan",
    region: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: "Asia/Tokyo",
  },
  {
    id: "london",
    name: "London",
    country: "United Kingdom",
    region: "England",
    latitude: 51.5072,
    longitude: -0.1276,
    timezone: "Europe/London",
  },
  {
    id: "new-york",
    name: "New York",
    country: "United States",
    region: "New York",
    latitude: 40.7128,
    longitude: -74.006,
    timezone: "America/New_York",
  },
  {
    id: "sydney",
    name: "Sydney",
    country: "Australia",
    region: "New South Wales",
    latitude: -33.8688,
    longitude: 151.2093,
    timezone: "Australia/Sydney",
  },
];

export const DEFAULT_CITY = POPULAR_CITIES[0];

export function findCityById(id: string): City | undefined {
  return ALL_CITIES.find((city) => city.id === id);
}

/** Normalises a city name into a stable identifier. */
export function cityId(name: string, latitude: number, longitude: number): string {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug}-${latitude.toFixed(2)}-${longitude.toFixed(2)}`;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

function toCity(result: GeocodingResult): City {
  return {
    id: cityId(result.name, result.latitude, result.longitude),
    name: result.name,
    country: result.country ?? "",
    region: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
    timezone: result.timezone,
  };
}

/**
 * Searches for a city. Uses Open-Meteo geocoding when online and falls back to
 * filtering the bundled catalogue when offline.
 */
export async function searchCities(query: string): Promise<City[]> {
  const term = query.trim();
  if (term.length === 0) return ALL_CITIES;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      term
    )}&count=20&language=en&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Geocoding failed: ${response.status}`);
    const json = (await response.json()) as { results?: GeocodingResult[] };
    const results = json.results ?? [];
    if (results.length === 0) return localSearch(term);
    return results.map(toCity);
  } catch {
    return localSearch(term);
  }
}

function localSearch(term: string): City[] {
  const lowered = term.toLowerCase();
  return ALL_CITIES.filter(
    (city) =>
      city.name.toLowerCase().includes(lowered) || city.country.toLowerCase().includes(lowered)
  );
}
