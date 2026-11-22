import { useCallback, useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import HeaderBar from "../components/HeaderBar";
import CustomInput from "../components/CustomInput";
import Button from "../components/Button";
import Chips from "../components/Chips";
import StateView from "../components/StateView";
import useForm from "../hooks/useForm";
import useApiData from "../hooks/useApiData";
import { validatePlan, NAME_MAX } from "../utils/validators";
import { toOffsetIso, todayText } from "../utils/time";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { COLORS } from "../theme/colors";

export default function TambahRencanaScreen({ navigation }) {
  const { token, handleAuthError } = useAuth();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const locationsReq = useApiData(() => Api.getLocations(token), [token], { auto: false });
  const reloadLocations = locationsReq.reload;
  useFocusEffect(
    useCallback(() => {
      reloadLocations();
    }, [reloadLocations]),
  );
  const { values, errors, setErrors, handleChange, handleSubmit } = useForm(
    { title: "", locationId: null, date: todayText(), start: "06:00", end: "09:00" },
    validatePlan,
  );

  const locations = locationsReq.data?.locations ?? [];

  const simpan = async (v) => {
    setSaving(true);
    setMessage(null);
    try {
      await Api.createPlan(token, {
        title: v.title.trim(),
        locationId: v.locationId,
        startAt: toOffsetIso(v.date, v.start),
        endAt: toOffsetIso(v.date, v.end),
      });
      navigation.goBack();
    } catch (e) {
      if (await handleAuthError(e)) return;
      setErrors(Api.fieldErrors(e));
      setMessage(Api.friendlyMessage(e));
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <HeaderBar title="Rencana Baru" subtitle="Sistem menyarankan jam hijau terbaik" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {message ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{message}</Text>
          </View>
        ) : null}
        <CustomInput
          label="Nama kegiatan"
          placeholder="mis. Jalan pagi"
          value={values.title}
          onChangeText={handleChange("title")}
          error={errors.title}
          maxLength={NAME_MAX + 20}
        />

        <Text style={styles.label}>Lokasi</Text>
        {locationsReq.loading || locationsReq.error ? (
          <StateView loading={locationsReq.loading} error={locationsReq.error} onRetry={locationsReq.reload} />
        ) : locations.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.muted}>Belum ada lokasi tersimpan.</Text>
            <Button title="Tambah lokasi dulu" variant="outline" onPress={() => navigation.navigate("TambahLokasi")} />
          </View>
        ) : (
          <Chips
            items={locations.map((l) => ({ value: l.id, label: l.name }))}
            selected={values.locationId}
            onSelect={handleChange("locationId")}
          />
        )}
        {errors.locationId ? <Text style={styles.error}>{errors.locationId}</Text> : null}
        <View style={styles.gap} />

        <CustomInput
          label="Tanggal"
          placeholder="YYYY-MM-DD"
          value={values.date}
          onChangeText={handleChange("date")}
          error={errors.date}
          keyboardType="numbers-and-punctuation"
        />
        <View style={styles.row}>
          <View style={styles.half}>
            <CustomInput
              label="Mulai"
              placeholder="06:00"
              value={values.start}
              onChangeText={handleChange("start")}
              error={errors.start}
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={styles.half}>
            <CustomInput
              label="Selesai"
              placeholder="09:00"
              value={values.end}
              onChangeText={handleChange("end")}
              error={errors.end}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>
        <Text style={styles.hint}>Jam memakai zona waktu HP-mu.</Text>
        <Button title="Simpan Rencana" onPress={handleSubmit(simpan)} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 16, paddingBottom: 40 },
  label: { marginBottom: 6, fontWeight: "600", color: COLORS.text },
  alert: { backgroundColor: COLORS.warningBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  alertText: { color: COLORS.warningText, lineHeight: 20 },
  error: { marginTop: 4, color: COLORS.danger, fontSize: 12 },
  emptyBox: { gap: 8 },
  muted: { color: COLORS.muted },
  gap: { height: 14 },
  row: { flexDirection: "row", gap: 12 },
  half: { flex: 1 },
  hint: { color: COLORS.muted, fontSize: 12, marginBottom: 14 },
});
