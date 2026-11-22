import { Pressable, View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme/colors";

export default function ListCard({ icon, title, subtitle, onPress, onDelete }) {
  return (
    <Pressable style={styles.card} onPress={onPress} disabled={!onPress}>
      {icon ? <Ionicons name={icon} size={24} color={COLORS.primary} style={styles.icon} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel={`Hapus ${title}`}>
          <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
        </Pressable>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={22} color={COLORS.muted} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  icon: { marginRight: 12 },
  title: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  sub: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
});
