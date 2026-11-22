import { View, Text, StyleSheet } from "react-native";
import { LEVEL_COLORS, COLORS } from "../theme/colors";

export default function RiskBadge({ level, large = false }) {
  const style = LEVEL_COLORS[level];
  return (
    <View style={[styles.badge, large && styles.large, { backgroundColor: style?.bg ?? COLORS.border }]}>
      <Text style={[styles.text, large && styles.textLarge, { color: style?.fg ?? COLORS.text }]}>
        {style?.label ?? "Tidak diketahui"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  large: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
  text: { fontSize: 13, fontWeight: "600" },
  textLarge: { fontSize: 18, fontWeight: "bold" },
});
