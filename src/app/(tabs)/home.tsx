import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DailyRow } from "@/components/DailyRow";
import { HourlyStrip } from "@/components/HourlyStrip";
import { AppText, IconButton, SectionHeader } from "@/components/ui";
import { AmbientGlow, WeatherHero } from "@/components/WeatherIcon";
import { colors, gradients, radius, shadow, spacing } from "@/constants/theme";
import { formatTemperature } from "@/lib/format";
import { useCities } from "@/providers/CitiesProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { useWeather } from "@/providers/WeatherProvider";
import { describeWeather } from "@/lib/wmo";

/**
 * 02 — Home. Shows the current conditions of the selected city together with
 * the hourly and daily previews.
 */
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { selectedCity } = useCities();
  const { settings } = useSettings();
  const { bundle, loading, refreshing, refresh } = useWeather();

  const current = bundle?.current;
  const descriptor = describeWeather(current?.weatherCode);
  const today = bundle?.daily[0];
  const unit = settings.temperatureUnit;

  const maxTemperature = bundle?.daily.reduce((max, day) => Math.max(max, day.maxTemperature), 0) ?? 0;
  const minTemperature = bundle?.daily.reduce((min, day) => Math.min(min, day.minTemperature), 99) ?? 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradients.hero} style={styles.hero}>
        <View style={styles.glow} pointerEvents="none">
          <AmbientGlow size={260} opacity={0.16} />
        </View>

        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            style={styles.locationButton}
            onPress={() => router.push("/(tabs)/search")}
            accessibilityRole="button"
            accessibilityLabel={`Change city, currently ${selectedCity.name}`}
          >
            <Ionicons name="chevron-down" size={14} color={colors.white} />
            <AppText variant="subheading" weight="semibold" color={colors.white}>
              {selectedCity.name}
            </AppText>
          </Pressable>

          <IconButton
            name="add"
            onPress={() => router.push("/(tabs)/search")}
            color={colors.white}
            background="rgba(255,255,255,0.22)"
            size={38}
            iconSize={22}
          />
        </View>

        <View style={styles.heroRow}>
          <View style={styles.heroText}>
            <AppText variant="display" weight="extraLight" color={colors.white}>
              {current ? formatTemperature(current.temperature, unit) : "--°"}
            </AppText>
            <AppText variant="subheading" color="rgba(255,255,255,0.95)" style={styles.condition}>
              {current ? descriptor.label : "Loading forecast"}
            </AppText>
            {today ? (
              <AppText variant="small" color="rgba(255,255,255,0.8)" style={styles.range}>
                {formatTemperature(maxTemperature, unit)} / {formatTemperature(minTemperature, unit)}
              </AppText>
            ) : null}
          </View>

          <View style={styles.heroIllustration}>
            <WeatherHero size={128} isDay={current?.isDay ?? true} />
          </View>
        </View>

        <View style={styles.metrics}>
          <Metric label="Feels like" value={current ? formatTemperature(current.apparentTemperature, unit) : "--"} />
          <View style={styles.metricDivider} />
          <Metric label="Sunrise" value={current?.sunrise ?? "--:--"} />
          <View style={styles.metricDivider} />
          <Metric label="Wind" value={current ? `${Math.round(current.windSpeed)} km/h` : "--"} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.sheet}
        contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.blue}
            colors={[colors.blue]}
          />
        }
      >
        <View style={styles.handle} />

        <SectionHeader
          title="Today"
          action="See all"
          onAction={() => router.push("/hourly")}
          style={styles.section}
        />
        {bundle ? (
          <HourlyStrip hours={bundle.hourly.slice(0, 12)} unit={unit} />
        ) : (
          <View style={styles.placeholder} />
        )}

        <SectionHeader
          title="7-day forecast"
          action="See all"
          onAction={() => router.push("/daily")}
          style={styles.section}
        />
        <View style={styles.dailyCard}>
          {bundle?.daily.slice(0, 3).map((day, index) => (
            <DailyRow key={day.date} day={day} index={index} unit={unit} showDescription={false} />
          ))}
        </View>

        <Pressable
          style={styles.detailsCard}
          onPress={() => router.push("/details")}
          accessibilityRole="button"
        >
          <View style={styles.detailsIcon}>
            <Ionicons name="speedometer-outline" size={20} color={colors.blue} />
          </View>
          <View style={styles.detailsText}>
            <AppText variant="subheading" weight="semibold">
              Weather details
            </AppText>
            <AppText variant="small" color={colors.textMuted}>
              UV index, humidity, wind and visibility
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {bundle?.offline ? (
          <View style={styles.offlineNote}>
            <Ionicons name="cloud-offline-outline" size={14} color={colors.textSoft} />
            <AppText variant="tiny" color={colors.textSoft}>
              Offline data — connect to the internet for live conditions
            </AppText>
          </View>
        ) : null}

        {loading && !bundle ? (
          <View style={styles.offlineNote}>
            <AppText variant="tiny" color={colors.textSoft}>
              Loading forecast…
            </AppText>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <AppText variant="tiny" color="rgba(255,255,255,0.75)">
        {label}
      </AppText>
      <AppText variant="subheading" weight="semibold" color={colors.white} style={styles.metricValue}>
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
    overflow: "hidden",
  },
  glow: {
    position: "absolute",
    top: 40,
    right: -70,
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
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  heroText: {
    flex: 1,
  },
  condition: {
    marginTop: -6,
  },
  range: {
    marginTop: 2,
  },
  heroIllustration: {
    width: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    marginTop: 3,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    height: 26,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  sheet: {
    flex: 1,
  },
  sheetContent: {
    paddingTop: spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  dailyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.soft,
  },
  detailsCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.lg,
    ...shadow.soft,
  },
  detailsIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.blueTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  detailsText: {
    flex: 1,
  },
  placeholder: {
    height: 110,
  },
  offlineNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.lg,
  },
});
