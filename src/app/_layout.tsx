import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useAppFonts } from "@/hooks/useAppFonts";
import { useLocationPermission } from "@/hooks/useLocationPermission";
import { CitiesProvider } from "@/providers/CitiesProvider";
import { SettingsProvider, useSettings } from "@/providers/SettingsProvider";
import { WeatherProvider } from "@/providers/WeatherProvider";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useAppFonts();

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hide();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <CitiesProvider>
            <WeatherProvider>
              <AppNavigator />
            </WeatherProvider>
          </CitiesProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator() {
  const { settings, colors: palette } = useSettings();
  useLocationPermission();

  return (
    <>
      <StatusBar style={settings.appearance === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ animation: "fade" }} />
        <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
        <Stack.Screen name="hourly" />
        <Stack.Screen name="daily" />
        <Stack.Screen name="details" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
