import { memo, useId, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { AppText } from "@/components/ui";
import { colors } from "@/constants/theme";

export interface ChartPoint {
  label: string;
  value: number;
}

const PADDING = { top: 16, right: 14, bottom: 22, left: 14 };

/**
 * Smooth line chart used for the hourly temperature curve on the details
 * screen.
 */
export const TemperatureChart = memo(function TemperatureChart({
  points,
  width,
  height = 140,
}: {
  points: ChartPoint[];
  width: number;
  height?: number;
}) {
  const areaId = `chart-${useId().replace(/:/g, "")}`;

  const geometry = useMemo(() => {
    if (points.length === 0) return null;

    const padding = PADDING;
    const values = points.map((point) => point.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = Math.max(1, max - min);

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const coordinates = points.map((point, index) => {
      const x =
        padding.left + (points.length === 1 ? chartWidth / 2 : (index / (points.length - 1)) * chartWidth);
      const y = padding.top + chartHeight - ((point.value - min) / range) * chartHeight;
      return { x, y, ...point };
    });

    // Catmull-Rom style smoothing between the sampled points.
    let line = `M ${coordinates[0].x} ${coordinates[0].y}`;
    for (let i = 0; i < coordinates.length - 1; i++) {
      const current = coordinates[i];
      const next = coordinates[i + 1];
      const midX = (current.x + next.x) / 2;
      line += ` C ${midX} ${current.y}, ${midX} ${next.y}, ${next.x} ${next.y}`;
    }

    const area = `${line} L ${coordinates[coordinates.length - 1].x} ${height - padding.bottom} L ${
      coordinates[0].x
    } ${height - padding.bottom} Z`;

    return { coordinates, line, area, max, min };
  }, [height, points, width]);

  if (!geometry) return null;

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={areaId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.blue} stopOpacity={0.28} />
            <Stop offset="1" stopColor={colors.blue} stopOpacity={0} />
          </LinearGradient>
        </Defs>

        <Path d={geometry.area} fill={`url(#${areaId})`} />
        <Path
          d={geometry.line}
          stroke={colors.blue}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {geometry.coordinates.map((point, index) => (
          <G key={`${point.label}-${index}`}>
            <Circle cx={point.x} cy={point.y} r={5.5} fill={colors.white} />
            <Circle cx={point.x} cy={point.y} r={3.2} fill={colors.blue} />
          </G>
        ))}
      </Svg>

      <View style={styles.labels}>
        {geometry.coordinates.map((point, index) =>
          index % 2 === 0 || index === geometry.coordinates.length - 1 ? (
            <AppText
              key={`${point.label}-label`}
              variant="tiny"
              color={colors.textMuted}
              style={[styles.label, { left: `${(point.x / width) * 100}%` }]}
            >
              {point.label}
            </AppText>
          ) : null
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  labels: {
    height: 16,
    marginTop: -14,
  },
  label: {
    position: "absolute",
    transform: [{ translateX: -14 }],
  },
});
