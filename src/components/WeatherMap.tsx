import { Image } from "expo-image";
import { memo, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import {
  Animated,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Svg, { Circle, Defs, G, Line, Path, RadialGradient, Stop } from "react-native-svg";

import { RainStreaks, WindParticles, type FlowCell } from "@/components/MapParticles";
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
  const particleColor =
    settings.appearance === "dark" ? "rgba(255, 255, 255, 0.92)" : "rgba(31, 111, 203, 0.62)";
  const rainColor =
    settings.appearance === "dark" ? "rgba(196, 226, 255, 0.95)" : "rgba(47, 138, 229, 0.6)";

  const translation = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const cloudPhase = useRef(new Animated.Value(0)).current;
  const rainPhase = useRef(new Animated.Value(0)).current;
  const temperaturePhase = useRef(new Animated.Value(0)).current;
  const windPhase = useRef(new Animated.Value(0)).current;
  const viewRef = useRef(view);
  const sizeRef = useRef(size);
  const onViewChangeRef = useRef(onViewChange);

  // Slow ambient loops make the layer feel alive without new weather data.
  // Transform/opacity only, so the native driver can run them off the JS thread.
  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";
    const pingPong = (value: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(value, { toValue: 1, duration, useNativeDriver }),
          Animated.timing(value, { toValue: 0, duration, useNativeDriver }),
        ])
      );

    const loops = [
      pingPong(cloudPhase, 16000),
      pingPong(rainPhase, 4500),
      pingPong(temperaturePhase, 5200),
      pingPong(windPhase, 4500),
    ];
    loops.forEach((loop) => loop.start());

    return () => loops.forEach((loop) => loop.stop());
  }, [cloudPhase, rainPhase, temperaturePhase, windPhase]);

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

  const tiles = useMemo(() => tilesForView(view, size), [size, view]);

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

  // Screen-space wind cells drive both the arrows and the particle streams.
  const flowCells = useMemo<FlowCell[]>(
    () =>
      (overlay?.visible ?? []).map(({ x, y, point }) => {
        const bearing = ((point.windDirection + 180) * Math.PI) / 180;
        return {
          x,
          y,
          dx: Math.sin(bearing),
          dy: -Math.cos(bearing),
          speed: point.windSpeed,
          rain: point.precipitation,
        };
      }),
    [overlay]
  );

  // Prevailing direction the wind arrows point to, used to drift the whole
  // arrow field a few pixels so the layer visibly flows.
  const windVector = useMemo(() => {
    let x = 0;
    let y = 0;
    for (const cell of flowCells) {
      x += cell.dx;
      y += cell.dy;
    }
    const length = Math.hypot(x, y);
    if (length < 0.0001) return { x: 1, y: 0 };
    return { x: x / length, y: y / length };
  }, [flowCells]);

  const layerAnimation = useMemo(() => {
    const temperatureOpacity = temperaturePhase.interpolate({
      inputRange: [0, 1],
      outputRange: [0.86, 1],
    });
    const rainOpacity = rainPhase.interpolate({
      inputRange: [0, 1],
      outputRange: [0.9, 1],
    });
    const windOpacity = windPhase.interpolate({
      inputRange: [0, 1],
      outputRange: [0.72, 1],
    });

    switch (layer) {
      case "temperature":
        return { opacity: temperatureOpacity };
      case "clouds":
        return {
          transform: [
            {
              translateX: cloudPhase.interpolate({
                inputRange: [0, 1],
                outputRange: [-22, 22],
              }),
            },
          ],
        };
      case "rain":
        return {
          opacity: rainOpacity,
          transform: [
            {
              translateY: rainPhase.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 22],
              }),
            },
            {
              translateX: rainPhase.interpolate({
                inputRange: [0, 1],
                outputRange: [4, -6],
              }),
            },
          ],
        };
      default:
        return {
          opacity: windOpacity,
          transform: [
            {
              translateX: windPhase.interpolate({
                inputRange: [0, 1],
                outputRange: [-windVector.x * 9, windVector.x * 9],
              }),
            },
            {
              translateY: windPhase.interpolate({
                inputRange: [0, 1],
                outputRange: [-windVector.y * 9, windVector.y * 9],
              }),
            },
          ],
        };
    }
  }, [
    cloudPhase,
    layer,
    rainPhase,
    temperaturePhase,
    windPhase,
    windVector.x,
    windVector.y,
  ]);

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

        {settings.appearance === "dark" ? (
          <View style={styles.darkScrim} pointerEvents="none" />
        ) : null}

        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, layerAnimation]}
        >
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
                const transform = `translate(${entry.x} ${entry.y}) rotate(${entry.point.windDirection + 90})`;
                const arrow = `M ${length / 2} 0 L ${length / 2 - 6} -4 M ${length / 2} 0 L ${length / 2 - 6} 4`;
                return (
                  <G key={`wind-${index}`} transform={transform} opacity={0.82}>
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
        </Animated.View>

        {layer === "wind" ? (
          <WindParticles cells={flowCells} size={size} color={particleColor} />
        ) : null}
        {layer === "rain" ? (
          <RainStreaks cells={flowCells} size={size} color={rainColor} />
        ) : null}

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
  darkScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(9, 15, 26, 0.56)",
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
