import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

export default function HeaderBar({ title, subtitle, onBack, rightIcon, onRightPress, rightLabel }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingTop: insets.top + 12 }]}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={10} style={styles.back} accessibilityLabel="Kembali">
          <Ionicons name="arrow-back" size={24} color={COLORS.onPrimary} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.sub} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon ? (
        <Pressable onPress={onRightPress} hitSlop={10} accessibilityLabel={rightLabel}>
          <Ionicons name={rightIcon} size={26} color={COLORS.onPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  back: { marginRight: 12 },
  title: { color: COLORS.onPrimary, fontSize: 20, fontWeight: "bold" },
  sub: { color: COLORS.onPrimaryMuted, fontSize: 13, marginTop: 2 },
});
