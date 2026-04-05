import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
} from "react-native";

import { loginUser, savePushTokenApi } from "../services/api"; // Importado savePushTokenApi
import { saveToken, saveUserProfile } from "../services/authStorage";
import { resolvePostAuthRoute } from "../services/subscriptionAccess";
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importado
import { useTheme } from "../context/ThemeContext";
import type { Theme } from "../context/ThemeContext";

const AUTH_THEME = {
  primary: "#FF1493",
  card: "#1C1C1C",
  background: "#121212",
  logo: require("../assets/logo.png"),
} as const;

function Login({ navigation }: any) {
  const { applyUserTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (loading) return;
    if (!email || !password) {
      setError("Completa email y contraseña");
      return;
    }

    try {
      setLoading(true);
      setError("");
      
      // 1. Iniciar sesión y guardar datos básicos
      const res = await loginUser({ email, password });
      await saveToken(res.token);
      await saveUserProfile(res.user);
      applyUserTheme(res.user);

      // 2. Intentar guardar el Push Token en el Backend (incluye refresh recientes)
      try {
        const pToken = await AsyncStorage.getItem('@push_token');
        if (pToken) {
          await savePushTokenApi(pToken);
          console.log("✅ Push Token guardado en el servidor");
        }
      } catch (pushErr) {
        console.log("❌ Error guardando push token en server:", pushErr);
      }

      // 3. Ir al Home
      navigation.reset({
        index: 0,
        routes: [{ name: resolvePostAuthRoute(res.user) }],
      });
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  const styles = useMemo(() => createStyles(AUTH_THEME), []);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Image style={styles.logo} source={AUTH_THEME.logo} />
            <Text style={styles.headerSubtitle}>BIENVENIDO A</Text>
            <Text style={styles.headerTitle}>BarberApp</Text>
          </View>

          <View style={styles.loginCard}>
            <Text style={styles.instructionText}>Inicia sesión para continuar</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[styles.input, focusedField === "email" && styles.inputFocused]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[styles.input, styles.passwordInput, focusedField === "password" && styles.inputFocused]}
                  placeholder="••••••••"
                  placeholderTextColor="#555"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Text style={styles.eyeIcon}>{showPassword ? "👁️" : "👁️‍🗨️"}</Text>
                </Pressable>
              </View>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable 
              style={[styles.loginBtn, loading && { opacity: 0.7 }]} 
              onPress={handleLogin} 
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Entrar</Text>}
            </Pressable>

            <Pressable onPress={() => navigation.navigate("Register")} style={styles.registerBtn}>
              <Text style={styles.registerText}>
                ¿No tienes cuenta? <Text style={styles.registerTextBold}>Registrate</Text>
              </Text>
            </Pressable>
          </View>
          <Text style={styles.codexText}>BarberApp by CODEX®</Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: Theme | typeof AUTH_THEME) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 40 },
    header: { marginTop: 80, alignItems: "center", marginBottom: 40 },
    logo: { width: 90, height: 90, marginBottom: 15, resizeMode: "contain" },
    headerSubtitle: { color: theme.primary, fontSize: 12, fontWeight: "700", letterSpacing: 3 },
    headerTitle: { color: "#fff", fontSize: 36, fontWeight: "800" },
    loginCard: { marginHorizontal: 20, backgroundColor: theme.card, borderRadius: 32, padding: 25, borderWidth: 1, borderColor: "#252525", elevation: 10 },
    instructionText: { color: "#888", textAlign: "center", marginBottom: 25, fontSize: 14 },
    inputContainer: { marginBottom: 15 },
    inputLabel: { color: "#666", fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginBottom: 8, marginLeft: 5 },
    input: { backgroundColor: "#252525", borderRadius: 16, padding: 16, color: "#fff", fontSize: 16, borderWidth: 1, borderColor: "#333" },
    inputFocused: { borderColor: theme.primary },
    passwordWrapper: { position: "relative" },
    passwordInput: { paddingRight: 55 },
    eyeBtn: { position: "absolute", right: 15, top: 15, height: 30, justifyContent: "center" },
    eyeIcon: { fontSize: 20 },
    loginBtn: { backgroundColor: theme.primary, borderRadius: 20, paddingVertical: 18, alignItems: "center", marginTop: 10 },
    loginBtnText: { color: "#fff", fontSize: 18, fontWeight: "800" },
    registerBtn: { marginTop: 25, alignItems: "center" },
    registerText: { color: "#666", fontSize: 14 },
    registerTextBold: { color: "#fff", fontWeight: "700" },
    errorText: { color: "#ff6b6b", textAlign: "center", marginBottom: 15, fontWeight: "600" },
    codexText: { color: "#333", textAlign: "center", marginTop: 30, fontSize: 12, fontWeight: "bold", letterSpacing: 1 },
  });

export default Login;
