import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText, ScreenHeader, SettingRow } from "@/components/ui";
import { colors, radius, shadow, spacing } from "@/constants/theme";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";

/**
 * 08 — Settings: preferences and app information.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const palette = useAppColors();

  const displayName = "Weatherly";
  const displayTagline = "Your day, forecasted beautifully";

  const toggleSpeedUnit = () => {
    update("speedUnit", settings.speedUnit === "kmh" ? "mph" : "kmh");
  };

  const cycleLanguage = () => {
    update("language", settings.language === "English" ? "Bahasa Indonesia" : "English");
  };

  const cycleAppearance = () => {
    update("appearance", settings.appearance === "dark" ? "light" : "dark");
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ScreenHeader title="Settings" style={{ paddingTop: insets.top + spacing.sm }} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.profileCard, { backgroundColor: palette.card }]}>
          <View style={styles.avatar}>
            <AppText variant="title" weight="bold" color={colors.white}>
              {displayName.slice(0, 1).toUpperCase()}
            </AppText>
          </View>
          <View style={styles.profileText}>
            <AppText variant="heading">{displayName}</AppText>
            <AppText variant="small" color={colors.textMuted}>
              {displayTagline}
            </AppText>
          </View>
          <View style={[styles.editButton, { backgroundColor: palette.blueTint }]}>
            <Ionicons name="partly-sunny" size={18} color={palette.blue} />
          </View>
        </View>

        <AppText variant="tiny" weight="semibold" color={colors.textMuted} style={styles.groupTitle}>
          PREFERENCES
        </AppText>

        <View style={[styles.card, { backgroundColor: palette.card }]}>
          <SettingRow
            icon="thermometer-outline"
            title="Temperature unit"
            subtitle={`Temperatures in ${settings.temperatureUnit === "c" ? "Celsius" : "Fahrenheit"}`}
            right={
              <View style={[styles.unitSwitch, { backgroundColor: palette.field }]}>
                {(["c", "f"] as const).map((unit) => (
                  <Pressable
                    key={unit}
                    onPress={() => update("temperatureUnit", unit)}
                    accessibilityRole="button"
                    style={[styles.unitOption, settings.temperatureUnit === unit && styles.unitOptionActive]}
                  >
                    <AppText
                      variant="tiny"
                      weight="semibold"
                      color={settings.temperatureUnit === unit ? colors.white : colors.textSoft}
                    >
                      °{unit.toUpperCase()}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            }
          />
          <SettingRow
            icon="speedometer-outline"
            title="Wind speed unit"
            subtitle={settings.speedUnit === "kmh" ? "Kilometres per hour" : "Miles per hour"}
            onPress={toggleSpeedUnit}
            right={
              <AppText variant="small" weight="semibold" color={colors.blue}>
                {settings.speedUnit === "kmh" ? "km/h" : "mph"}
              </AppText>
            }
          />
          <SettingRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Daily forecast alerts"
            right={
              <Switch
                value={settings.notifications}
                onValueChange={(value) => update("notifications", value)}
                trackColor={{ false: palette.border, true: palette.blueLight }}
                thumbColor={settings.notifications ? palette.blue : colors.white}
                accessibilityLabel="Toggle notifications"
              />
            }
          />
          <SettingRow
            icon="language-outline"
            title="Language"
            onPress={cycleLanguage}
            right={
              <AppText variant="small" weight="semibold" color={colors.blue}>
                {settings.language}
              </AppText>
            }
          />
          <SettingRow
            icon="contrast-outline"
            title="Appearance"
            onPress={cycleAppearance}
            right={
              <AppText variant="small" weight="semibold" color={colors.blue}>
                {settings.appearance === "dark" ? "Dark mode" : "Light mode"}
              </AppText>
            }
            last
          />
        </View>

        <AppText variant="tiny" weight="semibold" color={colors.textMuted} style={styles.groupTitle}>
          ABOUT
        </AppText>

        <View style={[styles.card, { backgroundColor: palette.card }]}>
          <SettingRow
            icon="information-circle-outline"
            title="About Weatherly"
            subtitle="Your day, forecasted beautifully"
            onPress={() => router.push("/(tabs)/home")}
          />
          <SettingRow
            icon="document-text-outline"
            title="Data source"
            subtitle="Open-Meteo · free & open API"
            right={
              <View style={[styles.liveBadge, { backgroundColor: palette.blueTint }]}>
                <View style={styles.liveDot} />
                <AppText variant="tiny" weight="semibold" color={colors.blue}>
                  LIVE
                </AppText>
              </View>
            }
            last
          />
        </View>

        <View style={[styles.infoCard, { backgroundColor: palette.card }]}>
          <View style={styles.infoHeader}>
            <View style={styles.infoIcon}>
              <Ionicons name="bulb-outline" size={18} color={colors.sun} />
            </View>
            <AppText variant="subheading" weight="semibold">
              Key information
            </AppText>
          </View>
          <AppText variant="tiny" color={colors.textSoft} style={styles.infoText}>
            Forecasts are provided by the Open-Meteo open data project and refreshed every 15
            minutes. When the device is offline the app falls back to the last generated
            forecast so every screen keeps working.
          </AppText>
        </View>

        <AppText variant="tiny" color={colors.textMuted} style={styles.version}>
          Weatherly v1.0.0 · Made for school projects
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.soft,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
  },
  profileText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.blueTint,
  },
  groupTitle: {
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    ...shadow.soft,
  },
  unitSwitch: {
    flexDirection: "row",
    backgroundColor: colors.field,
    borderRadius: radius.pill,
    padding: 3,
    gap: 2,
  },
  unitOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  unitOptionActive: {
    backgroundColor: colors.blue,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.blueTint,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.blue,
  },
  infoCard: {
    marginTop: spacing.xl,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadow.soft,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#FFF6E0",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  version: {
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
