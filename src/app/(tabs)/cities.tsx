import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, ScreenHeader } from "@/components/ui";
import { WeatherIcon } from "@/components/WeatherIcon";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { formatTemperature } from "@/lib/format";
import type { CurrentWeather } from "@/lib/types";
import { describeWeather } from "@/lib/wmo";
import { fetchCurrentOnly } from "@/lib/weather";
import { MAX_SAVED_CITIES, useCities } from "@/providers/CitiesProvider";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";

/**
 * 07 — My cities. The saved city list with live conditions.
 */
export default function MyCitiesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { cities, selectedCity, selectCity, removeCity } = useCities();
  const { settings } = useSettings();
  const palette = useAppColors();
  const unit = settings.temperatureUnit;

  const [conditions, setConditions] = useState<Record<string, CurrentWeather>>({});

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const entries = await Promise.all(
        cities.map(async (city) => {
          const current = await fetchCurrentOnly(city);
          return [city.id, current] as const;
        })
      );
      if (cancelled) return;

      const next: Record<string, CurrentWeather> = {};
      entries.forEach(([id, current]) => {
        if (current) next[id] = current;
      });
      setConditions(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [cities]);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader
        title="My cities"
        style={{ paddingTop: insets.top + spacing.sm }}
        right={
          <AppText variant="small" weight="semibold" color={colors.textMuted}>
            {cities.length} of {MAX_SAVED_CITIES}
          </AppText>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {cities.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: palette.blueTint }]}>
              <Ionicons name="map-outline" size={26} color={colors.blue} />
            </View>
            <AppText variant="subheading" weight="semibold">
              No saved cities yet
            </AppText>
            <AppText variant="small" color={colors.textMuted} style={styles.emptyText}>
              Search for a city to follow its weather forecast.
            </AppText>
          </View>
        ) : (
          <View style={[styles.listCard, { backgroundColor: palette.card }]}>
            {cities.map((city, index) => {
              const current = conditions[city.id];
              const descriptor = describeWeather(current?.weatherCode);
              const isActive = city.id === selectedCity.id;

              return (
                <Pressable
                  key={city.id}
                  onPress={() => {
                    selectCity(city);
                    router.push("/(tabs)/home");
                  }}
                  onLongPress={() => removeCity(city.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${city.name}, ${city.country}`}
                  style={({ pressed }) => [
                    styles.row,
                    index !== cities.length - 1 && [styles.rowBorder, { borderBottomColor: palette.border }],
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.cityText}>
                    <View style={styles.nameRow}>
                      <AppText variant="subheading" weight="semibold">
                        {city.name}
                      </AppText>
                      {isActive ? (
                        <View style={styles.activeDot} />
                      ) : null}
                    </View>
                    <AppText variant="tiny" color={colors.textMuted}>
                      {city.country}
                    </AppText>
                  </View>

                  <View style={styles.icon}>
                    <WeatherIcon kind={descriptor.kind} size={26} isDay={current?.isDay ?? true} />
                  </View>

                  <View style={styles.temperatures}>
                    <AppText variant="subheading" weight="bold">
                      {current ? formatTemperature(current.temperature, unit) : "--°"}
                    </AppText>
                    {current ? (
                      <AppText variant="tiny" color={colors.textMuted}>
                        feels {formatTemperature(current.apparentTemperature, unit)}
                      </AppText>
                    ) : null}
                  </View>

                  <Ionicons name="chevron-forward" size={17} color={palette.textMuted} style={styles.chevron} />
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
          onPress={() => router.push("/(tabs)/search")}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={colors.white} />
          <AppText variant="subheading" weight="semibold" color={colors.white}>
            Add city
          </AppText>
        </Pressable>

        <AppText variant="tiny" color={colors.textMuted} style={styles.hint}>
          Long press a city to remove it from your list.
        </AppText>
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
  listCard: {
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
  cityText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  icon: {
    width: 40,
    alignItems: "center",
  },
  temperatures: {
    width: 72,
    alignItems: "flex-end",
  },
  chevron: {
    marginLeft: spacing.sm,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.blue,
    ...shadow.card,
    shadowOpacity: 0.2,
  },
  hint: {
    textAlign: "center",
    marginTop: spacing.md,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: colors.blueTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
