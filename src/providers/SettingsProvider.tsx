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

import type { SpeedUnit, TemperatureUnit } from "@/lib/types";
import { getThemeColors, type ThemeColors } from "@/constants/theme";

export type Appearance = "light" | "dark" | "system";

export interface Settings {
  temperatureUnit: TemperatureUnit;
  speedUnit: SpeedUnit;
  notifications: boolean;
  language: string;
  appearance: Appearance;
}

const DEFAULT_SETTINGS: Settings = {
  temperatureUnit: "c",
  speedUnit: "kmh",
  notifications: true,
  language: "English",
  appearance: "light",
};

const STORAGE_KEY = "weatherly.settings.v1";

interface SettingsContextValue {
  settings: Settings;
  colors: ThemeColors;
  ready: boolean;
  update: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && !cancelled) {
          setSettings((current) => ({ ...current, ...(JSON.parse(stored) as Partial<Settings>) }));
        }
      } catch {
        // Keep the defaults when storage is unavailable.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback<SettingsContextValue["update"]>((key, value) => {
    setSettings((current) => {
      const next = { ...current, [key]: value };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS)).catch(() => undefined);
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      colors: getThemeColors(settings.appearance === "dark"),
      ready,
      update,
      reset,
    }),
    [settings, ready, update, reset]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside <SettingsProvider>");
  return context;
}

export function useAppColors(): ThemeColors {
  return useSettings().colors;
}
