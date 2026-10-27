import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui";
import { WeatherIcon } from "@/components/WeatherIcon";
import { colors, spacing } from "@/constants/theme";
import { formatDayName, formatTemperature } from "@/lib/format";
import type { DailyWeather, TemperatureUnit } from "@/lib/types";
import { describeWeather } from "@/lib/wmo";
import { useSettings } from "@/providers/SettingsProvider";

export const DailyRow = memo(function DailyRow({
  day,
  index,
  unit,
  onPress,
  showDescription = true,
}: {
  day: DailyWeather;
  index: number;
  unit: TemperatureUnit;
  onPress?: () => void;
  showDescription?: boolean;
}) {
  const { settings } = useSettings();
  const descriptor = describeWeather(day.weatherCode);

  const content = (
    <View style={styles.row}>
      <View style={styles.day}>
        <AppText variant="subheading" weight="semibold" numberOfLines={1}>
          {formatDayName(day.date, index, settings.language)}
        </AppText>
        {showDescription ? (
          <AppText variant="tiny" color={colors.textMuted} style={styles.description}>
            {descriptor.short}
          </AppText>
        ) : null}
      </View>

      <View style={styles.icon}>
        <WeatherIcon kind={descriptor.kind} size={26} />
      </View>

      <View style={styles.temperatures}>
        <AppText variant="body" color={colors.textMuted} style={styles.min}>
          {formatTemperature(day.minTemperature, unit)}
        </AppText>
        <AppText variant="subheading" weight="semibold" style={styles.max}>
          {formatTemperature(day.maxTemperature, unit)}
        </AppText>
      </View>
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      {content}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  day: {
    width: 104,
  },
  description: {
    marginTop: 2,
  },
  icon: {
    width: 44,
    alignItems: "center",
  },
  temperatures: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.lg,
  },
  min: {
    width: 36,
    textAlign: "right",
  },
  max: {
    width: 36,
    textAlign: "right",
  },
});
