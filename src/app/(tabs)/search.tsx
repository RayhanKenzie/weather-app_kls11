import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, Chip, ScreenHeader } from "@/components/ui";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { ALL_CITIES, POPULAR_CITIES, searchCities } from "@/lib/cities";
import { translateText } from "@/lib/i18n";
import type { City } from "@/lib/types";
import { useCities } from "@/providers/CitiesProvider";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";

/**
 * 05 — Search city. Lets the user find a city and add it to "My cities".
 */
export default function SearchCityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCity, isSaved, selectCity } = useCities();
  const { settings } = useSettings();
  const palette = useAppColors();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<City[]>(ALL_CITIES);
  const [searching, setSearching] = useState(false);
  const [activePopular, setActivePopular] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      setSearching(true);
      const found = await searchCities(query);
      if (!cancelled) {
        setResults(found);
        setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const popular = useMemo(() => POPULAR_CITIES, []);

  const handleSelect = (city: City) => {
    selectCity(city);
    if (!isSaved(city.id)) {
      addCity(city);
    }
    router.push("/(tabs)/home");
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader
        title="Search city"
        onBack={() => (router.canGoBack() ? router.back() : router.push("/(tabs)/home"))}
        style={{ paddingTop: insets.top + spacing.sm }}
      />

      <View style={[styles.searchBar, { backgroundColor: palette.field }]}>
        <Ionicons name="search" size={18} color={palette.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={translateText("Search for a city…", settings.language)}
          placeholderTextColor={palette.textMuted}
          style={[styles.input, { color: palette.text }]}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel={translateText("Search for a city", settings.language)}
        />
        {searching ? <ActivityIndicator size="small" color={palette.blue} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <AppText variant="heading" style={styles.sectionTitle}>
          Popular cities
        </AppText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {popular.map((city) => (
            <Chip
              key={city.id}
              label={city.name}
              selected={activePopular === city.id}
              onPress={() => {
                setActivePopular(city.id);
                setQuery(city.name);
              }}
            />
          ))}
        </ScrollView>

        <AppText variant="heading" style={styles.sectionTitle}>
          {query.trim().length > 0 ? "Search results" : "All cities"}
        </AppText>

        <View style={[styles.listCard, { backgroundColor: palette.card }]}>
          {results.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cloud-offline-outline" size={26} color={colors.textMuted} />
              <AppText variant="small" color={colors.textMuted} style={styles.emptyText}>
                No city found for “{query}”.
              </AppText>
            </View>
          ) : (
            results.map((city, index) => (
              <Pressable
                key={city.id}
                onPress={() => handleSelect(city)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${city.name}, ${city.country}`}
                style={({ pressed }) => [
                  styles.cityRow,
                  index !== results.length - 1 && [styles.cityRowBorder, { borderBottomColor: palette.border }],
                  pressed && styles.pressed,
                ]}
              >
                <View style={[styles.cityIcon, { backgroundColor: palette.blueTint }]}>
                  <Ionicons name="location-outline" size={16} color={colors.blue} />
                </View>
                <View style={styles.cityText}>
                  <AppText variant="subheading" weight="semibold">
                    {city.name}
                  </AppText>
                  <AppText variant="tiny" color={colors.textMuted}>
                    {city.country}
                  </AppText>
                </View>
                {isSaved(city.id) ? (
                  <View style={[styles.savedBadge, { backgroundColor: palette.blueTint }]}>
                    <Ionicons name="checkmark" size={13} color={colors.blue} />
                    <AppText variant="tiny" weight="semibold" color={colors.blue}>
                      Saved
                    </AppText>
                  </View>
                ) : (
                  <Ionicons name="add-circle-outline" size={22} color={colors.textMuted} />
                )}
              </Pressable>
            ))
          )}
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
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.field,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    fontWeight: "500",
    paddingVertical: 0,
  },
  content: {
    paddingTop: spacing.lg,
  },
  sectionTitle: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chips: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  listCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.soft,
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  cityRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cityIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueTint,
    marginRight: spacing.md,
  },
  cityText: {
    flex: 1,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: "center",
  },
  pressed: {
    opacity: 0.6,
  },
});
