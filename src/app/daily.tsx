import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DailyRow } from "@/components/DailyRow";
import { AppText, ScreenHeader } from "@/components/ui";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { formatTemperature } from "@/lib/format";
import { useCities } from "@/providers/CitiesProvider";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";
import { useWeather } from "@/providers/WeatherProvider";

/**
 * 04 — 7-day forecast.
 */
export default function DailyForecastScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCities();
  const { settings } = useSettings();
  const palette = useAppColors();
  const { bundle } = useWeather();
  const unit = settings.temperatureUnit;

  const days = bundle?.daily ?? [];
  const warmest = days.reduce((max, day) => Math.max(max, day.maxTemperature), 0);
  const coldest = days.reduce((min, day) => Math.min(min, day.minTemperature), 99);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader
        title="7-day forecast"
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
              {selectedCity.country}
            </AppText>
          </View>
        </View>

        <View style={[styles.summaryCard, { backgroundColor: palette.card }]}>
          <Summary label="Highest" value={formatTemperature(warmest, unit)} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Summary label="Lowest" value={formatTemperature(coldest, unit)} />
          <View style={[styles.divider, { backgroundColor: palette.border }]} />
          <Summary label="Days" value={`${days.length}`} />
        </View>

        <View style={[styles.listCard, { backgroundColor: palette.card }]}>
          {days.map((day, index) => (
            <DailyRow key={day.date} day={day} index={index} unit={unit} />
          ))}
        </View>

        <View style={[styles.tipCard, { backgroundColor: palette.blueTint }]}>
          <AppText variant="small" weight="semibold" color={colors.text}>
            Planning a trip?
          </AppText>
          <AppText variant="tiny" color={colors.textMuted} style={styles.tipText}>
            Tap a city from the search tab to compare the forecast across the week.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summary}>
      <AppText variant="tiny" color={colors.textMuted}>
        {label}
      </AppText>
      <AppText variant="subheading" weight="bold" style={styles.summaryValue}>
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
  content: {
    paddingHorizontal: spacing.lg,
  },
  headingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    ...shadow.soft,
  },
  summary: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    marginTop: 4,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingVertical: spacing.xs,
    marginTop: spacing.lg,
    ...shadow.soft,
  },
  tipCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.blueTint,
    borderRadius: radius.xl,
    padding: spacing.lg,
  },
  tipText: {
    marginTop: 4,
  },
});
