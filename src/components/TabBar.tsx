import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import type { BottomTabBarProps } from "expo-router/js-tabs";

import { AppText } from "@/components/ui";
import { colors, radius, shadow } from "@/constants/theme";
import { translateText } from "@/lib/i18n";
import { useAppColors, useSettings } from "@/providers/SettingsProvider";

const ICONS: Record<
  string,
  { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }
> = {
  home: { active: "home", inactive: "home-outline" },
  search: { active: "search", inactive: "search-outline" },
  cities: { active: "location", inactive: "location-outline" },
  settings: { active: "settings", inactive: "settings-outline" },
};

/**
 * Floating bottom navigation matching the design: a soft white pill that sits
 * above the home indicator.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const palette = useAppColors();
  const { settings } = useSettings();
  return (
    <View
      style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 10) }]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, { backgroundColor: palette.card }]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = translateText(
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name),
            settings.language
          );
          const iconSet = ICONS[route.name] ?? ICONS.home;

          const onPress = () => {
            const event = emitter.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused && [styles.iconWrapActive, { backgroundColor: palette.blueTint }],
                ]}
              >
                <Ionicons
                  name={focused ? iconSet.active : iconSet.inactive}
                  size={20}
                  color={focused ? palette.blue : palette.textMuted}
                />
              </View>
              <AppText
                variant="tiny"
                weight={focused ? "semibold" : "medium"}
                color={focused ? palette.blue : palette.textMuted}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    paddingVertical: 10,
    paddingHorizontal: 8,
    ...shadow.card,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  iconWrap: {
    width: 38,
    height: 28,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.blueTint,
  },
  pressed: {
    opacity: 0.6,
  },
});
