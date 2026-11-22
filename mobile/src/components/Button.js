import { Pressable, Text, ActivityIndicator, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export default function Button({ title, onPress, variant = "primary", disabled = false, loading = false }) {
  const outline = variant === "outline";
  const inactive = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [styles.base, styles[variant], (pressed || inactive) && styles.dim]}
    >
      {loading ? (
        <ActivityIndicator testID="button-spinner" color={outline ? COLORS.primary : COLORS.onPrimary} />
      ) : (
        <Text style={[styles.text, outline && styles.textOutline]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: COLORS.primary },
  danger: { backgroundColor: COLORS.danger },
  outline: { borderWidth: 1.5, borderColor: COLORS.primary },
  dim: { opacity: 0.5 },
  text: { color: COLORS.onPrimary, fontSize: 16, fontWeight: "bold" },
  textOutline: { color: COLORS.primary },
});
