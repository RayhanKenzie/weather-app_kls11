import * as Location from "expo-location";
import { useEffect } from "react";
import { Alert, Linking, Platform } from "react-native";

/**
 * Asks for location access once, when the app opens.
 *
 * 1. Requests the foreground location permission (the system dialog).
 * 2. If permission is granted but location services are turned off, invites the
 *    user to enable them. iOS does not allow apps to toggle location services,
 *    so we deep-link to the system settings instead.
 *
 * The flow is best-effort: the app keeps working with saved cities when the
 * user declines or the device has no location provider.
 */
export function useLocationPermission() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;

        let { status } = current;

        // Only ask when the OS can still show the dialog, so a denial is not
        // repeated on every launch.
        if (status !== "granted" && current.canAskAgain) {
          const result = await Location.requestForegroundPermissionsAsync();
          if (cancelled) return;
          status = result.status;
        }

        if (status !== "granted") return;

        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (cancelled || servicesEnabled) return;

        if (Platform.OS === "android") {
          // Shows the system prompt to turn on high-accuracy location mode.
          await Location.enableNetworkProviderAsync();
        } else if (Platform.OS === "ios") {
          Alert.alert(
            "Turn on Location Services",
            "Weatherly uses your location to show the forecast where you are. Turn on Location Services in Settings to use this feature.",
            [
              { text: "Not now", style: "cancel" },
              { text: "Open Settings", onPress: () => void Linking.openSettings() },
            ]
          );
        }
      } catch {
        // Location is optional — ignore failures and keep the saved cities.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
}
