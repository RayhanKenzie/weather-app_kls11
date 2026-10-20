import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useCities } from "./CitiesProvider";
import { fetchWeather } from "@/lib/weather";
import type { City, WeatherBundle } from "@/lib/types";

interface WeatherContextValue {
  bundle: WeatherBundle | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  loadFor: (city: City) => Promise<WeatherBundle>;
}

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const { selectedCity } = useCities();
  const [bundle, setBundle] = useState<WeatherBundle | null>(null);
  const [cache, setCache] = useState<Record<string, WeatherBundle>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The bundle for the city that is currently selected (from cache or state).
  const current =
    bundle && bundle.city.id === selectedCity.id ? bundle : (cache[selectedCity.id] ?? null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await fetchWeather(selectedCity);
        if (cancelled) return;
        setCache((previous) => ({ ...previous, [selectedCity.id]: result }));
        setBundle(result);
        setError(null);
      } catch {
        if (!cancelled) setError("Unable to load the forecast.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCity]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await fetchWeather(selectedCity);
      setCache((previous) => ({ ...previous, [selectedCity.id]: result }));
      setBundle(result);
      setError(null);
    } catch {
      setError("Unable to refresh the forecast.");
    } finally {
      setRefreshing(false);
    }
  }, [selectedCity]);

  const loadFor = useCallback(async (city: City) => {
    const cached = cache[city.id];
    if (cached) return cached;
    const result = await fetchWeather(city);
    setCache((previous) => ({ ...previous, [city.id]: result }));
    return result;
  }, [cache]);

  const value = useMemo<WeatherContextValue>(
    () => ({
      bundle: current,
      loading: current === null,
      refreshing,
      error,
      refresh,
      loadFor,
    }),
    [current, refreshing, error, refresh, loadFor]
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather(): WeatherContextValue {
  const context = useContext(WeatherContext);
  if (!context) throw new Error("useWeather must be used inside <WeatherProvider>");
  return context;
}
