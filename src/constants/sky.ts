import type { WeatherKind } from "@/lib/wmo";

/**
 * Sky gradients used behind the current conditions. Each weather family gets a
 * colour that reads like the sky for that condition, with separate day and
 * night palettes so the hero still feels right after sunset.
 */
export type SkyGradient = readonly [string, string, string];

const SKY_GRADIENTS: Record<WeatherKind, { day: SkyGradient; night: SkyGradient }> = {
  clear: {
    day: ["#58B6F7", "#2F8AE5", "#1C6CC9"],
    night: ["#2B3F63", "#1B2C49", "#111D33"],
  },
  "mostly-clear": {
    day: ["#63B4F2", "#3D90DF", "#2A70C5"],
    night: ["#2E4266", "#1F3150", "#141F37"],
  },
  "partly-cloudy": {
    day: ["#6FAEDF", "#4A8CC7", "#356FA8"],
    night: ["#33465F", "#24364D", "#172538"],
  },
  cloudy: {
    day: ["#7E97AC", "#627E97", "#4A6680"],
    night: ["#3A4A5C", "#2C3A4A", "#1F2B38"],
  },
  overcast: {
    day: ["#728A9F", "#5A748B", "#445C73"],
    night: ["#35434F", "#28343F", "#1C262F"],
  },
  fog: {
    day: ["#8A9AA9", "#728391", "#5A6B79"],
    night: ["#3E4A55", "#303A44", "#232C34"],
  },
  drizzle: {
    day: ["#5C82A6", "#46709A", "#345A80"],
    night: ["#2C4057", "#233447", "#1A2838"],
  },
  rain: {
    day: ["#4E759B", "#3C6288", "#2C4E71"],
    night: ["#293C52", "#203144", "#172535"],
  },
  "heavy-rain": {
    day: ["#415F7E", "#324C68", "#253B53"],
    night: ["#223247", "#1A283A", "#131F2D"],
  },
  snow: {
    day: ["#7FA2BE", "#6789A8", "#4F7291"],
    night: ["#364C62", "#2A3D50", "#1E2D3D"],
  },
  thunder: {
    day: ["#5A5578", "#464268", "#343154"],
    night: ["#332F4E", "#272443", "#1B1934"],
  },
};

export function skyGradient(kind: WeatherKind, isDay = true): SkyGradient {
  const palette = SKY_GRADIENTS[kind] ?? SKY_GRADIENTS["partly-cloudy"];
  return isDay ? palette.day : palette.night;
}
