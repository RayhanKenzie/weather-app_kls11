import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TemperatureChart } from "@/components/TemperatureChart";
import { AppText } from "@/components/ui";
import { WeatherHero, WeatherIcon } from "@/components/WeatherIcon";
import { skyGradient } from "@/constants/sky";
import { colors, gradients, radius, shadow, spacing } from "@/constants/theme";
import {
  formatHourLabel,
  formatTemperature,
  humidityLabel,
  precipitationLabel,
  pressureLabel,
  uvLabel,
  visibilityLabel,
  windDirection,
  windLabel,
} from "@/lib/format";
import { useCities } from "@/providers/CitiesProvider";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";
import { useWeather } from "@/providers/WeatherProvider";
import { describeWeather } from "@/lib/wmo";

/**
 * 06 — Weather details: the metrics table and the hourly temperature chart.
 */
export default function WeatherDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { selectedCity } = useCities();
  const { settings } = useSettings();
  const palette = useAppColors();
  const { bundle } = useWeather();
  const unit = settings.temperatureUnit;

  const current = bundle?.current;
  const descriptor = describeWeather(current?.weatherCode);
  const sky = current ? skyGradient(descriptor.kind, current.isDay) : gradients.hero;

  const chartPoints = useMemo(
    () =>
      (bundle?.hourly ?? []).slice(0, 12).map((hour, index) => ({
        label: formatHourLabel(hour.time, index),
        value: Math.round(unit === "f" ? (hour.temperature * 9) / 5 + 32 : hour.temperature),
      })),
    [bundle?.hourly, unit]
  );

  const rows = [
    {
      icon: "sunny-outline" as const,
      title: "UV Index",
      value: current ? `${Math.round(current.uvIndex)}` : "--",
      description: current ? uvLabel(current.uvIndex) : "--",
      color: colors.sun,
    },
    {
      icon: "water-outline" as const,
      title: "Humidity",
      value: current ? `${Math.round(current.humidity)}%` : "--",
      description: current ? humidityLabel(current.humidity) : "--",
      color: colors.rain,
    },
    {
      icon: "navigate-outline" as const,
      title: "Wind Speed",
      value: current ? `${Math.round(current.windSpeed)} km/h` : "--",
      description: current
        ? `${windLabel(current.windSpeed)} · ${windDirection(current.windDirection)}`
        : "--",
      color: colors.blue,
    },
    {
      icon: "eye-outline" as const,
      title: "Visibility",
      value: current ? `${current.visibility.toFixed(1)} km` : "--",
      description: current ? visibilityLabel(current.visibility) : "--",
      color: colors.cloudDeep,
    },
    {
      icon: "rainy-outline" as const,
      title: "Precipitation",
      value: current ? `${current.precipitation.toFixed(1)} mm` : "--",
      description: current ? precipitationLabel(current.precipitation) : "--",
      color: colors.rain,
    },
    {
      icon: "speedometer-outline" as const,
      title: "Pressure",
      value: current ? `${Math.round(current.pressure)} hPa` : "--",
      description: current ? pressureLabel(current.pressure) : "--",
      color: colors.storm,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={sky} style={styles.hero}>
          <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
            <Pressable
              style={styles.locationButton}
              onPress={() => router.back()}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={18} color={colors.white} />
              <AppText variant="subheading" weight="semibold" color={colors.white}>
                {selectedCity.name}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => router.push("/(tabs)/search")}
              accessibilityRole="button"
              accessibilityLabel="Change city"
              style={styles.addButton}
            >
              <Ionicons name="add" size={20} color={colors.white} />
            </Pressable>
          </View>

          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <AppText variant="display" weight="extraLight" color={colors.white}>
                {current ? formatTemperature(current.temperature, unit) : "--°"}
              </AppText>
              <AppText variant="subheading" color="rgba(255,255,255,0.95)">
                {current ? descriptor.label : "Loading"}
              </AppText>
              {bundle?.daily[0] ? (
                <AppText variant="small" color="rgba(255,255,255,0.8)" style={styles.range}>
                  {formatTemperature(bundle.daily[0].maxTemperature, unit)} /{" "}
                  {formatTemperature(bundle.daily[0].minTemperature, unit)}
                </AppText>
              ) : null}
            </View>
            {current ? (
              <WeatherIcon kind={descriptor.kind} size={116} isDay={current.isDay} />
            ) : (
              <WeatherHero size={116} />
            )}
          </View>
        </LinearGradient>

        <View style={styles.sheet}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />

          <AppText variant="heading" style={styles.sectionTitle}>
            Details
          </AppText>

          <View style={[styles.tableCard, { backgroundColor: palette.card }]}>
            {rows.map((row, index) => (
              <View key={row.title} style={[styles.row, index !== rows.length - 1 && [styles.rowBorder, { borderBottomColor: palette.border }]]}>
                <View style={[styles.rowIcon, { backgroundColor: `${row.color}1F` }]}>
                  <Ionicons name={row.icon} size={17} color={row.color} />
                </View>
                <View style={styles.rowText}>
                  <AppText variant="subheading" weight="semibold">
                    {row.title}
                  </AppText>
                  <AppText variant="tiny" color={colors.textMuted}>
                    {row.description}
                  </AppText>
                </View>
                <AppText variant="subheading" weight="bold">
                  {row.value}
                </AppText>
              </View>
            ))}
          </View>

          <View style={[styles.chartCard, { backgroundColor: palette.card }]}>
            <View style={styles.chartHeader}>
              <AppText variant="heading">Hourly forecast</AppText>
              <AppText variant="tiny" color={colors.textMuted}>
                next 12 hours
              </AppText>
            </View>
            {chartPoints.length > 1 ? (
              <TemperatureChart points={chartPoints} width={width - spacing.lg * 2 - spacing.lg * 2} />
            ) : null}
          </View>

          <View style={[styles.chartCard, { backgroundColor: palette.card }]}>
            <AppText variant="heading">Sun schedule</AppText>
            <View style={styles.sunRow}>
              <SunFact label="Sunrise" value={current?.sunrise ?? "--:--"} icon="sunny-outline" />
              <SunFact label="Sunset" value={current?.sunset ?? "--:--"} icon="moon-outline" />
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SunFact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={styles.sunFact}>
      <View style={styles.sunIcon}>
        <Ionicons name={icon} size={18} color={colors.sun} />
      </View>
      <AppText variant="tiny" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="subheading" weight="bold">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  hero: {
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  heroText: {
    flex: 1,
  },
  range: {
    marginTop: 2,
  },
  sheet: {
    marginTop: -spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  tableCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.soft,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadow.soft,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  sunRow: {
    flexDirection: "row",
    marginTop: spacing.md,
  },
  sunFact: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  sunIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF6E0",
    marginBottom: 2,
  },
});
