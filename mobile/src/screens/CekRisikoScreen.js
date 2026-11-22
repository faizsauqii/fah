import { useCallback, useEffect, useState } from "react";
import { View, Text, ScrollView, RefreshControl, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import HeaderBar from "../components/HeaderBar";
import Chips from "../components/Chips";
import StateView from "../components/StateView";
import RiskBadge from "../components/RiskBadge";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { getCurrentCoords } from "../utils/location";
import { HEALTH_PROFILES } from "../utils/constants";
import { clockFromIso } from "../utils/time";
import { COLORS } from "../theme/colors";

export default function CekRisikoScreen() {
  const { token, isLoggedIn, handleAuthError } = useAuth();
  const [profile, setProfile] = useState("umum");
  const [coords, setCoords] = useState(null);
  const [risk, setRisk] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoggedIn) return;
    Api.getHealthProfile(token)
      .then((data) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => {});
  }, [isLoggedIn, token]);

  const cek = useCallback(
    async (selectedProfile, { freshLocation = false } = {}) => {
      setLoading(true);
      setError(null);
      try {
        let here = freshLocation ? null : coords;
        if (!here) {
          setStage("Mencari lokasimu...");
          here = await getCurrentCoords();
          setCoords(here);
        }
        setStage("Menilai risiko per jam...");
        const data = await Api.getRisk({ ...here, profile: selectedProfile }, token);
        if (!Array.isArray(data?.hours)) {
          throw new Api.ApiError({ status: 200, code: "BAD_RESPONSE", message: "Format data risiko dari server tidak dikenali." });
        }
        setRisk(data);
      } catch (e) {
        if (await handleAuthError(e)) return;
        setRisk(null);
        setError(
          e instanceof Api.ApiError
            ? { message: Api.friendlyMessage(e), code: e.code }
            : { message: e.message, code: "LOCATION" },
        );
      } finally {
        setLoading(false);
      }
    },
    [coords, token, handleAuthError],
  );

  useEffect(() => {
    cek(profile);
  }, [profile]);

  const refresh = () => cek(profile, { freshLocation: true });

  const now = risk?.hours?.[0];

  return (
    <View style={styles.container}>
      <HeaderBar
        title="Cek Risiko"
        subtitle={coords ? `Lokasi saat ini · ${coords.lat}, ${coords.lon}` : "Lokasi saat ini"}
        rightIcon="refresh"
        rightLabel="Muat ulang"
        onRightPress={refresh}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} />}
      >
        <Text style={styles.label}>Profil kesehatan</Text>
        <Chips items={HEALTH_PROFILES} selected={profile} onSelect={setProfile} disabled={loading} />

        {loading || error ? (
          <View style={styles.stateBox}>
            <StateView loading={loading} loadingText={stage} error={error} onRetry={() => cek(profile)} />
          </View>
        ) : risk && risk.hours.length === 0 ? (
          <View style={styles.stateBox}>
            <StateView empty emptyText="Belum ada data prakiraan untuk lokasi ini." />
          </View>
        ) : risk ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Sekarang ({clockFromIso(now.time)})</Text>
              <RiskBadge level={now.level} large />
              <View style={styles.metrics}>
                <Metric icon="cloud-outline" label="PM2.5" value={now.pm25} unit="µg/m³" />
                <Metric icon="cloudy-outline" label="PM10" value={now.pm10} unit="µg/m³" />
                <Metric icon="sunny-outline" label="UV" value={now.uvIndex} />
                <Metric icon="thermometer-outline" label="Suhu" value={now.temperature} unit="°C" />
                <Metric icon="water-outline" label="Lembap" value={now.humidity} unit="%" />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardLabel}>Jam hijau hari ini</Text>
              {risk.greenWindow ? (
                <Text style={styles.green}>
                  {clockFromIso(risk.greenWindow.start)} – {clockFromIso(risk.greenWindow.end)}
                </Text>
              ) : (
                <Text style={styles.muted}>Tidak ada jam hijau dalam 24 jam ke depan untuk profil ini.</Text>
              )}
            </View>

            <Text style={styles.label}>Prakiraan 24 jam</Text>
            {risk.hours.map((h) => (
              <View key={h.time} style={styles.hourRow}>
                <Text style={styles.hour}>{clockFromIso(h.time)}</Text>
                <RiskBadge level={h.level} />
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Metric({ icon, label, value, unit = "" }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={COLORS.muted} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>
        {value === null || value === undefined ? "–" : `${value}${unit ? ` ${unit}` : ""}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32, flexGrow: 1 },
  label: { fontWeight: "600", color: COLORS.text, marginBottom: 6, marginTop: 8 },
  stateBox: { flexGrow: 1, minHeight: 320 },
  card: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, marginTop: 14, gap: 10 },
  cardLabel: { color: COLORS.muted, fontSize: 13 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  metric: { width: "29%", alignItems: "flex-start", gap: 2 },
  metricLabel: { color: COLORS.muted, fontSize: 12 },
  metricValue: { color: COLORS.text, fontWeight: "600" },
  green: { fontSize: 22, fontWeight: "bold", color: COLORS.primary },
  muted: { color: COLORS.muted },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 6,
  },
  hour: { fontWeight: "600", color: COLORS.text },
});
