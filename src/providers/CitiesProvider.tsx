import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { DEFAULT_CITY, POPULAR_CITIES } from "@/lib/cities";
import type { City } from "@/lib/types";

const STORAGE_KEY = "weatherly.cities.v1";
export const MAX_SAVED_CITIES = 8;

const DEFAULT_SAVED_CITIES: City[] = [
  POPULAR_CITIES[0],
  POPULAR_CITIES[1],
  POPULAR_CITIES[2],
  POPULAR_CITIES[3],
  POPULAR_CITIES[4],
];

interface CitiesContextValue {
  cities: City[];
  selectedCity: City;
  ready: boolean;
  isSaved: (id: string) => boolean;
  addCity: (city: City) => boolean;
  removeCity: (id: string) => void;
  selectCity: (city: City) => void;
  reorder: (from: number, to: number) => void;
}

const CitiesContext = createContext<CitiesContextValue | null>(null);

export function CitiesProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>(DEFAULT_SAVED_CITIES);
  const [selectedCity, setSelectedCity] = useState<City>(DEFAULT_CITY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as { cities?: City[]; selected?: City };
          if (parsed.cities?.length) setCities(parsed.cities);
          if (parsed.selected) setSelectedCity(parsed.selected);
        }
      } catch {
        // Fall back to the bundled defaults.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((nextCities: City[], nextSelected: City) => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ cities: nextCities, selected: nextSelected })
    ).catch(() => undefined);
  }, []);

  const isSaved = useCallback(
    (id: string) => cities.some((city) => city.id === id),
    [cities]
  );

  const addCity = useCallback(
    (city: City) => {
      let added = false;
      setCities((current) => {
        if (current.some((item) => item.id === city.id) || current.length >= MAX_SAVED_CITIES) {
          return current;
        }
        added = true;
        const next = [...current, city];
        persist(next, city);
        return next;
      });
      if (added) setSelectedCity(city);
      return added;
    },
    [persist]
  );

  const removeCity = useCallback(
    (id: string) => {
      setCities((current) => {
        const next = current.filter((city) => city.id !== id);
        persist(next, selectedCity);
        return next;
      });
    },
    [persist, selectedCity]
  );

  const selectCity = useCallback(
    (city: City) => {
      setSelectedCity(city);
      persist(cities, city);
    },
    [cities, persist]
  );

  const reorder = useCallback(
    (from: number, to: number) => {
      setCities((current) => {
        const next = [...current];
        const [moved] = next.splice(from, 1);
        if (!moved) return current;
        next.splice(to, 0, moved);
        persist(next, selectedCity);
        return next;
      });
    },
    [persist, selectedCity]
  );

  const value = useMemo<CitiesContextValue>(
    () => ({ cities, selectedCity, ready, isSaved, addCity, removeCity, selectCity, reorder }),
    [cities, selectedCity, ready, isSaved, addCity, removeCity, selectCity, reorder]
  );

  return <CitiesContext.Provider value={value}>{children}</CitiesContext.Provider>;
}

export function useCities(): CitiesContextValue {
  const context = useContext(CitiesContext);
  if (!context) throw new Error("useCities must be used inside <CitiesProvider>");
  return context;
}
