import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { COLORS } from "../theme/colors";

export default function StateView({ loading, error, empty, emptyText, emptyIcon = "file-tray-outline", onRetry, loadingText }) {
  if (loading) {
    return (
      <View style={styles.center} testID="state-loading">
        <ActivityIndicator size="large" color={COLORS.primary} />
        {loadingText ? <Text style={styles.muted}>{loadingText}</Text> : null}
      </View>
    );
  }
  if (error) {
    const pending = error.code === "NOT_IMPLEMENTED";
    return (
      <View style={styles.center} testID="state-error">
        <Ionicons
          name={pending ? "construct-outline" : "cloud-offline-outline"}
          size={44}
          color={pending ? COLORS.warningText : COLORS.danger}
        />
        <Text style={[styles.message, { color: pending ? COLORS.warningText : COLORS.danger }]}>{error.message}</Text>
        {onRetry ? (
          <View style={styles.retry}>
            <Button title="Coba Lagi" variant="outline" onPress={onRetry} />
          </View>
        ) : null}
      </View>
    );
  }
  if (empty) {
    return (
      <View style={styles.center} testID="state-empty">
        <Ionicons name={emptyIcon} size={44} color={COLORS.muted} />
        <Text style={styles.muted}>{emptyText}</Text>
      </View>
    );
  }
  return null;
}

const styles = StyleSheet.create({
  center: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  message: { textAlign: "center", fontSize: 15, lineHeight: 21 },
  muted: { textAlign: "center", color: COLORS.muted, fontSize: 15, lineHeight: 21 },
  retry: { alignSelf: "stretch", marginTop: 4 },
});
