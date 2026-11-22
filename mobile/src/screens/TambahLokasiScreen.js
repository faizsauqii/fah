import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import HeaderBar from "../components/HeaderBar";
import CustomInput from "../components/CustomInput";
import Button from "../components/Button";
import useForm from "../hooks/useForm";
import { validateLocation, parseCoordinate, NAME_MAX } from "../utils/validators";
import { getCurrentCoords } from "../utils/location";
import { useAuth } from "../context/AuthContext";
import * as Api from "../services/ApiService";
import { COLORS } from "../theme/colors";

const AWAL = { name: "", lat: "", lon: "" };

export default function TambahLokasiScreen({ navigation }) {
  const { token, handleAuthError } = useAuth();
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState(null);
  const { values, errors, setErrors, setValues, handleChange, handleSubmit } = useForm(AWAL, validateLocation);

  const pakaiLokasiSaatIni = async () => {
    setLocating(true);
    setMessage(null);
    try {
      const { lat, lon } = await getCurrentCoords();
      setValues((prev) => ({ ...prev, lat: String(lat), lon: String(lon) }));
      setErrors((prev) => ({ ...prev, lat: null, lon: null }));
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLocating(false);
    }
  };

  const simpan = async (v) => {
    setSaving(true);
    setMessage(null);
    try {
      await Api.createLocation(token, {
        name: v.name.trim(),
        lat: parseCoordinate(v.lat),
        lon: parseCoordinate(v.lon),
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
      <HeaderBar title="Tambah Lokasi" subtitle="Simpan tempat yang sering dikunjungi" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {message ? (
          <View style={styles.alert}>
            <Text style={styles.alertText}>{message}</Text>
          </View>
        ) : null}
        <CustomInput
          label="Nama lokasi"
          placeholder="mis. Rumah, Kantor, Taman Kota"
          value={values.name}
          onChangeText={handleChange("name")}
          error={errors.name}
          maxLength={NAME_MAX + 20}
        />
        <CustomInput
          label="Latitude"
          placeholder="-6.8915"
          value={values.lat}
          onChangeText={handleChange("lat")}
          error={errors.lat}
          keyboardType="numbers-and-punctuation"
        />
        <CustomInput
          label="Longitude"
          placeholder="107.6107"
          value={values.lon}
          onChangeText={handleChange("lon")}
          error={errors.lon}
          keyboardType="numbers-and-punctuation"
          hint="Atau isi otomatis dari GPS dengan tombol di bawah."
        />
        <Button title="Pakai lokasi saat ini" variant="outline" onPress={pakaiLokasiSaatIni} loading={locating} disabled={saving} />
        <View style={styles.gap} />
        <Button title="Simpan Lokasi" onPress={handleSubmit(simpan)} loading={saving} disabled={locating} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 16, paddingBottom: 40 },
  alert: { backgroundColor: COLORS.warningBg, borderRadius: 10, padding: 12, marginBottom: 14 },
  alertText: { color: COLORS.warningText, lineHeight: 20 },
  gap: { height: 12 },
});
