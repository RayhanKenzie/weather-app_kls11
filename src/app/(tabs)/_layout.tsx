import { Tabs } from "expo-router/js-tabs";

import { TabBar } from "@/components/TabBar";
import { useAppColors } from "@/providers/SettingsProvider";

export default function TabsLayout() {
  const palette = useAppColors();
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        sceneStyle: { backgroundColor: palette.background },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="cities" options={{ title: "Cities" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
