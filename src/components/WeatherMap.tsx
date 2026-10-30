import { Image } from "expo-image";
import { memo, useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";

import { AppText } from "@/components/ui";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { formatTemperature } from "@/lib/format";
import {
  panCenter,
  screenPoint,
  TILE_SIZE,
  tilesForView,
  type MapSize,
  type MapViewState,
} from "@/lib/mapTiles";
import type { City, CurrentWeather } from "@/lib/types";
import {
  layerColor,
  layerOpacity,
  type MapLayer,
  type MapWeatherPoint,
} from "@/lib/weatherMap";
import { useSettings } from "@/providers/SettingsProvider";

interface WeatherMapProps {
  view: MapViewState;
  size: MapSize;
  layer: MapLayer;
  points: MapWeatherPoint[];
  cities: City[];
  conditions: Record<string, CurrentWeather>;
  selectedCityId: string;
  onSizeChange: (size: MapSize) => void;
  onViewChange: (view: MapViewState) => void;
  onSelectCity: (city: City) => void;
}

/**
 * Raster basemap + weather overlay. Panning is handled with the core
 * `PanResponder` so the same gesture works on iOS, Android and web without a
 * native map module.
 */
export const WeatherMap = memo(function WeatherMap({
  view,
  size,
  layer,
  points,
  cities,
  conditions,
  selectedCityId,
  onSizeChange,
  onViewChange,
  onSelectCity,
}: WeatherMapProps) {
  const { settings, colors: palette } = useSettings();
  const unit = settings.temperatureUnit;
  const gradientId = `wmap-${useId().replace(/:/g, "")}`;

  const translation = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const onViewChangeRef = useRef(onViewChange);

  useLayoutEffect(() => {
    viewRef.current = view;
    sizeRef.current = size;
    onViewChangeRef.current = onViewChange;
  }, [onViewChange, size, view]);

  // New tiles render at the committed centre; clearing the drag offset in the
  // same commit keeps the map from jumping back for a frame.
  useLayoutEffect(() => {
    translation.setValue({ x: 0, y: 0 });
  }, [translation, view.latitude, view.longitude, view.zoom]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4,
        onPanResponderGrant: () => {
          translation.stopAnimation();
        },
        onPanResponderMove: (_event, gesture) => {
          translation.setValue({ x: gesture.dx, y: gesture.dy });
        },
        onPanResponderRelease: (_event, gesture) => {
          const dx = gesture.dx;
          const dy = gesture.dy;
          if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
            translation.setValue({ x: 0, y: 0 });
            return;
          }

          const next = panCenter(viewRef.current, sizeRef.current, dx, dy);
          const current = viewRef.current;
          if (next.latitude === current.latitude && next.longitude === current.longitude) {
            translation.setValue({ x: 0, y: 0 });
            return;
          }
          onViewChangeRef.current(next);
        },
        onPanResponderTerminate: () => {
          translation.setValue({ x: 0, y: 0 });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [translation]
  );

  const tiles = useMemo(
    () => tilesForView(view, size, settings.appearance === "dark" ? "dark" : "light"),
    [settings.appearance, size, view]
  );

  const overlay = useMemo(() => {
    if (points.length === 0 || size.width === 0 || size.height === 0) return null;

    const positions = points.map((point) => ({
      point,
      ...screenPoint(point, view, size),
    }));

    // Estimate the grid spacing from the nearest neighbours so blob sizes
    // follow the zoom level without extra bookkeeping.
    let nearest = Infinity;
    const sample = positions.slice(0, Math.min(12, positions.length));
    for (const a of sample) {
      for (const b of positions) {
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 2 && distance < nearest) nearest = distance;
      }
    }
    const radius = Number.isFinite(nearest) ? nearest * 1.28 : 90;

    const visible = positions.filter(
      (position) =>
        position.x > -radius &&
        position.x < size.width + radius &&
        position.y > -radius &&
        position.y < size.height + radius
    );

    return { radius, visible };
  }, [points, size, view]);

  const markers = useMemo(() => {
    if (size.width === 0 || size.height === 0) return [];
    return cities
      .map((city) => ({
        city,
        current: conditions[city.id],
        position: screenPoint(city, view, size),
      }))
      .filter(
        ({ position }) =>
          position.x > -90 &&
          position.x < size.width + 90 &&
          position.y > -40 &&
          position.y < size.height + 80
      );
  }, [cities, conditions, size, view]);

  const shaped =
    layer === "wind"
      ? []
      : (overlay?.visible ?? []).map((entry) => ({
          ...entry,
          color: layerColor(layer, entry.point),
          opacity: layerOpacity(layer, entry.point),
        })).filter((entry) => entry.opacity > 0);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (Math.abs(width - size.width) > 0.5 || Math.abs(height - size.height) > 0.5) {
      onSizeChange({ width, height });
    }
  };

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: translation.getTranslateTransform() }]}
      >
        {tiles.map((tile) => (
          <Image
            key={tile.key}
            source={tile.uri}
            contentFit="fill"
            cachePolicy="memory-disk"
            transition={120}
            pointerEvents="none"
            accessibilityIgnoresInvertColors
            style={[styles.tile, { left: tile.left, top: tile.top }]}
          />
        ))}

        <Svg
          width={size.width}
          height={size.height}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          {shaped.length > 0 ? (
            <Defs>
              {shaped.map((entry, index) => (
                <RadialGradient key={`${entry.point.latitude}-${index}`} id={`${gradientId}-${index}`}>
                  <Stop offset="0" stopColor={entry.color} stopOpacity={entry.opacity} />
                  <Stop offset="0.55" stopColor={entry.color} stopOpacity={entry.opacity * 0.7} />
                  <Stop offset="1" stopColor={entry.color} stopOpacity={0} />
                </RadialGradient>
              ))}
            </Defs>
          ) : null}

          {layer === "wind"
            ? (overlay?.visible ?? []).map((entry, index) => {
                const length = 12 + Math.min(24, entry.point.windSpeed * 0.55);
                const color = layerColor("wind", entry.point);
                const transform = `translate(${entry.x} ${entry.y}) rotate(${entry.point.windDirection + 180})`;
                const arrow = `M ${length / 2} 0 L ${length / 2 - 6} -4 M ${length / 2} 0 L ${length / 2 - 6} 4`;
                return (
                  <G key={`wind-${index}`} transform={transform} opacity={0.95}>
                    <Line
                      x1={-length / 2}
                      y1={0}
                      x2={length / 2}
                      y2={0}
                      stroke={colors.white}
                      strokeWidth={4}
                      strokeLinecap="round"
                    />
                    <Path
                      d={arrow}
                      stroke={colors.white}
                      strokeWidth={4}
                      strokeLinecap="round"
                      fill="none"
                    />
                    <Line
                      x1={-length / 2}
                      y1={0}
                      x2={length / 2}
                      y2={0}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                    />
                    <Path
                      d={arrow}
                      stroke={color}
                      strokeWidth={2}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </G>
                );
              })
            : shaped.map((entry, index) => (
                <Circle
                  key={`cell-${index}`}
                  cx={entry.x}
                  cy={entry.y}
                  r={overlay?.radius ?? 90}
                  fill={`url(#${gradientId}-${index})`}
                />
              ))}
        </Svg>

        {markers.map(({ city, current, position }) => {
          const active = city.id === selectedCityId;
          return (
            <View
              key={city.id}
              style={[styles.markerWrap, { left: position.x - 80, top: position.y - 38, zIndex: active ? 2 : 1 }]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={() => onSelectCity(city)}
                accessibilityRole="button"
                accessibilityLabel={`${city.name}${current ? `, ${formatTemperature(current.temperature, unit)}` : ""}`}
                style={({ pressed }) => [
                  styles.marker,
                  {
                    backgroundColor: active ? palette.blue : palette.card,
                    borderColor: active ? palette.blue : palette.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  variant="tiny"
                  weight="semibold"
                  numberOfLines={1}
                  color={active ? colors.white : palette.text}
                  style={styles.markerName}
                >
                  {city.name}
                </AppText>
                {current ? (
                  <AppText
                    variant="tiny"
                    weight="bold"
                    color={active ? colors.white : palette.blue}
                  >
                    {formatTemperature(current.temperature, unit)}
                  </AppText>
                ) : null}
              </Pressable>
              <View style={[styles.markerStem, { backgroundColor: active ? palette.blue : palette.card }]} />
              <View
                style={[
                  styles.markerDot,
                  { backgroundColor: palette.card, borderColor: active ? palette.blue : palette.card },
                ]}
              />
            </View>
          );
        })}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
  },
  tile: {
    position: "absolute",
    width: TILE_SIZE + 0.5,
    height: TILE_SIZE + 0.5,
  },
  markerWrap: {
    position: "absolute",
    width: 160,
    alignItems: "center",
  },
  marker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: 156,
    height: 26,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow.card,
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 5,
  },
  markerName: {
    flexShrink: 1,
  },
  markerStem: {
    width: 2,
    height: 8,
  },
  markerDot: {
    width: 9,
    height: 9,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  pressed: {
    opacity: 0.75,
  },
});
