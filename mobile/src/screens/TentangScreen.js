import { View, Text, ScrollView, StyleSheet } from "react-native";
import HeaderBar from "../components/HeaderBar";
import Button from "../components/Button";
import useApiData from "../hooks/useApiData";
import { BASE_URL, getHealth } from "../services/ApiService";
import { COLORS } from "../theme/colors";

export default function TentangScreen({ navigation }) {
  const { data, loading, error, reload } = useApiData(() => getHealth(), []);

  const status = loading ? "Memeriksa..." : error ? error.message : data?.status === "ok" ? "Terhubung" : "Respons tidak dikenal";

  return (
    <View style={styles.container}>
      <HeaderBar title="Tentang JamHijau" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.text}>
          JamHijau memberi tahu kapan aman beraktivitas di luar ruangan. Setiap jam dinilai Hijau (aman), Kuning
          (waspada) atau Merah (hindari) berdasarkan PM2.5, PM10, indeks UV, suhu, dan kelembapan dari Open-Meteo,
          disesuaikan dengan profil kesehatanmu.
        </Text>
        <View style={styles.card}>
          <Row label="Server API" value={BASE_URL} />
          <Row label="Status" value={status} danger={Boolean(error)} />
          <Row label="Versi aplikasi" value="1.0.0" />
          <Row label="Kelompok" value="fah · K02 · II3160 × II3140" />
        </View>
        <Button title="Cek ulang koneksi" variant="outline" onPress={reload} loading={loading} />
      </ScrollView>
    </View>
  );
}

function Row({ label, value, danger }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, danger && { color: COLORS.danger }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, gap: 16 },
  text: { color: COLORS.text, lineHeight: 22 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, gap: 12 },
  row: { gap: 2 },
  rowLabel: { color: COLORS.muted, fontSize: 12 },
  rowValue: { color: COLORS.text, fontSize: 15 },
});
