import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AmbientGlow, WeatherHero } from "@/components/WeatherIcon";
import { AppText } from "@/components/ui";
import { gradients } from "@/constants/theme";

/**
 * 01 — Splash screen. Shows the brand for a short moment and then hands over
 * to the home screen.
 */
export default function SplashScreenRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [scale] = useState(() => new Animated.Value(0.86));
  const [opacity] = useState(() => new Animated.Value(0));
  const [taglineOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 42,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(taglineOpacity, {
      toValue: 1,
      duration: 600,
      delay: 350,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [opacity, scale, taglineOpacity]);

  // Let the brand animation finish, then continue to the home screen.
  useEffect(() => {
    const timeout = setTimeout(() => {
      router.replace("/(tabs)/home");
    }, 1900);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <LinearGradient colors={gradients.splash} style={styles.container}>
      <View style={[styles.glowWrapper, { top: 120 }]} pointerEvents="none">
        <AmbientGlow size={300} opacity={0.2} />
      </View>

      <View style={styles.center}>
        <Animated.View
          style={[styles.illustration, { opacity, transform: [{ scale }] }]}
        >
          <WeatherHero size={148} />
        </Animated.View>

        <Animated.View style={[styles.brand, { opacity }]}>
          <AppText
            variant="title"
            weight="bold"
            color="#FFFFFF"
            style={styles.brandName}
          >
            Weatherly
          </AppText>
        </Animated.View>

        <Animated.View style={{ opacity: taglineOpacity }}>
          <AppText variant="small" color="rgba(255,255,255,0.85)" style={styles.tagline}>
            Your day, forecasted beautifully
          </AppText>
        </Animated.View>
      </View>

      <View style={[styles.homeIndicator, { bottom: insets.bottom + 12 }]}>
        <View style={styles.homeIndicatorBar} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  glowWrapper: {
    position: "absolute",
    alignSelf: "center",
  },
  center: {
    alignItems: "center",
    marginTop: -40,
  },
  illustration: {
    marginBottom: 28,
  },
  brand: {
    marginBottom: 8,
  },
  brandName: {
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: 0.2,
  },
  tagline: {
    letterSpacing: 0.2,
  },
  homeIndicator: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  homeIndicatorBar: {
    width: 76,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.75)",
  },
});
