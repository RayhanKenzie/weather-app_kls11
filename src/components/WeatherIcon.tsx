import { memo, useId } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

import { colors } from "@/constants/theme";
import type { WeatherKind } from "@/lib/wmo";

const CLOUD_PATH =
  "M25 47C16.5 47 10 41.6 10 34.2c0-6.3 4.6-11.6 10.6-12.6C22.6 13.8 29.2 8 37 8c9.1 0 16.5 7 17.1 15.9C59 25.7 63 29.9 63 34.9 63 41.7 57.6 47 50.6 47H25Z";

/** The soft white/blue cloud used across the illustrations. */
function CloudShape({ size, fill }: { size: number; fill?: string }) {
  return (
    <Path
      d={CLOUD_PATH}
      fill={fill ?? colors.cloud}
      transform={`scale(${size / 64})`}
    />
  );
}

function SunShape({ size, cx = 32, cy = 32, r = 11 }: { size: number; cx?: number; cy?: number; r?: number }) {
  const scale = size / 64;
  const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
    const rad = (angle * Math.PI) / 180;
    const inner = r + 4;
    const outer = r + 8.5;
    return {
      x1: cx + Math.cos(rad) * inner,
      y1: cy + Math.sin(rad) * inner,
      x2: cx + Math.cos(rad) * outer,
      y2: cy + Math.sin(rad) * outer,
    };
  });

  return (
    <G transform={`scale(${scale})`}>
      {rays.map((ray, index) => (
        <Line
          key={index}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={colors.sun}
          strokeWidth={3.2}
          strokeLinecap="round"
        />
      ))}
      <Circle cx={cx} cy={cy} r={r} fill={colors.sun} />
    </G>
  );
}

function MoonShape({ size, cx = 32, cy = 32 }: { size: number; cx?: number; cy?: number }) {
  const scale = size / 64;
  return (
    <G transform={`scale(${scale})`}>
      <Path
        d={`M${cx + 8} ${cy - 12}a15 15 0 1 0 8 22 17 17 0 0 1-8-22Z`}
        fill={colors.sun}
      />
    </G>
  );
}

function RainDrops({ size, count = 3 }: { size: number; count?: number }) {
  const scale = size / 64;
  const xs = count === 2 ? [24, 38] : [18, 32, 46];
  return (
    <G transform={`scale(${scale})`}>
      {xs.map((x, index) => (
        <Path
          key={index}
          d={`M${x + 4} 50c0 3.4-2.2 6-4 6s-4-2.6-4-6c0-2.3 4-6.6 4-6.6s4 4.3 4 6.6Z`}
          fill={colors.rain}
        />
      ))}
    </G>
  );
}

function SnowFlakes({ size }: { size: number }) {
  const scale = size / 64;
  return (
    <G transform={`scale(${scale})`}>
      {[20, 32, 44].map((x, index) => (
        <G key={index} origin={`${x}, 54`}>
          <Line x1={x - 4} y1={54} x2={x + 4} y2={54} stroke={colors.rain} strokeWidth={2.4} strokeLinecap="round" />
          <Line x1={x} y1={50} x2={x} y2={58} stroke={colors.rain} strokeWidth={2.4} strokeLinecap="round" />
        </G>
      ))}
    </G>
  );
}

function Lightning({ size }: { size: number }) {
  const scale = size / 64;
  return (
    <G transform={`scale(${scale})`}>
      <Path d="M34 46l-9 13h7l-3 9 12-15h-7l4-7z" fill={colors.storm} />
    </G>
  );
}

function FogLines({ size }: { size: number }) {
  const scale = size / 64;
  return (
    <G transform={`scale(${scale})`}>
      {[0, 1, 2].map((index) => (
        <Line
          key={index}
          x1={16 + index * 3}
          y1={50 + index * 5}
          x2={54 - index * 4}
          y2={50 + index * 5}
          stroke={colors.cloudDeep}
          strokeWidth={3.4}
          strokeLinecap="round"
        />
      ))}
    </G>
  );
}

/**
 * Weather icon rendered with SVG so it stays crisp at every size and can be
 * tinted to match each screen.
 */
export const WeatherIcon = memo(function WeatherIcon({
  kind,
  size = 32,
  isDay = true,
}: {
  kind: WeatherKind;
  size?: number;
  isDay?: boolean;
}) {
  const sun = isDay ? <SunShape size={size} cx={26} cy={26} r={10} /> : <MoonShape size={size} cx={26} cy={26} />;

  switch (kind) {
    case "clear":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          {isDay ? (
            <SunShape size={size} cx={32} cy={32} r={13} />
          ) : (
            <MoonShape size={size} cx={32} cy={30} />
          )}
        </Svg>
      );
    case "mostly-clear":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          {sun}
          <G transform="translate(6 10) scale(0.62)">
            <CloudShape size={64} fill={colors.cloud} />
          </G>
        </Svg>
      );
    case "partly-cloudy":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          {sun}
          <G transform="translate(8 12) scale(0.66)">
            <CloudShape size={64} fill={colors.cloud} />
          </G>
        </Svg>
      );
    case "cloudy":
    case "overcast":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -4)">
            <CloudShape size={64} fill={colors.cloudMid} />
          </G>
          <G transform="translate(8 6) scale(0.66)">
            <CloudShape size={64} fill={colors.cloud} />
          </G>
        </Svg>
      );
    case "fog":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -10)">
            <CloudShape size={64} fill={colors.cloudMid} />
          </G>
          <FogLines size={size} />
        </Svg>
      );
    case "drizzle":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -8)">
            <CloudShape size={64} fill={colors.cloudMid} />
          </G>
          <RainDrops size={size} count={2} />
        </Svg>
      );
    case "rain":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -8)">
            <CloudShape size={64} fill={colors.cloudMid} />
          </G>
          <RainDrops size={size} />
        </Svg>
      );
    case "heavy-rain":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -8)">
            <CloudShape size={64} fill={colors.cloudDeep} />
          </G>
          <RainDrops size={size} />
        </Svg>
      );
    case "snow":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -8)">
            <CloudShape size={64} fill={colors.cloudMid} />
          </G>
          <SnowFlakes size={size} />
        </Svg>
      );
    case "thunder":
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <G transform="translate(0 -8)">
            <CloudShape size={64} fill={colors.cloudDeep} />
          </G>
          <Lightning size={size} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 64 64">
          <CloudShape size={size} fill={colors.cloud} />
        </Svg>
      );
  }
});

/**
 * Soft radial glow used behind the splash illustration and the home hero.
 */
export const AmbientGlow = memo(function AmbientGlow({
  size = 240,
  opacity = 0.22,
}: {
  size?: number;
  opacity?: number;
}) {
  const glowId = `ambient-${useId().replace(/:/g, "")}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={colors.white} stopOpacity={opacity} />
          <Stop offset="0.65" stopColor={colors.white} stopOpacity={opacity * 0.35} />
          <Stop offset="1" stopColor={colors.white} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={50} cy={50} r={50} fill={`url(#${glowId})`} />
    </Svg>
  );
});

/**
 * Large hero illustration: sun peeking behind a cloud, matching the artwork
 * used on the splash and home hero.
 */
export const WeatherHero = memo(function WeatherHero({
  size = 120,
  isDay = true,
}: {
  size?: number;
  isDay?: boolean;
}) {
  // Gradient ids have to be unique per instance, otherwise the browser
  // resolves `url(#id)` against the first matching element in the document.
  const id = useId().replace(/:/g, "");
  const sunId = `sun-${id}`;
  const cloudId = `cloud-${id}`;
  const height = size * 0.82;
  return (
    <Svg width={size} height={height} viewBox="0 0 96 78">
      <Defs>
        <LinearGradient id={sunId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD866" />
          <Stop offset="1" stopColor={colors.sun} />
        </LinearGradient>
        <LinearGradient id={cloudId} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor={colors.cloud} />
        </LinearGradient>
      </Defs>

      {isDay ? (
        <G>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
            const rad = (angle * Math.PI) / 180;
            const inner = 20;
            const outer = 27;
            return (
              <Line
                key={angle}
                x1={68 + Math.cos(rad) * inner}
                y1={26 + Math.sin(rad) * inner}
                x2={68 + Math.cos(rad) * outer}
                y2={26 + Math.sin(rad) * outer}
                stroke={colors.sun}
                strokeWidth={3.4}
                strokeLinecap="round"
              />
            );
          })}
          <Circle cx={68} cy={26} r={16} fill={`url(#${sunId})`} />
        </G>
      ) : (
        <Path
          d="M76 8a17 17 0 1 0 10 25A19 19 0 0 1 76 8Z"
          fill={colors.sun}
        />
      )}

      <Path
        d="M31 62c-9.6 0-16.5-5.9-16.5-13.7 0-6.9 5-12.4 11.6-13.4C27.6 25.5 34.9 18.8 43.4 18.8c10 0 18.1 8.2 18.8 18.1 5.5 1.9 9.3 6.5 9.3 11.9 0 7.4-5.9 13.2-13.5 13.2H31Z"
        fill={`url(#${cloudId})`}
      />
      <Rect x={12} y={64} width={60} height={2.4} rx={1.2} fill={colors.cloudMid} opacity={0.5} />
    </Svg>
  );
});
