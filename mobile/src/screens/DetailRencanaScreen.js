import { useState } from "react";
import { View, Text, ScrollView, Alert, StyleSheet } from "react-native";
import HeaderBar from "../components/HeaderBar";
import StateView from "../components/StateView";
import RiskBadge from "../components/RiskBadge";
import Button from "../components/Button";
import useApiData from "../hooks/useApiData";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { clockFromIso, dateFromIso } from "../utils/time";
import { COLORS } from "../theme/colors";

export default function DetailRencanaScreen({ route, navigation }) {
  const { plan } = route.params;
  const { token, handleAuthError } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const { data, loading, error, reload } = useApiData(() => Api.getPlanRecommendation(token, plan.id), [token, plan.id]);

  const hapus = () =>
    Alert.alert("Hapus rencana?", `"${plan.title}" akan dihapus.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await Api.deletePlan(token, plan.id);
            navigation.goBack();
          } catch (e) {
            setDeleting(false);
            if (!(await handleAuthError(e))) Alert.alert("Gagal menghapus", Api.friendlyMessage(e));
          }
        },
      },
    ]);

  return (
    <View style={styles.container}>
      <HeaderBar title={plan.title} subtitle={plan.locationName ?? "Rencana aktivitas"} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Waktu yang diinginkan</Text>
          <Text style={styles.value}>
            {dateFromIso(plan.startAt)}, {clockFromIso(plan.startAt)}–{clockFromIso(plan.endAt)}
          </Text>
        </View>

        <Text style={styles.label}>Saran jam hijau</Text>
        {loading || error ? (
          <View style={styles.stateBox}>
            <StateView loading={loading} loadingText="Mencari jam hijau terbaik..." error={error} onRetry={reload} />
          </View>
        ) : (
          <View style={styles.card}>
            {data?.recommendation ? (
              <Text style={styles.green}>
                {clockFromIso(data.recommendation.start)} – {clockFromIso(data.recommendation.end)}
              </Text>
            ) : data?.coverage === "NONE" ? null : (
              <Text style={styles.muted}>Tidak ada jam hijau di rentang ini. Pertimbangkan waktu atau lokasi lain.</Text>
            )}
            {data?.message ? <Text style={styles.muted}>{data.message}</Text> : null}
            {(data?.hours ?? []).map((h) => (
              <View key={h.time} style={styles.hourRow}>
                <Text style={styles.hour}>{clockFromIso(h.time)}</Text>
                <RiskBadge level={h.level} />
              </View>
            ))}
          </View>
        )}

        <View style={styles.gap} />
        <Button title="Hapus Rencana" variant="danger" onPress={hapus} loading={deleting} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  label: { fontWeight: "600", color: COLORS.text, marginTop: 16, marginBottom: 6 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 8 },
  cardLabel: { color: COLORS.muted, fontSize: 13 },
  value: { fontSize: 17, fontWeight: "600", color: COLORS.text },
  stateBox: { minHeight: 220 },
  green: { fontSize: 22, fontWeight: "bold", color: COLORS.primary },
  muted: { color: COLORS.muted },
  hourRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
  hour: { fontWeight: "600", color: COLORS.text },
  gap: { height: 20 },
});
