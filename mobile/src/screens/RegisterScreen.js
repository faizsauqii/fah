import { useState } from "react";
import { View, Text, ScrollView, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import HeaderBar from "../components/HeaderBar";
import CustomInput from "../components/CustomInput";
import Button from "../components/Button";
import useForm from "../hooks/useForm";
import { validateRegister, NAME_MAX, PASSWORD_MIN } from "../utils/validators";
import { useAuth } from "../context/AuthContext";
import { friendlyMessage, fieldErrors } from "../services/ApiService";
import { COLORS } from "../theme/colors";

const AWAL = { name: "", email: "", password: "", confirm: "" };

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState(null);
  const { values, errors, setErrors, handleChange, handleSubmit } = useForm(AWAL, validateRegister);

  const onChange = (field) => (text) => {
    setServerError(null);
    handleChange(field)(text);
  };

  const kirim = async ({ name, email, password }) => {
    setLoading(true);
    setServerError(null);
    try {
      await register(name, email, password);
    } catch (e) {
      const perField = fieldErrors(e);
      if (e?.code === "CONFLICT") perField.email = "Email sudah terdaftar. Silakan masuk.";
      setErrors(perField);
      setServerError(friendlyMessage(e));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <HeaderBar title="Daftar Akun" subtitle="Simpan profil, lokasi, dan rencana" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        {serverError ? (
          <View style={styles.alert} testID="register-error">
            <Text style={styles.alertText}>{serverError}</Text>
          </View>
        ) : null}
        <CustomInput
          label="Nama"
          placeholder="Nama lengkap"
          value={values.name}
          onChangeText={onChange("name")}
          error={errors.name}
          maxLength={NAME_MAX + 20}
          editable={!loading}
        />
        <CustomInput
          label="Email"
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
          placeholder={`Minimal ${PASSWORD_MIN} karakter`}
          value={values.password}
          onChangeText={onChange("password")}
          error={errors.password}
          secureTextEntry
          autoComplete="new-password"
          editable={!loading}
        />
        <CustomInput
          label="Ulangi Password"
          value={values.confirm}
          onChangeText={onChange("confirm")}
          error={errors.confirm}
          secureTextEntry
          editable={!loading}
        />
        <Button title="Daftar" onPress={handleSubmit(kirim)} loading={loading} />
        <View style={styles.gap} />
        <Button title="Sudah punya akun? Masuk" variant="outline" onPress={() => navigation.goBack()} disabled={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  form: { padding: 16, paddingBottom: 40 },
  alert: { backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, marginBottom: 14 },
  alertText: { color: COLORS.danger, lineHeight: 20 },
  gap: { height: 12 },
});
