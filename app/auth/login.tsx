import { useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { StyleSheet } from "react-native";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import { useAuth } from "@/hooks/use-auth";

export default function LoginScreen() {
  const router = useRouter();
  const colors = useColors();
  const { refresh: refreshAuth } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!firstName || !lastName || !password) {
      setError("Ad, soyad ve şifre gerekli");
      return;
    }

    setLoading(true);
    setError("");

    try {
      console.log("[Login] Giriş yapılıyor:", { firstName, lastName });

      // Backend API'sini çağır
      const result = await Api.login(firstName, lastName, password);
      console.log("[Login] API response:", {
        hasSessionToken: !!result.sessionToken,
        hasUser: !!result.user,
      });

      if (result.sessionToken) {
        console.log("[Login] Session token received, storing...");
        // Store session token
        await Auth.setSessionToken(result.sessionToken);
        console.log("[Login] Session token stored successfully");

        // Store user info if available
        if (result.user) {
          console.log("[Login] User data received:", result.user);
          const userInfo: Auth.User = {
            id: result.user.id,
            openId: result.user.openId || result.user.email,
            name: result.user.name,
            email: result.user.email,
            loginMethod: result.user.loginMethod,
            lastSignedIn: new Date(result.user.lastSignedIn || Date.now()),
          };
          await Auth.setUserInfo(userInfo);
          console.log("[Login] User info stored:", userInfo);
        }

        console.log("[Login] Authentication successful, refreshing auth state...");
        // Refresh auth state to update isAuthenticated
        await refreshAuth();
        console.log("[Login] Auth state refreshed, redirecting to home...");
        // Redirect to home after a short delay
        setTimeout(() => {
          console.log("[Login] Executing redirect...");
          router.replace("/(tabs)");
        }, 500);
      } else {
        setError("Giriş başarısız oldu. Lütfen tekrar deneyin.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Giriş başarısız oldu. Lütfen tekrar deneyin.";
      setError(errorMessage);
      console.error("[Login] Error:", err);
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
            <Text style={[styles.title, { color: colors.foreground }]}>Karo Numune Takip</Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Giriş Yapın</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* First Name Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Ad</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Adınızı girin"
                placeholderTextColor={colors.muted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Last Name Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Soyad</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Soyadınızı girin"
                placeholderTextColor={colors.muted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                editable={!loading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Şifre</Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, color: colors.foreground }]}
                placeholder="Şifrenizi girin"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!loading}
              />
            </View>

            {/* Error Message */}
            {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}

            {/* Login Button */}
            <Pressable
              onPress={handleLogin}
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
                <Text style={[styles.buttonText, { color: colors.background }]}>Giriş Yap</Text>
              )}
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
});
