import { memo, useEffect, useMemo, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

import type { MapSize } from "@/lib/mapTiles";

/** One sampled weather cell projected to screen space. */
export interface FlowCell {
  x: number;
  y: number;
  /** Unit vector pointing where the wind blows to. */
  dx: number;
  dy: number;
  /** km/h */
  speed: number;
  /** mm in the last 15 minutes. */
  rain: number;
}

interface ParticleLayerProps {
  cells: FlowCell[];
  size: MapSize;
  color: string;
}

const NATIVE_DRIVER = Platform.OS !== "web";
const WIND_COUNT = 54;
const RAIN_COUNT = 44;

/** Small deterministic PRNG so particles do not jump between renders. */
function createRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFor(size: MapSize, cells: FlowCell[]) {
  let seed = Math.round(size.width * 13 + size.height * 7 + cells.length * 101);
  for (let index = 0; index < Math.min(cells.length, 12); index += 1) {
    seed += Math.round(cells[index].x * 3 + cells[index].y * 5);
  }
  return seed;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface WindParticle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  travel: number;
  duration: number;
  length: number;
  opacity: number;
}

function buildWindParticles(cells: FlowCell[], size: MapSize): WindParticle[] {
  if (cells.length === 0 || size.width === 0 || size.height === 0) return [];

  const random = createRandom(seedFor(size, cells));
  return Array.from({ length: WIND_COUNT }, (_, index) => {
    const cell = cells[Math.floor(random() * cells.length)];
    const speed = Math.max(1, cell.speed);
    return {
      id: index,
      x: clamp(cell.x + (random() - 0.5) * 96, 4, size.width - 4),
      y: clamp(cell.y + (random() - 0.5) * 96, 4, size.height - 4),
      dx: cell.dx,
      dy: cell.dy,
      // Stronger wind travels further and reads faster on screen.
      travel: 30 + Math.min(56, speed * 1.8),
      duration: 2400 + random() * 2400,
      length: 9 + random() * 9,
      opacity: 0.55 + random() * 0.45,
    };
  });
}

interface RainDrop {
  id: number;
  x: number;
  y: number;
  travel: number;
  drift: number;
  duration: number;
  height: number;
  opacity: number;
}

function buildRainDrops(cells: FlowCell[], size: MapSize): RainDrop[] {
  const rainy = cells.filter((cell) => cell.rain > 0.02);
  if (rainy.length === 0 || size.width === 0 || size.height === 0) return [];

  const random = createRandom(seedFor(size, rainy));
  return Array.from({ length: RAIN_COUNT }, (_, index) => {
    const cell = rainy[Math.floor(random() * rainy.length)];
    return {
      id: index,
      x: clamp(cell.x + (random() - 0.5) * 90, 4, size.width - 4),
      y: clamp(cell.y + (random() - 0.5) * 120, 4, size.height - 4),
      travel: 14 + random() * 18,
      drift: -5 + random() * 4,
      duration: 620 + random() * 520,
      height: 7 + random() * 7,
      opacity: 0.5 + random() * 0.4,
    };
  });
}

/** Looping 0→1 driver; each particle gets its own period so they never sync. */
function useLoop(duration: number) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: NATIVE_DRIVER,
      })
    );
    progress.setValue(Math.random() * 0.9);
    loop.start();
    return () => loop.stop();
  }, [duration, progress]);

  return progress;
}

const WindStreak = memo(function WindStreak({
  particle,
  color,
}: {
  particle: WindParticle;
  color: string;
}) {
  const progress = useLoop(particle.duration);

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.dx * particle.travel],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, particle.dy * particle.travel],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.12, 0.8, 1],
    outputRange: [0, particle.opacity, particle.opacity * 0.7, 0],
  });
  const rotation = `${Math.atan2(particle.dy, particle.dx) * (180 / Math.PI)}deg`;

  return (
    <Animated.View
      style={[
        styles.streak,
        {
          left: particle.x,
          top: particle.y,
          width: particle.length,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: rotation }],
        },
      ]}
    />
  );
});

const RainLine = memo(function RainLine({ drop, color }: { drop: RainDrop; color: string }) {
  const progress = useLoop(drop.duration);

  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drop.travel * 0.4, drop.travel],
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, drop.drift],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.15, 0.8, 1],
    outputRange: [0, drop.opacity, drop.opacity * 0.6, 0],
  });

  return (
    <Animated.View
      style={[
        styles.rainLine,
        {
          left: drop.x,
          top: drop.y,
          height: drop.height,
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { rotate: "-12deg" }],
        },
      ]}
    />
  );
});

/**
 * Windy-style particles for the map. Wind streaks flow along the sampled wind
 * vector; rain lines fall inside cells that actually report precipitation.
 * Everything animates transform/opacity only, so the native driver can run it.
 */
export const WindParticles = memo(function WindParticles({
  cells,
  size,
  color,
}: ParticleLayerProps) {
  const particles = useMemo(() => buildWindParticles(cells, size), [cells, size]);
  if (particles.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID="map-wind-particles">
      {particles.map((particle) => (
        <WindStreak key={particle.id} particle={particle} color={color} />
      ))}
    </View>
  );
});

export const RainStreaks = memo(function RainStreaks({
  cells,
  size,
  color,
}: ParticleLayerProps) {
  const drops = useMemo(() => buildRainDrops(cells, size), [cells, size]);
  if (drops.length === 0) return null;

  return (
    <View pointerEvents="none" style={styles.layer} testID="map-rain-streaks">
      {drops.map((drop) => (
        <RainLine key={drop.id} drop={drop} color={color} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  streak: {
    position: "absolute",
    height: 2,
    borderRadius: 2,
  },
  rainLine: {
    position: "absolute",
    width: 1.5,
    borderRadius: 2,
  },
});
