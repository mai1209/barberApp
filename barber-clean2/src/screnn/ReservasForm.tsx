import React, { useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  Pressable,
  View,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {
  fetchBarbers,
  Barber,
  createAppointment,
  fetchBarberAppointments,
  fetchServices,
  ServiceOption,
} from '../services/api';

const SHOP_TZ = 'America/Argentina/Cordoba';

function formatTimeInShopTZ(value: string | number | Date): string {
  const parts = new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: SHOP_TZ,
  }).formatToParts(new Date(value));
  const hh = parts.find(p => p.type === 'hour')?.value ?? '00';
  const mm = parts.find(p => p.type === 'minute')?.value ?? '00';
  return `${hh}:${mm}`;
}

const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
];

type SlotGroup = { label: string; slots: string[] };

function ReservasForm({ navigation }: any) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(
    null,
  );
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [resB, resS] = await Promise.all([
          fetchBarbers(),
          fetchServices(),
        ]);
        setBarbers(resB.barbers || []);
        setServices(resS.services || []);
        if (resB.barbers?.length > 0) setSelectedBarber(resB.barbers[0]._id);
        if (resS.services?.length > 0) setSelectedService(resS.services[0]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedBarber) return;
    async function loadBooked() {
      try {
        const dateStr = `${selectedDate.getFullYear()}-${String(
          selectedDate.getMonth() + 1,
        ).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
        const res = await fetchBarberAppointments(selectedBarber!, dateStr);
        const blocked: string[] = [];
        const blockStep = 30; // bloquear en intervalos de 30 min para todos los turnos
        res.appointments.forEach(a => {
          const label = formatTimeInShopTZ(a.startTime);
          const [h, m] = label.split(':').map(Number);
          const startMin = h * 60 + m;
          const occupiedDuration = a.durationMinutes || 30;
          for (let offset = 0; offset < occupiedDuration; offset += blockStep) {
            const blockMin = startMin + offset;
            blocked.push(
              `${String(Math.floor(blockMin / 60)).padStart(2, '0')}:${String(
                blockMin % 60,
              ).padStart(2, '0')}`,
            );
          }
        });
        setBookedSlots(blocked);
      } catch (e) {
        console.error(e);
      }
    }
    loadBooked();
  }, [selectedBarber, selectedDate, selectedService]);

  const selectedBarberData = useMemo(
    () => barbers.find(b => b._id === selectedBarber) || null,
    [barbers, selectedBarber],
  );

  const isWorkDay = useMemo(() => {
    if (!selectedBarberData) return true;
    if (
      !selectedBarberData.workDays ||
      selectedBarberData.workDays.length === 0
    )
      return true;
    const dayOfWeek = selectedDate.getDay();
    return selectedBarberData.workDays.map(Number).includes(dayOfWeek);
  }, [selectedBarberData, selectedDate]);

  // Genera grupos de slots — soporta horario corrido y turno cortado
  const horarioGroups = useMemo((): SlotGroup[] => {
    if (!isWorkDay || !selectedBarberData) return [];

    const step = selectedService?.durationMinutes ?? 30;

    const buildSlots = (startStr: string, endStr: string): string[] => {
      const parse = (t: string) => {
        const [h, m] = t.trim().split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };
      const start = parse(startStr);
      const end = parse(endStr);
      const slots: string[] = [];
      for (let m = start; m + step <= end; m += step) {
        slots.push(
          `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(
            m % 60,
          ).padStart(2, '0')}`,
        );
      }
      return slots;
    };

    // Turno cortado
    const ranges = selectedBarberData.scheduleRanges;
    if (ranges && ranges.length > 0) {
      return ranges.map(r => ({
        label: r.label,
        slots: buildSlots(r.start, r.end),
      }));
    }

    // Horario corrido
    const range = selectedBarberData.scheduleRange || '09:00 - 18:00';
    const parts = range.split('-');
    if (parts.length < 2) return [];
    return [{ label: '', slots: buildSlots(parts[0], parts[1]) }];
  }, [isWorkDay, selectedBarberData, selectedService]);

  // Lista plana para validaciones
  const allSlots = useMemo(
    () => horarioGroups.flatMap(g => g.slots),
    [horarioGroups],
  );

  const handleSubmit = async () => {
    if (!customerName.trim() || !selectedSlot) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y elige un horario.');
      return;
    }
    setSaving(true);
    try {
      const [h, m] = selectedSlot.split(':').map(Number);
      const date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        h,
        m,
        0,
        0,
      );
      await createAppointment({
        barberId: selectedBarber!,
        customerName: customerName.trim(),
        service: selectedService?.name || 'Corte',
        startTime: date.toISOString(),
        notes: phone,
        email: customerEmail.trim(),
        durationMinutes: selectedService?.durationMinutes ?? 30,
      });
      Alert.alert('¡Reserva Exitosa!', 'Tu turno ha sido agendado.', [
        { text: 'Cerrar', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e?.message || 'No se pudo realizar la reserva. Intenta de nuevo.';
      Alert.alert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  const renderSlotGroup = (group: SlotGroup, index: number) => (
    <View key={index} style={index > 0 ? { marginTop: 14 } : undefined}>
      {group.label ? (
        <Text style={styles.shiftGroupLabel}>
          {group.label === 'mañana' ? '☀️ Mañana' : '🌙 Tarde'}
        </Text>
      ) : null}
      <View style={styles.timeGrid}>
        {group.slots.length > 0 ? (
          group.slots.map(label => {
            const isBooked = bookedSlots.includes(label);
            const isSelected = selectedSlot === label;
            return (
              <Pressable
                key={label}
                style={[
                  styles.timeChip,
                  isSelected && styles.timeChipActive,
                  isBooked && styles.timeChipBooked,
                ]}
                onPress={() => !isBooked && setSelectedSlot(label)}
                disabled={isBooked}
              >
                <Text
                  style={[styles.timeText, isBooked && styles.timeTextBooked]}
                >
                  {label}
                </Text>
                <Text
                  style={[
                    styles.timeDuration,
                    isBooked && styles.timeTextBooked,
                  ]}
                >
                  {selectedService?.durationMinutes ?? 30}min
                </Text>
              </Pressable>
            );
          })
        ) : (
          <Text
            style={{
              color: '#666',
              textAlign: 'center',
              width: '100%',
              marginTop: 10,
            }}
          >
            No hay turnos en este rango.
          </Text>
        )}
      </View>
    </View>
  );

  if (loading)
    return (
      <View style={[styles.screen, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#B89016" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Modal visible={servicePickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Seleccionar Servicio</Text>
            <ScrollView>
              {services.map(s => (
                <Pressable
                  key={s._id}
                  style={styles.serviceItem}
                  onPress={() => {
                    setSelectedService(s);
                    setServicePickerVisible(false);
                  }}
                >
                  <Text style={styles.serviceItemText}>{s.name}</Text>
                  <Text style={{ color: '#666' }}>{s.durationMinutes} min</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setServicePickerVisible(false)}
              style={{ marginTop: 10 }}
            >
              <Text
                style={{
                  color: '#B89016',
                  textAlign: 'center',
                  fontWeight: 'bold',
                }}
              >
                CERRAR
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.headerSubtitle}>Reserva tu lugar</Text>
            <Text style={styles.headerTitle}>Nueva Cita</Text>
          </View>

          <View style={styles.mainCard}>
            {/* SERVICIO */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Servicio deseado</Text>
              <Pressable
                style={styles.selector}
                onPress={() => setServicePickerVisible(true)}
              >
                <Text style={styles.selectorMainText}>
                  {selectedService?.name || 'Seleccionar...'}
                </Text>
                <Text style={styles.arrowIcon}>▼</Text>
              </Pressable>
            </View>

            {/* CLIENTE */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Información del cliente</Text>
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'name' && styles.inputFocused,
                ]}
                placeholder="Tu Nombre y Apellido"
                placeholderTextColor="#666"
                value={customerName}
                onChangeText={setCustomerName}
                onFocus={() => setFocusedField('name')}
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
              <TextInput
                style={[
                  styles.input,
                  focusedField === 'email' && styles.inputFocused,
                ]}
                placeholder="Tu Email (para el comprobante)"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                value={customerEmail}
                onChangeText={setCustomerEmail}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* BARBEROS */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Tu Barbero</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {barbers.map(b => (
                  <Pressable
                    key={b._id}
                    style={styles.barberCard}
                    onPress={() => {
                      setSelectedBarber(b._id);
                      setSelectedSlot(null);
                    }}
                  >
                    <View
                      style={[
                        styles.avatar,
                        selectedBarber === b._id && styles.avatarActive,
                      ]}
                    >
                      <Text style={styles.avatarText}>
                        {b.fullName.charAt(0)}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.barberName,
                        selectedBarber === b._id && styles.barberNameActive,
                      ]}
                    >
                      {b.fullName.split(' ')[0]}
                    </Text>
                    <Text style={styles.barberSchedule}>
                      {' '}
                      {b.scheduleRanges && b.scheduleRanges.length > 0
                        ? `${b.scheduleRanges[0].start}-${
                            b.scheduleRanges[0].end
                          } / ${b.scheduleRanges[1]?.start ?? ''}-${
                            b.scheduleRanges[1]?.end ?? ''
                          }`
                        : b.scheduleRange || 'Sin horario'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* FECHA Y HORARIOS */}
            <View style={styles.section}>
              <View style={styles.dateHeader}>
                <Text style={styles.sectionLabel}>Horarios Disponibles</Text>
                <View style={styles.dateControls}>
                  <Pressable
                    onPress={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() - 1);
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text style={styles.navBtn}>‹</Text>
                  </Pressable>
                  <Text style={styles.dateText}>
                    {DAY_NAMES[selectedDate.getDay()]} {selectedDate.getDate()}
                  </Text>
                  <Pressable
                    onPress={() => {
                      const d = new Date(selectedDate);
                      d.setDate(d.getDate() + 1);
                      setSelectedDate(d);
                      setSelectedSlot(null);
                    }}
                  >
                    <Text style={styles.navBtn}>›</Text>
                  </Pressable>
                </View>
              </View>

              {!isWorkDay ? (
                <View style={styles.notWorkingBox}>
                  <Text style={styles.notWorkingIcon}>🚫</Text>
                  <Text style={styles.notWorkingText}>
                    ESTE BARBERO NO ESTA DISPONIBLE ESTE DIA
                  </Text>
                  <Text
                    style={{
                      color: '#666',
                      fontSize: 12,
                      marginTop: 5,
                      textAlign: 'center',
                    }}
                  >
                    Intenta seleccionar otra fecha u otro barbero.
                  </Text>
                </View>
              ) : allSlots.length > 0 ? (
                horarioGroups.map((group, i) => renderSlotGroup(group, i))
              ) : (
                <Text
                  style={{
                    color: '#666',
                    textAlign: 'center',
                    width: '100%',
                    marginTop: 10,
                  }}
                >
                  No hay turnos configurados para este rango.
                </Text>
              )}
            </View>

            <Pressable
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>Confirmar Reserva</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  scrollContent: { paddingBottom: 150 },
  header: {
    marginTop: Platform.OS === 'ios' ? 60 : 20,
    paddingHorizontal: 25,
    marginBottom: 20,
  },
  headerSubtitle: {
    color: '#B89016',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  headerTitle: { color: '#fff', fontSize: 32, fontWeight: '800' },
  mainCard: {
    marginHorizontal: 15,
    backgroundColor: '#1C1C1C',
    borderRadius: 32,
    padding: 20,
    gap: 20,
  },
  section: { gap: 10 },
  sectionLabel: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  selector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#252525',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectorMainText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  arrowIcon: { color: '#B89016', fontSize: 14 },
  input: {
    backgroundColor: '#252525',
    borderRadius: 16,
    padding: 16,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 5,
  },
  inputFocused: { borderColor: '#B89016' },
  barberCard: { alignItems: 'center', marginRight: 20, width: 85 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  avatarActive: { borderColor: '#B89016', backgroundColor: '#B89016' },
  avatarText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  barberName: { color: '#666', marginTop: 6, fontSize: 14, fontWeight: '600' },
  barberNameActive: { color: '#fff' },
  barberSchedule: { color: '#444', fontSize: 10, marginTop: 2 },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  dateControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  navBtn: { color: '#B89016', fontSize: 28, fontWeight: 'bold' },
  dateText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    width: '22%',
    paddingVertical: 14,
    backgroundColor: '#252525',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  timeChipActive: { backgroundColor: '#B89016', borderColor: '#B89016' },
  timeChipBooked: {
    backgroundColor: '#1a1a1a',
    borderColor: '#2a2a2a',
    opacity: 0.5,
  },
  timeText: { color: '#fff', fontWeight: '700' },
  timeTextBooked: { color: '#444', textDecorationLine: 'line-through' },
  timeDuration: { color: '#666', fontSize: 9, marginTop: 2, fontWeight: '600' },
  shiftGroupLabel: {
    color: '#B89016',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notWorkingBox: {
    padding: 30,
    backgroundColor: '#252525',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 10,
    alignItems: 'center',
  },
  notWorkingIcon: { fontSize: 24, marginBottom: 10 },
  notWorkingText: {
    color: '#B89016',
    textAlign: 'center',
    fontWeight: '800',
    fontSize: 15,
    lineHeight: 22,
  },
  submitBtn: {
    backgroundColor: '#B89016',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#B89016',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  submitBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 17,
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    padding: 25,
  },
  modalCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 30,
    padding: 25,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
  },
  serviceItemText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default ReservasForm;
