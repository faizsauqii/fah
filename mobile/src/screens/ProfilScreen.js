import { useState } from "react";
import { View, Text, ScrollView, Alert, StyleSheet } from "react-native";
import HeaderBar from "../components/HeaderBar";
import Button from "../components/Button";
import Chips from "../components/Chips";
import StateView from "../components/StateView";
import GuestGate from "../components/GuestGate";
import useApiData from "../hooks/useApiData";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { HEALTH_PROFILES, profileLabel } from "../utils/constants";
import { COLORS } from "../theme/colors";

export default function ProfilScreen({ navigation }) {
  const { token, user, isLoggedIn, logout, handleAuthError } = useAuth();
  const me = useApiData(() => Api.getMe(token), [token], { enabled: isLoggedIn });
  const health = useApiData(() => Api.getHealthProfile(token), [token], { enabled: isLoggedIn });
  const [saving, setSaving] = useState(false);

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <HeaderBar title="Profil" subtitle="Akun dan profil kesehatan" />
        <GuestGate feature="profil kesehatan" />
        <View style={styles.footer}>
          <Button title="Tentang Aplikasi" variant="outline" onPress={() => navigation.navigate("Tentang")} />
        </View>
      </View>
    );
  }

  const account = me.data ?? user;

  const pilihProfil = async (value) => {
    setSaving(true);
    try {
      const data = await Api.updateHealthProfile(token, value);
      health.setData(data ?? { profile: value });
    } catch (e) {
      if (!(await handleAuthError(e))) Alert.alert("Profil belum tersimpan", Api.friendlyMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const keluar = () =>
    Alert.alert("Keluar?", "Token login akan dihapus dari HP ini.", [
      { text: "Batal", style: "cancel" },
      { text: "Keluar", style: "destructive", onPress: logout },
    ]);

  return (
    <View style={styles.container}>
      <HeaderBar title="Profil" subtitle={account?.email} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.halo}>Halo, {account?.name || "Pengguna"}!</Text>
          <Text style={styles.muted}>{account?.email}</Text>
          {me.error ? <Text style={styles.warn}>Data akun dari server belum bisa dimuat: {me.error.message}</Text> : null}
        </View>

        <Text style={styles.label}>Profil kesehatan</Text>
        <View style={styles.card}>
          {health.loading || health.error ? (
            <StateView loading={health.loading} error={health.error} onRetry={health.reload} />
          ) : (
            <>
              <Text style={styles.muted}>
                Saat ini: <Text style={styles.bold}>{profileLabel(health.data?.profile ?? "umum")}</Text>
              </Text>
              <Chips
                items={HEALTH_PROFILES}
                selected={health.data?.profile ?? "umum"}
                onSelect={pilihProfil}
                disabled={saving}
              />
              <Text style={styles.hint}>Profil rentan memakai ambang batas yang lebih ketat.</Text>
            </>
          )}
        </View>

        <View style={styles.gap} />
        <Button title="Tentang Aplikasi" variant="outline" onPress={() => navigation.navigate("Tentang")} />
        <View style={styles.gapSmall} />
        <Button title="Keluar" variant="danger" onPress={keluar} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 8 },
  halo: { fontSize: 20, fontWeight: "bold", color: COLORS.text },
  label: { fontWeight: "600", color: COLORS.text, marginTop: 16, marginBottom: 6 },
  muted: { color: COLORS.muted },
  bold: { fontWeight: "bold", color: COLORS.text },
  warn: { color: COLORS.warningText, fontSize: 13 },
  hint: { color: COLORS.muted, fontSize: 12 },
  gap: { height: 24 },
  gapSmall: { height: 12 },
  footer: { padding: 16 },
});
