import { Children, memo, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fontFamily } from "@/constants/fonts";
import { colors, radius, shadow, spacing, typography } from "@/constants/theme";
import { translateText } from "@/lib/i18n";
import { useSettings } from "@/providers/SettingsProvider";

type TextVariant = keyof typeof typography;

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  weight?: keyof typeof fontFamily;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/** Every piece of text in the app goes through this component. */
export const AppText = memo(function AppText({
  variant = "body",
  weight,
  color = colors.text,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { settings, colors: palette } = useSettings();
  const base = typography[variant] as TextStyle;
  const resolvedColor =
    color === undefined || color === colors.text
      ? palette.text
      : color === colors.textMuted
        ? palette.textMuted
        : color === colors.textSoft
          ? palette.textSoft
          : color;
  return (
    <Text
      {...rest}
      style={[
        base,
        {
          fontFamily: fontFamily[weight ?? (base.fontWeight as keyof typeof fontFamily) ?? "regular"],
          color: resolvedColor,
        },
        style,
      ]}
    >
        {Children.map(children, (child) =>
          typeof child === "string" ? translateText(child, settings.language) : child
        )}
    </Text>
  );
});

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const { colors: palette } = useSettings();
  return <View style={[styles.card, { backgroundColor: palette.card }, padded && styles.cardPadded, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
  onAction,
  style,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionHeader, style]}>
      <AppText variant="heading">{title}</AppText>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8} accessibilityRole="button">
          <AppText variant="small" weight="semibold" color={colors.blue}>
            {action}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: palette } = useSettings();
  return (
    <View style={[styles.screenHeader, style]}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={22} color={palette.text} />
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}

      <View style={styles.screenHeaderText}>
        <AppText variant="title" style={styles.screenHeaderTitle}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textMuted}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.screenHeaderRight}>{right}</View>
    </View>
  );
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors: palette } = useSettings();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipSelected : [styles.chipIdle, { backgroundColor: palette.field }],
        pressed && styles.pressed,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.white : colors.textSoft}
          style={styles.chipIcon}
        />
      ) : null}
      <AppText
        variant="small"
        weight="semibold"
        color={selected ? colors.white : colors.text}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function IconButton({
  name,
  onPress,
  color = colors.text,
  background = colors.white,
  size = 40,
  iconSize = 20,
  style,
}: {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  color?: string;
  background?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors: palette } = useSettings();
  const resolvedColor = color === colors.text ? palette.text : color;
  const resolvedBackground = background === colors.white ? palette.card : background;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: resolvedBackground,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize} color={resolvedColor} />
    </Pressable>
  );
}

export function SettingRow({
  icon,
  iconColor = colors.blue,
  title,
  subtitle,
  right,
  onPress,
  last = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const { colors: palette } = useSettings();
  const content = (
    <View style={[styles.settingRow, !last && [styles.settingRowBorder, { borderBottomColor: palette.border }]]}>
      {icon ? (
        <View style={[styles.settingIcon, { backgroundColor: `${iconColor}18` }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
      ) : null}
      <View style={styles.settingText}>
        <AppText variant="subheading">{title}</AppText>
        {subtitle ? (
          <AppText variant="small" color={colors.textMuted} style={styles.settingSubtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right ?? <Ionicons name="chevron-forward" size={18} color={palette.textMuted} />}
    </View>
  );

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {content}
    </Pressable>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors: palette } = useSettings();
  return <View style={[styles.divider, { backgroundColor: palette.border }, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    ...shadow.card,
  },
  cardPadded: {
    padding: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  screenHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  screenHeaderText: {
    flex: 1,
    alignItems: "center",
  },
  screenHeaderTitle: {
    textAlign: "center",
  },
  screenHeaderRight: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    height: 38,
    borderRadius: radius.pill,
    marginRight: spacing.sm,
  },
  chipIcon: {
    marginRight: 6,
  },
  chipSelected: {
    backgroundColor: colors.blue,
  },
  chipIdle: {
    backgroundColor: colors.field,
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  settingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  settingText: {
    flex: 1,
  },
  settingSubtitle: {
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
