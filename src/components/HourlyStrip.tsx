import { memo } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui";
import { WeatherIcon } from "@/components/WeatherIcon";
import { colors, radius, spacing } from "@/constants/theme";
import { formatHourLabel, formatTemperature } from "@/lib/format";
import type { HourlyWeather, TemperatureUnit } from "@/lib/types";
import { describeWeather } from "@/lib/wmo";

export const HourlyStrip = memo(function HourlyStrip({
  hours,
  unit,
  onSelect,
}: {
  hours: HourlyWeather[];
  unit: TemperatureUnit;
  onSelect?: (hour: HourlyWeather, index: number) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      {hours.map((hour, index) => {
        const descriptor = describeWeather(hour.weatherCode);
        const item = (
          <View style={styles.item}>
            <AppText variant="small" weight="medium" color={colors.textMuted}>
              {formatHourLabel(hour.time, index)}
            </AppText>
            <View style={styles.icon}>
              <WeatherIcon kind={descriptor.kind} size={28} isDay={hour.isDay} />
            </View>
            <AppText variant="subheading" weight="semibold">
              {formatTemperature(hour.temperature, unit)}
            </AppText>
            {hour.precipitationProbability > 0 ? (
              <AppText variant="tiny" weight="semibold" color={colors.rain}>
                {hour.precipitationProbability}%
              </AppText>
            ) : (
              <View style={styles.placeholder} />
            )}
          </View>
        );

        if (!onSelect) return <View key={hour.time}>{item}</View>;

        return (
          <Pressable
            key={hour.time}
            onPress={() => onSelect(hour, index)}
            accessibilityRole="button"
            accessibilityLabel={`${formatHourLabel(hour.time, index)}, ${formatTemperature(
              hour.temperature,
              unit
            )}, ${descriptor.short}`}
          >
            {item}
          </Pressable>
        );
      })}
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  item: {
    width: 62,
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  icon: {
    marginVertical: 6,
  },
  placeholder: {
    height: 13,
  },
});
