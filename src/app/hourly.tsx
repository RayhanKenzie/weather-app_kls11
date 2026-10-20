import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HourlyStrip } from "@/components/HourlyStrip";
import { AppText, ScreenHeader } from "@/components/ui";
import { WeatherIcon } from "@/components/WeatherIcon";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { formatDate, formatHour, formatTemperature } from "@/lib/format";
import { useCities } from "@/providers/CitiesProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { useWeather } from "@/providers/WeatherProvider";
import { describeWeather } from "@/lib/wmo";

/**
 * 03 — Hourly forecast. The next 24 hours for the selected city.
 */
export default function HourlyForecastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCities();
  const { settings } = useSettings();
  const { bundle } = useWeather();
  const unit = settings.temperatureUnit;

  const hours = bundle?.hourly ?? [];
  const first = hours[0];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Hourly forecast"
        onBack={() => router.back()}
        style={{ paddingTop: insets.top + spacing.sm }}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headingRow}>
          <View>
            <AppText variant="title">{selectedCity.name}</AppText>
            <AppText variant="small" color={colors.textMuted}>
              {first ? formatDate(first.time) : "Today"}
            </AppText>
          </View>
          <View style={styles.badge}>
            <AppText variant="tiny" weight="semibold" color={colors.blue}>
              NEXT 24H
            </AppText>
          </View>
        </View>

        <View style={styles.stripCard}>
          <HourlyStrip hours={hours.slice(0, 12)} unit={unit} />
        </View>

        <View style={styles.listCard}>
          {hours.map((hour, index) => {
            const descriptor = describeWeather(hour.weatherCode);
            return (
              <View
                key={hour.time}
                style={[styles.row, index !== hours.length - 1 && styles.rowBorder]}
              >
                <AppText variant="subheading" weight="semibold" style={styles.time}>
                  {index === 0 ? "Now" : formatHour(hour.time)}
                </AppText>

                <View style={styles.icon}>
                  <WeatherIcon kind={descriptor.kind} size={24} isDay={hour.isDay} />
                </View>

                <AppText variant="body" color={colors.textSoft} style={styles.condition}>
                  {descriptor.short}
                </AppText>

                {hour.precipitationProbability > 0 ? (
                  <View style={styles.precipitation}>
                    <AppText variant="tiny" weight="semibold" color={colors.rain}>
                      {hour.precipitationProbability}%
                    </AppText>
                  </View>
                ) : (
                  <View style={styles.precipitation} />
                )}

                <AppText variant="subheading" weight="bold" style={styles.temperature}>
                  {formatTemperature(hour.temperature, unit)}
                </AppText>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <AppText variant="small" color={colors.textSoft}>
            Sunrise {bundle?.current.sunrise ?? "--:--"} · Sunset {bundle?.current.sunset ?? "--:--"}
          </AppText>
          <AppText variant="tiny" color={colors.textMuted} style={styles.updated}>
            {bundle?.offline
              ? "Offline forecast data"
              : `Updated ${bundle ? new Date(bundle.fetchedAt).toLocaleTimeString() : ""}`}
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  stripCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.sm,
    ...shadow.soft,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginTop: spacing.lg,
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
  time: {
    width: 62,
  },
  icon: {
    width: 40,
    alignItems: "center",
  },
  condition: {
    flex: 1,
  },
  precipitation: {
    width: 42,
    alignItems: "flex-end",
  },
  temperature: {
    width: 44,
    textAlign: "right",
  },
  summary: {
    marginTop: spacing.lg,
    alignItems: "center",
    gap: 4,
  },
  updated: {
    textAlign: "center",
  },
});
