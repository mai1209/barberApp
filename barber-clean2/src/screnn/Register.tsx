import React, { useState } from 'react';
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
  Alert,
} from 'react-native';

import { registerUser } from '../services/api';

function Register({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados para visibilidad de contraseñas
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    if (loading) return;

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await registerUser({ fullName, email, password });

      Alert.alert('¡Éxito!', 'Cuenta creada correctamente.', [
        { text: 'Ir al login', onPress: () => navigation.navigate('Login') },
      ]);
    } catch (err: any) {
      setError(err.message || 'Error al registrarse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <Image style={styles.logo} source={require('../assets/logo.png')} />
            <Text style={styles.headerSubtitle}>ÚNETE A</Text>
            <Text style={styles.headerTitle}>BarberApp</Text>
          </View>
          <View style={styles.registerCard}>
            <Text style={styles.instructionText}>
              Crea tu cuenta de administrador
            </Text>

            {/* Nombre */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Nombre Completo</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused,
                ]}
                placeholder="Tu nombre"
                placeholderTextColor="#555"
                value={fullName}
                onChangeText={setFullName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Email */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                placeholder="ejemplo@correo.com"
                placeholderTextColor="#555"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contraseña</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'pass' && styles.inputFocused,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#555"
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('pass')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  onPress={() => setShowPass(!showPass)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>{showPass ? '👁️' : '👁️‍🗨️'}</Text>
                </Pressable>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Repetir Contraseña</Text>
              <View style={styles.passwordWrapper}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'confirm' && styles.inputFocused,
                  ]}
                  placeholder="••••••••"
                  placeholderTextColor="#555"
                  secureTextEntry={!showConfirmPass}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirm')}
                  onBlur={() => setFocusedField(null)}
                />
                <Pressable
                  onPress={() => setShowConfirmPass(!showConfirmPass)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>
                    {showConfirmPass ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.registerBtn, loading && { opacity: 0.7 }]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.registerBtnText}>Crear Cuenta</Text>
              )}
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Login')}
              style={styles.loginLink}
            >
              <Text style={styles.loginLinkText}>
                ¿Ya tienes cuenta?{' '}
                <Text style={styles.loginLinkBold}>Inicia sesión</Text>
              </Text>
            </Pressable>
          </View>
          <Text style={styles.codexText}>BarberApp by CODEX®</Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { paddingBottom: 50 },

  header: { marginTop: 60, alignItems: 'center', marginBottom: 30 },
  logo: { width: 70, height: 70, marginBottom: 15, resizeMode: 'contain' },
  headerSubtitle: {
    color: '#FF1493',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 3,
  },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '800' },

  registerCard: {
    marginHorizontal: 20,
    backgroundColor: '#1C1C1C',
    borderRadius: 30,
    padding: 22,
    borderWidth: 1,
    borderColor: '#252525',
  },
  instructionText: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 14,
  },

  inputContainer: { marginBottom: 12 },
  inputLabel: {
    color: '#666',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#252525',
    borderRadius: 14,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputFocused: { borderColor: '#FF1493' },

  passwordWrapper: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: {
    position: 'absolute',
    right: 15,
    top: 12,
    height: 30,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: 18 },

  registerBtn: {
    backgroundColor: '#FF1493',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 15,
  },
  registerBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  loginLink: { marginTop: 20, alignItems: 'center' },
  loginLinkText: { color: '#666', fontSize: 13 },
  loginLinkBold: { color: '#fff', fontWeight: '700' },

  errorText: {
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '600',
  },
  codexText: {
    color: '#333',
    textAlign: 'center',
    marginTop: 25,
    fontSize: 11,
    fontWeight: '700',
  },
});

export default Register;
