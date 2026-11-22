import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomInput from "../components/CustomInput";
import Button from "../components/Button";
import useForm from "../hooks/useForm";
import { validateLogin } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import { friendlyMessage, fieldErrors } from "../services/ApiService";
import { COLORS } from "../theme/colors";

const AWAL = { email: "", password: "" };

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, continueAsGuest } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { values, errors, setErrors, handleChange, handleSubmit } = useForm(AWAL, validateLogin);

  const onChange = (field) => (text) => {
    setServerError(null);
    handleChange(field)(text);
  };

  const kirim = async ({ email, password }) => {
    setLoading(true);
    setServerError(null);
    try {
      await login(email, password);
    } catch (e) {
      setErrors(fieldErrors(e));
      setServerError(friendlyMessage(e));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brand}>
          <Ionicons name="leaf" size={56} color={COLORS.primary} />
          <Text style={styles.title}>JamHijau</Text>
          <Text style={styles.subtitle}>Kapan aman beraktivitas di luar ruangan?</Text>
        </View>

        <Text style={styles.heading}>Masuk</Text>
        {serverError ? (
          <View style={styles.alert} testID="login-error">
            <Text style={styles.alertText}>{serverError}</Text>
          </View>
        ) : null}
        <CustomInput
          label="Email"
          icon="mail-outline"
          placeholder="nama@contoh.com"
          value={values.email}
          onChangeText={onChange("email")}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          editable={!loading}
        />
        <CustomInput
          label="Password"
          icon="lock-closed-outline"
          placeholder="Password"
          value={values.password}
          onChangeText={onChange("password")}
          error={errors.password}
          secureTextEntry
          autoComplete="password"
          editable={!loading}
        />
        <Button title="Masuk" onPress={handleSubmit(kirim)} loading={loading} />
        <View style={styles.gap} />
        <Button
          title="Belum punya akun? Daftar"
          variant="outline"
          onPress={() => navigation.navigate("Register")}
          disabled={loading}
        />
        <View style={styles.divider} />
        <Button title="Lanjut sebagai tamu" variant="outline" onPress={continueAsGuest} disabled={loading} />
        <Text style={styles.note}>Tamu bisa memakai Cek Risiko. Lokasi, rencana, dan profil butuh akun.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  brand: { alignItems: "center", marginBottom: 28 },
  title: { fontSize: 30, fontWeight: "bold", color: COLORS.primary, marginTop: 6 },
  subtitle: { color: COLORS.muted, marginTop: 4, textAlign: "center" },
  heading: { fontSize: 22, fontWeight: "bold", color: COLORS.text, marginBottom: 12 },
  alert: { backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginBottom: 14 },
  alertText: { color: COLORS.danger, lineHeight: 20 },
  gap: { height: 12 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 20 },
  note: { color: COLORS.muted, fontSize: 13, textAlign: "center", marginTop: 10 },
});
