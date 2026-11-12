import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { StyleSheet } from "react-native";

type Step = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useColors();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendCode = async () => {
    if (!email) {
      setError("Email gerekli");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // TODO: Backend şifre sıfırlama kodu gönderme API'si çağrısı yapılacak
      console.log("Şifre sıfırlama kodu gönderiliyor:", email);
      setSuccess("Şifre sıfırlama kodu email adresinize gönderildi");
      setStep("code");
    } catch (err) {
      setError("Kod gönderilemedi. Lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code) {
      setError("Kod gerekli");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // TODO: Backend kod doğrulama API'si çağrısı yapılacak
      console.log("Kod doğrulanıyor:", code);
      setSuccess("Kod doğrulandı");
      setStep("password");
    } catch (err) {
      setError("Kod doğrulanamadı. Lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError("Tüm alanlar gerekli");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    if (newPassword.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // TODO: Backend şifre sıfırlama API'si çağrısı yapılacak
      console.log("Şifre sıfırlanıyor");
      setSuccess("Şifreniz başarıyla sıfırlandı");
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } catch (err) {
      setError("Şifre sıfırlanamadı. Lütfen tekrar deneyin.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Şifremi Unuttum</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>
              {step === "email" && "Email adresinizi girin"}
              {step === "code" && "Gönderilen kodu girin"}
              {step === "password" && "Yeni şifrenizi belirleyin"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email Step */}
            {step === "email" && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Email adresinizi girin"
                    placeholderTextColor={colors.muted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleSendCode}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.primary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>Kod Gönder</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Code Step */}
            {step === "code" && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Doğrulama Kodu</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Email'de gönderilen kodu girin"
                    placeholderTextColor={colors.muted}
                    value={code}
                    onChangeText={setCode}
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleVerifyCode}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.primary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>Kodu Doğrula</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Password Step */}
            {step === "password" && (
              <>
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Yeni Şifre</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Yeni şifrenizi girin"
                    placeholderTextColor={colors.muted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: colors.foreground }]}>Şifreyi Onayla</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Şifrenizi tekrar girin"
                    placeholderTextColor={colors.muted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    editable={!loading}
                  />
                </View>

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.button,
                    { backgroundColor: colors.primary },
                    pressed && styles.buttonPressed,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.buttonText, { color: colors.background }]}>Şifreyi Sıfırla</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Error Message */}
            {error && (
              <Text style={[styles.error, { color: colors.error }]}>{error}</Text>
            )}

            {/* Success Message */}
            {success && (
              <Text style={[styles.success, { color: colors.success }]}>{success}</Text>
            )}
          </View>

          {/* Back Link */}
          <View style={styles.footer}>
            <Pressable onPress={() => router.push("/auth/login")} disabled={loading}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>← Giriş Ekranına Dön</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    marginBottom: 40,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  error: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  success: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});
