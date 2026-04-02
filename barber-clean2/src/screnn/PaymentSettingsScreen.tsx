import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  getCurrentUser,
  updatePaymentSettings,
  type PaymentSettings,
} from '../services/api';
import { saveUserProfile } from '../services/authStorage';
import { useTheme } from '../context/ThemeContext'; // Importamos el hook

type FormState = {
  cashEnabled: boolean;
  advancePaymentEnabled: boolean;
  advanceMode: 'deposit' | 'full';
  advanceType: 'percent' | 'fixed';
  advanceValue: string;
  mercadoPagoConnectionStatus: 'disconnected' | 'pending' | 'connected';
};

const DEFAULT_FORM: FormState = {
  cashEnabled: true,
  advancePaymentEnabled: false,
  advanceMode: 'deposit',
  advanceType: 'percent',
  advanceValue: '30',
  mercadoPagoConnectionStatus: 'disconnected',
};

function normalizeFormFromUser(user: any): FormState {
  const settings = user?.paymentSettings ?? {};
  return {
    cashEnabled: settings.cashEnabled !== false,
    advancePaymentEnabled: Boolean(settings.advancePaymentEnabled),
    advanceMode: settings.advanceMode === 'full' ? 'full' : 'deposit',
    advanceType: settings.advanceType === 'fixed' ? 'fixed' : 'percent',
    advanceValue: String(settings.advanceValue ?? 30),
    mercadoPagoConnectionStatus:
      settings.mercadoPagoConnectionStatus === 'connected'
        ? 'connected'
        : settings.mercadoPagoConnectionStatus === 'pending'
          ? 'pending'
          : 'disconnected',
  };
}

export default function PaymentSettingsScreen() {
  const { theme } = useTheme(); // Obtenemos el tema dinámico
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getCurrentUser();
      setForm(normalizeFormFromUser(response.user));
    } catch (err: any) {
      setError(err?.message ?? 'No pudimos cargar la configuración de cobros.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings]),
  );

  const advanceHelper = useMemo(() => {
    if (!form.advancePaymentEnabled) return 'El cliente solo ve pago en el local.';
    if (form.mercadoPagoConnectionStatus !== 'connected') return 'Para mostrar la seña online, conectá Mercado Pago.';
    if (form.advanceMode === 'full') return 'El cliente paga el turno completo antes de confirmar.';
    return form.advanceType === 'fixed'
      ? `El cliente paga ${form.advanceValue || '0'} pesos por adelantado.`
      : `El cliente paga ${form.advanceValue || '0'}% por adelantado.`;
  }, [form]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      const parsedAdvanceValue = Number(form.advanceValue);
      if (!Number.isFinite(parsedAdvanceValue) || parsedAdvanceValue < 0) {
        Alert.alert('Valor inválido', 'Revisá el monto o porcentaje del adelanto.');
        return;
      }

      const payload: PaymentSettings = {
        cashEnabled: form.cashEnabled,
        advancePaymentEnabled: form.advancePaymentEnabled,
        advanceMode: form.advanceMode,
        advanceType: form.advanceType,
        advanceValue: parsedAdvanceValue,
        mercadoPagoConnectionStatus: form.mercadoPagoConnectionStatus,
      };

      const response = await updatePaymentSettings(payload);
      await saveUserProfile(response.user);
      setForm(normalizeFormFromUser(response.user));
      Alert.alert('Listo', 'Configuración guardada.');
    } catch (err: any) {
      setError(err?.message ?? 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Cobros</Text>
        <Text style={styles.subtitle}>Elegí cómo querés que tus clientes paguen sus turnos.</Text>
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.card}>
        <RowSwitch
          label="Aceptar efectivo"
          description="Pago presencial en el local."
          value={form.cashEnabled}
          onValueChange={v => setForm(c => ({ ...c, cashEnabled: v }))}
          theme={theme}
        />
        <View style={styles.separator} />
        <RowSwitch
          label="Aceptar seña online"
          description="Cobro adelantado vía Mercado Pago."
          value={form.advancePaymentEnabled}
          onValueChange={v => setForm(c => ({ ...c, advancePaymentEnabled: v }))}
          theme={theme}
        />

        {form.advancePaymentEnabled && (
          <View style={styles.nestedBlock}>
            <Text style={styles.blockLabel}>Modo de cobro</Text>
            <View style={styles.segmentRow}>
              <SegmentButton label="Seña" active={form.advanceMode === 'deposit'} onPress={() => setForm(c => ({ ...c, advanceMode: 'deposit' }))} theme={theme} />
              <SegmentButton label="Total" active={form.advanceMode === 'full'} onPress={() => setForm(c => ({ ...c, advanceMode: 'full' }))} theme={theme} />
            </View>

            {form.advanceMode === 'deposit' && (
              <>
                <Text style={styles.blockLabel}>Tipo de seña</Text>
                <View style={styles.segmentRow}>
                  <SegmentButton label="Porcentaje" active={form.advanceType === 'percent'} onPress={() => setForm(c => ({ ...c, advanceType: 'percent' }))} theme={theme} />
                  <SegmentButton label="Fijo" active={form.advanceType === 'fixed'} onPress={() => setForm(c => ({ ...c, advanceType: 'fixed' }))} theme={theme} />
                </View>
                <TextInput
                  style={[styles.input, { borderColor: theme.primary + '44' }]}
                  keyboardType="numeric"
                  value={form.advanceValue}
                  onChangeText={v => setForm(c => ({ ...c, advanceValue: v.replace(/[^0-9.]/g, '') }))}
                  placeholderTextColor="#666"
                />
              </>
            )}
            <Text style={styles.helpText}>{advanceHelper}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mercado Pago</Text>
        <View style={styles.segmentRow}>
          <SegmentButton label="Off" active={form.mercadoPagoConnectionStatus === 'disconnected'} onPress={() => setForm(c => ({ ...c, mercadoPagoConnectionStatus: 'disconnected' }))} theme={theme} />
          <SegmentButton label="Pendiente" active={form.mercadoPagoConnectionStatus === 'pending'} onPress={() => setForm(c => ({ ...c, mercadoPagoConnectionStatus: 'pending' }))} theme={theme} />
          <SegmentButton label="Listo" active={form.mercadoPagoConnectionStatus === 'connected'} onPress={() => setForm(c => ({ ...c, mercadoPagoConnectionStatus: 'connected' }))} theme={theme} />
        </View>
      </View>

      <Pressable
        style={[styles.saveButton, { backgroundColor: theme.primary }, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar cobros'}</Text>
      </Pressable>
    </ScrollView>
  );
}

// Sub-componentes con Theme
function RowSwitch({ label, description, value, onValueChange, theme }: any) {
  return (
    <View style={styles.rowSwitch}>
      <View style={styles.rowSwitchBody}>
        <Text style={styles.rowSwitchLabel}>{label}</Text>
        <Text style={styles.rowSwitchDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#323640', true: theme.primary + '66' }}
        thumbColor={value ? theme.primary : '#F4F4F5'}
      />
    </View>
  );
}

function SegmentButton({ label, active, onPress, theme }: any) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.segmentButton,
        active && { backgroundColor: theme.primary + '22', borderColor: theme.primary }
      ]}
    >
      <Text style={[styles.segmentButtonText, active && { color: theme.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#121212' },
  scrollContent: { paddingTop: Platform.OS === 'ios' ? 72 : 28, paddingHorizontal: 20, paddingBottom: 140 },
  loadingWrap: { flex: 1, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center' },
  header: { marginBottom: 18 },
  title: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  subtitle: { color: '#98A2B3', fontSize: 14, marginTop: 6 },
  errorText: { color: '#FF8D8D', fontSize: 13, marginBottom: 12 },
  card: { backgroundColor: '#1C1C1C', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(110, 117, 133, 0.24)', padding: 16, marginBottom: 18 },
  rowSwitch: { flexDirection: 'row', alignItems: 'center' },
  rowSwitchBody: { flex: 1 },
  rowSwitchLabel: { color: '#F5F7FB', fontSize: 16, fontWeight: '700' },
  rowSwitchDescription: { color: '#95A0B5', fontSize: 12, marginTop: 4 },
  separator: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 16 },
  nestedBlock: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  blockLabel: { color: '#D8DFEA', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 10 },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  segmentButton: { minHeight: 40, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, borderColor: '#343948', backgroundColor: '#111317', alignItems: 'center', justifyContent: 'center' },
  segmentButtonText: { color: '#A9B1BF', fontSize: 13, fontWeight: '700' },
  input: { height: 48, borderRadius: 12, borderWidth: 1, backgroundColor: '#111317', paddingHorizontal: 14, color: '#FFFFFF', marginBottom: 12 },
  helpText: { color: '#95A0B5', fontSize: 12 },
  sectionTitle: { color: '#F5F7FB', fontSize: 16, fontWeight: '700', marginBottom: 14 },
  saveButton: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});