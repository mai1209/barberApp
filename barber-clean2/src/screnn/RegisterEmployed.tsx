import React, { useMemo, useState, useEffect } from 'react';
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
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { createBarber } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

type Props = {
  navigation: any;
};

const DAYS_OF_WEEK = [
  { id: 0, label: 'D' },
  { id: 1, label: 'L' },
  { id: 2, label: 'M' },
  { id: 3, label: 'X' },
  { id: 4, label: 'J' },
  { id: 5, label: 'V' },
  { id: 6, label: 'S' },
];

type ActivePicker =
  | 'start'
  | 'end'
  | 'morningStart'
  | 'morningEnd'
  | 'afternoonStart'
  | 'afternoonEnd'
  | null;

function RegisterEmployed({ navigation }: Props) {
  const { theme } = useTheme();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Horario corrido
  const [startMinutes, setStartMinutes] = useState(9 * 60);
  const [endMinutes, setEndMinutes] = useState(17 * 60);

  // Turno cortado
  const [splitShift, setSplitShift] = useState(false);
  const [morningStart, setMorningStart] = useState(8 * 60);
  const [morningEnd, setMorningEnd] = useState(12 * 60);
  const [afternoonStart, setAfternoonStart] = useState(16 * 60);
  const [afternoonEnd, setAfternoonEnd] = useState(22 * 60);

  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const toggleDay = (id: number) => {
    setSelectedDays(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id],
    );
  };

  const formattedRange = useMemo(
    () => `${formatMinutes(startMinutes)} - ${formatMinutes(endMinutes)}`,
    [startMinutes, endMinutes],
  );

  // Título dinámico del picker
  const pickerTitle = useMemo(() => {
    switch (activePicker) {
      case 'start':
        return 'Horario de inicio';
      case 'end':
        return 'Horario de fin';
      case 'morningStart':
        return 'Mañana — Inicio';
      case 'morningEnd':
        return 'Mañana — Fin';
      case 'afternoonStart':
        return 'Tarde — Inicio';
      case 'afternoonEnd':
        return 'Tarde — Fin';
      default:
        return '';
    }
  }, [activePicker]);

  // Valor inicial del picker
  const pickerInitialValue = useMemo(() => {
    switch (activePicker) {
      case 'start':
        return startMinutes;
      case 'end':
        return endMinutes;
      case 'morningStart':
        return morningStart;
      case 'morningEnd':
        return morningEnd;
      case 'afternoonStart':
        return afternoonStart;
      case 'afternoonEnd':
        return afternoonEnd;
      default:
        return 0;
    }
  }, [
    activePicker,
    startMinutes,
    endMinutes,
    morningStart,
    morningEnd,
    afternoonStart,
    afternoonEnd,
  ]);

  const handlePickerConfirm = (minutes: number) => {
    switch (activePicker) {
      case 'start':
        setStartMinutes(minutes);
        break;
      case 'end':
        setEndMinutes(minutes);
        break;
      case 'morningStart':
        setMorningStart(minutes);
        break;
      case 'morningEnd':
        setMorningEnd(minutes);
        break;
      case 'afternoonStart':
        setAfternoonStart(minutes);
        break;
      case 'afternoonEnd':
        setAfternoonEnd(minutes);
        break;
    }
    setActivePicker(null);
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Dato requerido', 'Por favor ingresa el nombre del barbero.');
      return;
    }
    if (selectedDays.length === 0) {
      Alert.alert('Dato requerido', 'Selecciona al menos un día de trabajo.');
      return;
    }

    try {
      setLoading(true);
      const cleanDays = Array.from(new Set(selectedDays)).sort((a, b) => a - b);

      const payload = {
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        scheduleRange: !splitShift ? formattedRange : undefined,
        scheduleRanges: splitShift
          ? [
              {
                label: 'mañana',
                start: formatMinutes(morningStart),
                end: formatMinutes(morningEnd),
              },
              {
                label: 'tarde',
                start: formatMinutes(afternoonStart),
                end: formatMinutes(afternoonEnd),
              },
            ]
          : [],
        workDays: cleanDays,
        isActive: true,
      };

      await createBarber(payload);

      Alert.alert('¡Éxito!', 'Nuevo barbero registrado.', [
        {
          text: 'Ver lista',
          onPress: () => navigation.navigate('List-Barber'),
        },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.header}>
              <Text style={styles.headerSubtitle}>ADMINISTRACIÓN</Text>
              <Text style={styles.headerTitle}>Nuevo Barbero</Text>
            </View>

            <View style={styles.mainCard}>
              {/* INFO PERSONAL */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Información Personal</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'name' && styles.inputFocused,
                  ]}
                  placeholder="Nombre y Apellido"
                  placeholderTextColor="#666"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                />
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'email' && styles.inputFocused,
                  ]}
                  placeholder="Email"
                  placeholderTextColor="#666"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                />
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'phone' && styles.inputFocused,
                  ]}
                  placeholder="Tu Teléfono (WhatsApp)"
                  placeholderTextColor="#666"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={text =>
                    setPhone(text.replace(/[^0-9+\s\-]/g, ''))
                  }
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>

              {/* DÍAS */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Días de atención</Text>
                <View style={styles.daysRow}>
                  {DAYS_OF_WEEK.map(day => {
                    const active = selectedDays.includes(day.id);
                    return (
                      <Pressable
                        key={day.id}
                        onPress={() => toggleDay(day.id)}
                        style={[
                          styles.dayCircle,
                          active && styles.dayCircleActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            active && styles.dayTextActive,
                          ]}
                        >
                          {day.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* RANGO HORARIO */}
              <View style={styles.section}>
                {/* Header con toggle */}
                <View style={styles.shiftHeader}>
                  <Text style={styles.sectionLabel}>Rango horario</Text>
                  <Pressable
                    style={[
                      styles.splitToggle,
                      splitShift && styles.splitToggleActive,
                    ]}
                    onPress={() => setSplitShift(prev => !prev)}
                  >
                    <Text
                      style={[
                        styles.splitToggleText,
                        splitShift && styles.splitToggleTextActive,
                      ]}
                    >
                      ✂️ Doble Jornada
                    </Text>
                  </Pressable>
                </View>

                {!splitShift ? (
                  // HORARIO CORRIDO
                  <View style={styles.timeRow}>
                    <Pressable
                      style={styles.timeCard}
                      onPress={() => setActivePicker('start')}
                    >
                      <Text style={styles.timeLabel}>Inicio</Text>
                      <Text style={styles.timeValue}>
                        {formatMinutesAmPm(startMinutes)}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.timeCard}
                      onPress={() => setActivePicker('end')}
                    >
                      <Text style={styles.timeLabel}>Fin</Text>
                      <Text style={styles.timeValue}>
                        {formatMinutesAmPm(endMinutes)}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  // TURNO CORTADO
                  <>
                    <View style={styles.shiftBlock}>
                      <Text style={styles.shiftLabel}>☀️ Mañana</Text>
                      <View style={styles.timeRow}>
                        <Pressable
                          style={styles.timeCard}
                          onPress={() => setActivePicker('morningStart')}
                        >
                          <Text style={styles.timeLabel}>Inicio</Text>
                          <Text style={styles.timeValue}>
                            {formatMinutesAmPm(morningStart)}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.timeCard}
                          onPress={() => setActivePicker('morningEnd')}
                        >
                          <Text style={styles.timeLabel}>Fin</Text>
                          <Text style={styles.timeValue}>
                            {formatMinutesAmPm(morningEnd)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.shiftDivider} />

                    <View style={styles.shiftBlock}>
                      <Text style={styles.shiftLabel}>🌙 Tarde</Text>
                      <View style={styles.timeRow}>
                        <Pressable
                          style={styles.timeCard}
                          onPress={() => setActivePicker('afternoonStart')}
                        >
                          <Text style={styles.timeLabel}>Inicio</Text>
                          <Text style={styles.timeValue}>
                            {formatMinutesAmPm(afternoonStart)}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={styles.timeCard}
                          onPress={() => setActivePicker('afternoonEnd')}
                        >
                          <Text style={styles.timeLabel}>Fin</Text>
                          <Text style={styles.timeValue}>
                            {formatMinutesAmPm(afternoonEnd)}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </>
                )}
              </View>

              {/* SUBMIT */}
              <View style={{ marginTop: 10 }}>
                <Pressable
                  onPress={handleSubmit}
                  style={styles.submitBtn}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Registrar Barbero</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <TimeSelectModal
        visible={!!activePicker}
        title={pickerTitle}
        initialValueMinutes={pickerInitialValue}
        onClose={() => setActivePicker(null)}
        onConfirm={handlePickerConfirm}
        theme={theme}
        styles={styles}
      />
    </>
  );
}

function TimeSelectModal({
  visible,
  title,
  initialValueMinutes,
  onConfirm,
  onClose,
  theme,
  styles,
}: any) {
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const HOURS = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const MINUTES = useMemo(() => [0, 15, 30, 45], []);

  useEffect(() => {
    if (!visible) return;
    const parts = minutesToPickerParts(initialValueMinutes);
    setPeriod(parts.period);
    setHour(parts.hour);
    setMinute(parts.minute);
  }, [visible, initialValueMinutes]);

  return (
    <Modal transparent visible={visible} animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose}>
              <Text style={{ color: theme.primary, fontWeight: 'bold' }}>
                CERRAR
              </Text>
            </Pressable>
          </View>
          <View style={styles.timePickerSummary}>
            <Text style={styles.timePickerSummaryLabel}>Horario elegido</Text>
            <Text style={styles.timePickerSummaryValue}>
              {formatMinutesAmPm(
                pickerPartsToMinutes({ period, hour, minute }),
              )}
            </Text>
          </View>

          <View style={styles.timePickerSection}>
            <Text style={styles.timePickerSectionTitle}>Periodo</Text>
            <View style={styles.periodRow}>
              {(['AM', 'PM'] as const).map(item => (
                <Pressable
                  key={item}
                  onPress={() => setPeriod(item)}
                  style={[
                    styles.periodChip,
                    period === item && styles.periodChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      period === item && styles.periodChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.timePickerSection}>
            <Text style={styles.timePickerSectionTitle}>Hora</Text>
            <View style={styles.pickerGrid}>
              {HOURS.map(item => (
                <Pressable
                  key={item}
                  onPress={() => setHour(item)}
                  style={[
                    styles.pickerChip,
                    hour === item && styles.pickerChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      hour === item && styles.pickerChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.timePickerSection}>
            <Text style={styles.timePickerSectionTitle}>Minutos</Text>
            <View style={styles.pickerGrid}>
              {MINUTES.map(item => (
                <Pressable
                  key={item}
                  onPress={() => setMinute(item)}
                  style={[
                    styles.pickerChip,
                    minute === item && styles.pickerChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      minute === item && styles.pickerChipTextActive,
                    ]}
                  >
                    {String(item).padStart(2, '0')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.modalActions}>
            <Pressable
              style={styles.modalBtn}
              onPress={() =>
                onConfirm(pickerPartsToMinutes({ period, hour, minute }))
              }
            >
              <Text style={styles.modalBtnText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function formatMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
    2,
    '0',
  )}`;
}

function formatMinutesAmPm(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
}

function minutesToPickerParts(totalMinutes: number) {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return {
    period: hours24 >= 12 ? 'PM' : 'AM',
    hour: hours24 % 12 || 12,
    minute: minutes,
  };
}

function pickerPartsToMinutes({
  period,
  hour,
  minute,
}: {
  period: 'AM' | 'PM';
  hour: number;
  minute: number;
}) {
  const normalizedHour = hour % 12;
  const hours24 = period === 'PM' ? normalizedHour + 12 : normalizedHour;
  return hours24 * 60 + minute;
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scrollContent: {
      paddingBottom: 130,
      paddingTop: Platform.OS === 'ios' ? 20 : 0,
    },
    header: {
      marginTop: 50,
      paddingHorizontal: 25,
      alignItems: 'center',
      marginBottom: 20,
    },
    headerSubtitle: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 2,
    },
    headerTitle: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 5 },
    mainCard: {
      marginHorizontal: 15,
      backgroundColor: theme.card,
      borderRadius: 32,
      padding: 24,
      gap: 20,
      borderWidth: 1,
      borderColor: '#252525',
    },
    section: { gap: 12 },
    sectionLabel: {
      color: '#666',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginLeft: 4,
    },
    input: {
      backgroundColor: '#252525',
      borderRadius: 16,
      padding: 16,
      color: '#fff',
      fontSize: 16,
      borderWidth: 1,
      borderColor: '#333',
    },
    inputFocused: { borderColor: theme.primary },
    daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dayCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: '#252525',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#333',
    },
    dayCircleActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    dayText: { color: '#888', fontSize: 13, fontWeight: '700' },
    dayTextActive: { color: '#fff' },
    timeRow: { flexDirection: 'row', gap: 12 },
    timeCard: {
      flex: 1,
      backgroundColor: '#252525',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#333',
    },
    timeLabel: { color: '#888', fontSize: 11, textTransform: 'uppercase' },
    timeValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 4 },

    // TURNO CORTADO
    shiftHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    splitToggle: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 12,
      backgroundColor: '#252525',
      borderWidth: 1,
      borderColor: '#333',
    },
    splitToggleActive: {
      backgroundColor: hexToRgba(theme.primary, 0.15),
      borderColor: theme.primary,
    },
    splitToggleText: { color: '#666', fontSize: 12, fontWeight: '700' },
    splitToggleTextActive: { color: theme.primary },
    shiftBlock: { gap: 8 },
    shiftLabel: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    shiftDivider: { height: 1, backgroundColor: '#252525', marginVertical: 4 },

    submitBtn: {
      backgroundColor: theme.primary,
      borderRadius: 20,
      paddingVertical: 18,
      alignItems: 'center',
    },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.9)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: theme.card,
      borderTopLeftRadius: 32,
      borderTopRightRadius: 32,
      padding: 24,
      minHeight: 450,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
    timePickerSummary: {
      backgroundColor: '#252525',
      borderRadius: 20,
      paddingVertical: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      marginBottom: 16,
    },
    timePickerSummaryLabel: {
      color: '#8A8A8A',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    timePickerSummaryValue: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '900',
      marginTop: 6,
    },
    timePickerSection: {
      marginTop: 10,
    },
    timePickerSectionTitle: {
      color: '#A0A0A0',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 10,
    },
    periodRow: {
      flexDirection: 'row',
      gap: 10,
    },
    periodChip: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: '#252525',
      borderWidth: 1,
      borderColor: '#333',
      alignItems: 'center',
    },
    periodChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    periodChipText: {
      color: '#C0C0C0',
      fontSize: 18,
      fontWeight: '800',
    },
    periodChipTextActive: {
      color: '#fff',
    },
    pickerGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    pickerChip: {
      width: '22%',
      paddingVertical: 14,
      borderRadius: 16,
      backgroundColor: '#252525',
      borderWidth: 1,
      borderColor: '#333',
      alignItems: 'center',
    },
    pickerChipActive: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    pickerChipText: {
      color: '#C0C0C0',
      fontSize: 18,
      fontWeight: '800',
    },
    pickerChipTextActive: {
      color: '#fff',
    },
    modalActions: { marginTop: 25 },
    modalBtn: {
      paddingVertical: 16,
      backgroundColor: theme.primary,
      borderRadius: 16,
      alignItems: 'center',
    },
    modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  });

export default RegisterEmployed;
