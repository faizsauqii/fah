import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Button from "./Button";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme/colors";

export default function GuestGate({ feature }) {
  const { exitGuest } = useAuth();
  return (
    <View style={styles.center} testID="guest-gate">
      <Ionicons name="lock-closed-outline" size={44} color={COLORS.muted} />
      <Text style={styles.title}>Masuk untuk memakai {feature}</Text>
      <Text style={styles.text}>
        Cek Risiko bisa dipakai tanpa akun. Untuk menyimpan profil kesehatan, lokasi, dan rencana aktivitas, kamu perlu
        masuk atau mendaftar.
      </Text>
      <View style={styles.button}>
        <Button title="Masuk / Daftar" onPress={exitGuest} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 10 },
  title: { fontSize: 18, fontWeight: "bold", color: COLORS.text, textAlign: "center" },
  text: { color: COLORS.muted, textAlign: "center", lineHeight: 21 },
  button: { alignSelf: "stretch", marginTop: 8 },
});
