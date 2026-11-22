import { ScrollView, Pressable, Text, StyleSheet } from "react-native";
import { COLORS } from "../theme/colors";

export default function Chips({ items, selected, onSelect, disabled = false }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((item) => {
        const active = item.value === selected;
        return (
          <Pressable
            key={item.value}
            onPress={() => onSelect(item.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected: active, disabled }}
            style={[styles.chip, active && styles.active, disabled && styles.dim]}
          >
            <Text style={[styles.text, active && styles.textActive]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: 4, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  active: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dim: { opacity: 0.5 },
  text: { color: COLORS.text, fontSize: 14 },
  textActive: { color: COLORS.onPrimary, fontWeight: "600" },
});
