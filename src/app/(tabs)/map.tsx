import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Chip, IconButton } from "@/components/ui";
import { WeatherIcon } from "@/components/WeatherIcon";
import { WeatherMap } from "@/components/WeatherMap";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import {
  convertSpeed,
  convertTemperature,
  formatTemperature,
  formatUpdatedAt,
} from "@/lib/format";
import { translateText } from "@/lib/i18n";
import { boundsForView, clampZoom, type MapSize, type MapViewState } from "@/lib/mapTiles";
import type { City, CurrentWeather, SpeedUnit, TemperatureUnit } from "@/lib/types";
import { fetchCurrentOnly } from "@/lib/weather";
import { useWeather } from "@/providers/WeatherProvider";
import {
  fetchWeatherGrid,
  layerSummary,
  MAP_COLUMNS,
  MAP_ROWS,
  type MapLayer,
  type WeatherGrid,
} from "@/lib/weatherMap";
import { describeWeather } from "@/lib/wmo";
import { useCities } from "@/providers/CitiesProvider";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";

const LAYERS: { key: MapLayer; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "temperature", label: "Temperature", icon: "thermometer-outline" },
  { key: "rain", label: "Rain", icon: "rainy-outline" },
  { key: "clouds", label: "Clouds", icon: "cloudy-outline" },
  { key: "wind", label: "Wind", icon: "navigate-outline" },
];

const EMPTY_GRID: WeatherGrid = { points: [], columns: MAP_COLUMNS, rows: MAP_ROWS };

type GridStatus = "loading" | "idle" | "offline";

/**
 * 09 — Weather map. A pannable OpenStreetMap basemap with a live weather
 * overlay sampled from Open-Meteo.
 */
export default function WeatherMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const { cities, selectedCity, selectCity } = useCities();
  const { bundle } = useWeather();
  const { settings } = useSettings();
  const palette = useAppColors();
  const label = useCallback(
    (text: string) => translateText(text, settings.language),
    [settings.language]
  );

  const [view, setView] = useState<MapViewState>(() => ({
    latitude: selectedCity.latitude,
    longitude: selectedCity.longitude,
    zoom: 6,
  }));
  const [size, setSize] = useState<MapSize>({ width: window.width, height: window.height });
  const [layer, setLayer] = useState<MapLayer>("temperature");
  const [grid, setGrid] = useState<WeatherGrid>(EMPTY_GRID);
  const [conditions, setConditions] = useState<Record<string, CurrentWeather>>({});
  const [status, setStatus] = useState<GridStatus>("loading");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [picked, setPicked] = useState<City | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Keep the map centred on the city chosen elsewhere in the app.
  const lastSelected = useRef(selectedCity.id);
  useEffect(() => {
    if (lastSelected.current === selectedCity.id) return;
    lastSelected.current = selectedCity.id;
    setView({
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
      zoom: 6,
    });
    setPicked(null);
  }, [selectedCity]);

  // Current conditions for the saved cities, used by the map markers.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        cities.map(async (city) => {
          const current = await fetchCurrentOnly(city);
          return [city.id, current] as const;
        })
      );
      if (cancelled) return;

      const next: Record<string, CurrentWeather> = {};
      entries.forEach(([id, current]) => {
        if (current) next[id] = current;
      });
      setConditions(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [cities]);

  // Sample the visible area. The request is debounced so a burst of zoom
  // taps only produces one call.
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    const controller = new AbortController();
    const bounds = boundsForView(view, size, 1.5);

    const timer = setTimeout(() => {
      setStatus("loading");
      fetchWeatherGrid(bounds, MAP_COLUMNS, MAP_ROWS, controller.signal)
        .then((result) => {
          if (controller.signal.aborted) return;
          setGrid(result);
          setLastUpdated(Date.now());
          setStatus(result.points.length > 0 ? "idle" : "offline");
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setStatus("offline");
        });
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [reloadKey, size, view]);

  const zoomBy = useCallback((delta: number) => {
    setView((current) => ({ ...current, zoom: clampZoom(current.zoom + delta) }));
  }, []);

  const recenter = useCallback(() => {
    setView((current) => ({
      latitude: selectedCity.latitude,
      longitude: selectedCity.longitude,
      zoom: Math.max(current.zoom, 6),
    }));
  }, [selectedCity]);

  const handleSelectCity = useCallback((city: City) => {
    setPicked(city);
  }, []);

  const openForecast = useCallback(() => {
    if (!picked) return;
    selectCity(picked);
    setPicked(null);
    router.push("/(tabs)/home");
  }, [picked, router, selectCity]);

  const summary = useMemo(() => layerSummary(layer, grid.points), [grid.points, layer]);
  const activeLayer = LAYERS.find((item) => item.key === layer) ?? LAYERS[0];

  // The selected city always gets a marker, even after it was removed from the
  // saved list. Its freshly loaded bundle is the most accurate reading.
  const markerCities = useMemo(
    () =>
      cities.some((city) => city.id === selectedCity.id) ? cities : [...cities, selectedCity],
    [cities, selectedCity]
  );
  const markerConditions = useMemo(
    () => (bundle ? { ...conditions, [bundle.city.id]: bundle.current } : conditions),
    [bundle, conditions]
  );

  const pickedCurrent = picked ? markerConditions[picked.id] : undefined;
  const pickedDescriptor = describeWeather(pickedCurrent?.weatherCode);

  const noRain = layer === "rain" && summary !== null && summary.max <= 0.02;
  const showLegend = summary !== null && !noRain;

  const statusLabel =
    status === "loading"
      ? "Updating…"
      : status === "offline"
        ? "Offline data"
        : lastUpdated
          ? `Updated ${formatUpdatedAt(new Date(lastUpdated).toISOString())}`
          : "Live";

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <WeatherMap
        view={view}
        size={size}
        layer={layer}
        points={grid.points}
        cities={markerCities}
        conditions={markerConditions}
        selectedCityId={selectedCity.id}
        onSizeChange={setSize}
        onViewChange={setView}
        onSelectCity={handleSelectCity}
      />

      <View style={[styles.header, { top: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={[styles.headerCard, { backgroundColor: palette.card }]}>
          <View style={[styles.headerIcon, { backgroundColor: palette.blueTint }]}>
            <Ionicons name="map" size={18} color={palette.blue} />
          </View>
          <View style={styles.headerText}>
            <AppText variant="subheading" weight="semibold">
              Weather map
            </AppText>
            <AppText variant="tiny" color={palette.textMuted}>
              Drag to explore
            </AppText>
          </View>
          <IconButton
            name="refresh"
            onPress={() => setReloadKey((key) => key + 1)}
            size={36}
            iconSize={17}
            color={palette.textSoft}
            background={palette.card}
          />
        </View>
      </View>

      <View style={[styles.controls, styles.floating, { top: insets.top + 84 }]}>
        <Pressable
          onPress={() => zoomBy(1)}
          accessibilityRole="button"
          accessibilityLabel={label("Zoom in")}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={20} color={palette.text} />
        </Pressable>
        <View style={[styles.controlDivider, { backgroundColor: palette.border }]} />
        <Pressable
          onPress={() => zoomBy(-1)}
          accessibilityRole="button"
          accessibilityLabel={label("Zoom out")}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
        >
          <Ionicons name="remove" size={20} color={palette.text} />
        </Pressable>
        <View style={[styles.controlDivider, { backgroundColor: palette.border }]} />
        <Pressable
          onPress={recenter}
          accessibilityRole="button"
          accessibilityLabel={label("Recenter on selected city")}
          style={({ pressed }) => [styles.controlButton, pressed && styles.pressed]}
        >
          <Ionicons name="locate-outline" size={18} color={palette.blue} />
        </Pressable>
      </View>

      <View
        style={[styles.dock, { bottom: insets.bottom + 104 }]}
        pointerEvents="box-none"
      >
        {picked ? (
          <View style={[styles.cityCard, { backgroundColor: palette.card }]}>
            <View style={styles.cityRow}>
              <WeatherIcon
                kind={pickedDescriptor.kind}
                size={38}
                isDay={pickedCurrent?.isDay ?? true}
              />
              <View style={styles.cityText}>
                <AppText variant="subheading" weight="semibold" numberOfLines={1}>
                  {picked.name}
                </AppText>
                <AppText variant="tiny" color={palette.textMuted} numberOfLines={1}>
                  {pickedCurrent ? `${pickedDescriptor.label} · ${picked.country}` : picked.country}
                </AppText>
              </View>
              <AppText variant="heading" weight="bold">
                {pickedCurrent ? formatTemperature(pickedCurrent.temperature, settings.temperatureUnit) : "--°"}
              </AppText>
              <Pressable
                onPress={() => setPicked(null)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={label("Close city details")}
                style={styles.cityClose}
              >
                <Ionicons name="close" size={18} color={palette.textMuted} />
              </Pressable>
            </View>

            <View style={styles.cityMeta}>
              <Meta
                label="Feels like"
                value={
                  pickedCurrent
                    ? formatTemperature(pickedCurrent.apparentTemperature, settings.temperatureUnit)
                    : "--"
                }
              />
              <Meta
                label="Wind"
                value={pickedCurrent ? formatSpeed(pickedCurrent.windSpeed, settings.speedUnit) : "--"}
              />
              <Meta
                label="Humidity"
                value={pickedCurrent ? `${Math.round(pickedCurrent.humidity)}%` : "--"}
              />
            </View>

            <Pressable
              onPress={openForecast}
              accessibilityRole="button"
              style={({ pressed }) => [styles.viewButton, pressed && styles.pressed]}
            >
              <Ionicons name="arrow-forward" size={16} color={colors.white} />
              <AppText variant="small" weight="semibold" color={colors.white}>
                View forecast
              </AppText>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={[styles.legendCard, { backgroundColor: palette.card }]}>
              <View style={styles.legendHeader}>
                <AppText variant="small" weight="semibold">
                  {activeLayer.label}
                </AppText>
                <AppText variant="tiny" color={palette.textMuted}>
                  {statusLabel}
                </AppText>
              </View>

              {showLegend && summary ? (
                <>
                  <LinearGradient
                    colors={summary.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.legendBar}
                  />
                  <View style={styles.legendLabels}>
                    <AppText variant="tiny" weight="semibold" color={palette.textSoft}>
                      {formatLayerValue(
                        layer,
                        summary.min,
                        settings.temperatureUnit,
                        settings.speedUnit
                      )}
                    </AppText>
                    <AppText variant="tiny" weight="semibold" color={palette.textSoft}>
                      {formatLayerValue(
                        layer,
                        summary.max,
                        settings.temperatureUnit,
                        settings.speedUnit
                      )}
                    </AppText>
                  </View>
                </>
              ) : (
                <AppText variant="tiny" color={palette.textMuted} style={styles.legendNote}>
                  {noRain
                    ? "No rain around here right now"
                    : status === "offline"
                      ? "Map data is unavailable offline"
                      : "Loading map data…"}
                </AppText>
              )}

              {layer === "wind" && showLegend ? (
                <AppText variant="tiny" color={palette.textMuted} style={styles.legendNote}>
                  Arrows show the wind direction, colour shows its speed
                </AppText>
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chips}
            >
              {LAYERS.map((item) => (
                <Chip
                  key={item.key}
                  label={item.label}
                  icon={item.icon}
                  selected={layer === item.key}
                  onPress={() => setLayer(item.key)}
                />
              ))}
            </ScrollView>
          </>
        )}
      </View>

      <View
        style={[styles.attribution, { bottom: insets.bottom + 82 }]}
        pointerEvents="none"
      >
        <View style={[styles.attributionPill, { backgroundColor: palette.card }]}>
          <AppText variant="tiny" color={palette.textMuted}>
            © OpenStreetMap contributors © CARTO
          </AppText>
        </View>
      </View>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const palette = useAppColors();
  return (
    <View style={styles.meta}>
      <AppText variant="tiny" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="small" weight="semibold" style={styles.metaValue}>
        {value}
      </AppText>
    </View>
  );
}

function formatLayerValue(
  layer: MapLayer,
  value: number,
  unit: TemperatureUnit,
  speedUnit: SpeedUnit
): string {
  switch (layer) {
    case "temperature":
      return `${convertTemperature(value, unit)}°`;
    case "rain":
      return `${value.toFixed(1)} mm`;
    case "clouds":
      return `${Math.round(value)}%`;
    default:
      return `${convertSpeed(value, speedUnit)} ${speedUnit === "mph" ? "mph" : "km/h"}`;
  }
}

function formatSpeed(value: number, unit: SpeedUnit): string {
  return `${convertSpeed(value, unit)} ${unit === "mph" ? "mph" : "km/h"}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  floating: {
    position: "absolute",
    ...shadow.card,
  },
  header: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm + 2,
    paddingRight: spacing.sm,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  controls: {
    right: spacing.lg,
    borderRadius: radius.lg,
    paddingVertical: spacing.xs,
    alignItems: "center",
    zIndex: 3,
  },
  controlButton: {
    width: 40,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  controlDivider: {
    width: 22,
    height: StyleSheet.hairlineWidth,
  },
  dock: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
  },
  legendCard: {
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...shadow.card,
  },
  legendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  legendBar: {
    height: 8,
    borderRadius: radius.pill,
    marginTop: spacing.sm + 2,
  },
  legendLabels: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  legendNote: {
    marginTop: spacing.sm,
  },
  chips: {
    paddingTop: spacing.sm + 2,
    paddingRight: spacing.lg,
  },
  cityCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  cityText: {
    flex: 1,
  },
  cityClose: {
    marginLeft: spacing.sm,
    alignSelf: "flex-start",
  },
  cityMeta: {
    flexDirection: "row",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  meta: {
    flex: 1,
  },
  metaValue: {
    marginTop: 2,
  },
  viewButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    marginTop: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.blue,
  },
  attribution: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  attributionPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: radius.pill,
    opacity: 0.9,
  },
  pressed: {
    opacity: 0.7,
  },
});
