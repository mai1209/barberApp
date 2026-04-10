import React, { useCallback, useMemo, useState, useEffect } from 'react';
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
  Image,
} from 'react-native';
import {
  fetchBarbers,
  Barber,
  createAppointment,
  fetchBarberAppointments,
  fetchServices,
  ServiceOption,
  PaymentMethod,
  getCurrentUser,
  PaymentSettings,
} from '../services/api';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';
import { getUserProfile } from '../services/authStorage';

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatPrice = (value?: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

function formatDateInShopTZ(value: string | number | Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHOP_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(value));
  const year = parts.find(p => p.type === 'year')?.value ?? '0000';
  const month = parts.find(p => p.type === 'month')?.value ?? '00';
  const day = parts.find(p => p.type === 'day')?.value ?? '00';
  return `${year}-${month}-${day}`;
}

function labelToMinutes(label: string): number {
  const [hour, minute] = label.split(':').map(Number);
  return hour * 60 + minute;
}

function getCurrentMinutesInShopTZ(now: number): number {
  return labelToMinutes(formatTimeInShopTZ(now));
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
type ResolvedBarberSchedule = {
  scheduleRange: string | null;
  scheduleRanges: { label: string; start: string; end: string }[];
};

type PaymentOption = {
  value: PaymentMethod;
  label: string;
  helper: string;
};

function getPaymentOptions(settings?: PaymentSettings | null): PaymentOption[] {
  const normalized = settings ?? {};
  const options: PaymentOption[] = [];

  if (normalized.cashEnabled !== false) {
    options.push({
      value: 'cash',
      label: 'Cobro en el local',
      helper: 'Las reservas cargadas desde la app se cobran presencialmente en el local.',
    });
  }

  return options;
}

function normalizeScheduleRanges(input?: ResolvedBarberSchedule['scheduleRanges']) {
  if (!Array.isArray(input)) return [];
  return input.filter(
    item => item?.start?.trim() && item?.end?.trim(),
  );
}

function normalizeOverrideValidFrom(value?: string | null) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '1970-01-01';
}

function resolveBarberScheduleForDate(
  barber: Barber | null,
  date: Date,
): ResolvedBarberSchedule {
  if (!barber) {
    return { scheduleRange: null, scheduleRanges: [] };
  }

  const weekday = date.getDay();
  const targetDate = formatDateInShopTZ(date);
  const override =
    barber.dayScheduleOverrides
      ?.filter(item => Number(item.day) === weekday)
      .map(item => ({
        ...item,
        validFrom: normalizeOverrideValidFrom(item.validFrom),
        useBase: Boolean(item.useBase),
      }))
      .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0] ?? null;

  if (override) {
    if (override.useBase) {
      return {
        scheduleRange: barber.scheduleRange ?? null,
        scheduleRanges: normalizeScheduleRanges(barber.scheduleRanges),
      };
    }

    const scheduleRanges = normalizeScheduleRanges(override.scheduleRanges);
    return {
      scheduleRange: scheduleRanges.length ? null : override.scheduleRange ?? null,
      scheduleRanges,
    };
  }

  return {
    scheduleRange: barber.scheduleRange ?? null,
    scheduleRanges: normalizeScheduleRanges(barber.scheduleRanges),
  };
}

function ReservasForm({ navigation }: any) {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarber, setSelectedBarber] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [selectedService, setSelectedService] = useState<ServiceOption | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOption[]>([]);
  const [servicePickerVisible, setServicePickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(() => new Set());
  const [selectedBarberSchedule, setSelectedBarberSchedule] =
    useState<ResolvedBarberSchedule | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [closedDayNotice, setClosedDayNotice] = useState('');
  const styles = useMemo(() => createStyles(theme), [theme]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowTick(Date.now());
    }, 30_000);

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const storedUser = await getUserProfile<any>();
        const [resB, resS, currentUserRes] = await Promise.all([
          fetchBarbers(),
          fetchServices(),
          getCurrentUser().catch(() => null),
        ]);
        setBarbers(resB.barbers || []);
        setServices(resS.services || []);
        if (resB.barbers?.length > 0) setSelectedBarber(resB.barbers[0]._id);
        if (resS.services?.length > 0) setSelectedService(resS.services[0]);

        const paymentSettings =
          currentUserRes?.user?.paymentSettings ??
          storedUser?.paymentSettings ??
          null;
        const nextOptions = getPaymentOptions(paymentSettings);
        setPaymentOptions(nextOptions);
        setPaymentMethod(nextOptions[0]?.value ?? null);
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
        const closureMessage = res.shopClosure?.isClosed
          ? res.shopClosure.message ||
            'Este día el local permanecerá cerrado. Elegí otro turno disponible.'
          : res.barberClosure?.isClosed
            ? res.barberClosure.message ||
              'Este barbero no atenderá ese día. Elegí otro profesional o seleccioná otra fecha.'
            : '';
        setClosedDayNotice(closureMessage);
        const blocked = new Set<string>();
        const blockStep = 30; // bloquear en intervalos de 30 min para todos los turnos
        res.appointments.forEach(a => {
          const label = formatTimeInShopTZ(a.startTime);
          const [h, m] = label.split(':').map(Number);
          const startMin = h * 60 + m;
          const occupiedDuration = a.durationMinutes || 30;
          for (let offset = 0; offset < occupiedDuration; offset += blockStep) {
            const blockMin = startMin + offset;
            blocked.add(
              `${String(Math.floor(blockMin / 60)).padStart(2, '0')}:${String(
                blockMin % 60,
              ).padStart(2, '0')}`,
            );
          }
        });
        setBookedSlots(blocked);
        if (res.resolvedSchedule) {
          setSelectedBarberSchedule({
            scheduleRange: res.resolvedSchedule.scheduleRange ?? null,
            scheduleRanges: normalizeScheduleRanges(
              res.resolvedSchedule.scheduleRanges,
            ),
          });
        } else {
          setSelectedBarberSchedule(null);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadBooked();
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    if (!selectedBarber) {
      setSelectedBarberSchedule(null);
      setClosedDayNotice('');
    }
  }, [selectedBarber]);

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

  const resolvedBarberSchedule = useMemo(
    () =>
      selectedBarberSchedule ||
      resolveBarberScheduleForDate(selectedBarberData, selectedDate),
    [selectedBarberData, selectedDate, selectedBarberSchedule],
  );

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
    const ranges = resolvedBarberSchedule.scheduleRanges;
    if (ranges && ranges.length > 0) {
      return ranges.map(r => ({
        label: r.label,
        slots: buildSlots(r.start, r.end),
      }));
    }

    // Horario corrido
    const range = resolvedBarberSchedule.scheduleRange || '09:00 - 18:00';
    const parts = range.split('-');
    if (parts.length < 2) return [];
    return [{ label: '', slots: buildSlots(parts[0], parts[1]) }];
  }, [isWorkDay, selectedBarberData, selectedService, resolvedBarberSchedule]);

  // Lista plana para validaciones
  const allSlots = useMemo(
    () => horarioGroups.flatMap(g => g.slots),
    [horarioGroups],
  );

  const isTodayInShop = useMemo(
    () => formatDateInShopTZ(selectedDate) === formatDateInShopTZ(nowTick),
    [selectedDate, nowTick],
  );

  const currentMinutesInShop = useMemo(
    () => getCurrentMinutesInShopTZ(nowTick),
    [nowTick],
  );

  const isSlotUnavailable = useCallback(
    (label: string) => {
      if (bookedSlots.has(label)) return true;
      if (!isTodayInShop) return false;
      return labelToMinutes(label) <= currentMinutesInShop;
    },
    [bookedSlots, isTodayInShop, currentMinutesInShop],
  );

  useEffect(() => {
    if (!selectedSlot) return;
    if (!allSlots.includes(selectedSlot) || isSlotUnavailable(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [allSlots, selectedSlot, isSlotUnavailable]);

  useEffect(() => {
    if (!paymentOptions.length) {
      if (paymentMethod !== null) setPaymentMethod(null);
      return;
    }
    const currentOption = paymentOptions.find(option => option.value === paymentMethod);
    if (!currentOption) {
      setPaymentMethod(paymentOptions[0].value);
    }
  }, [paymentMethod, paymentOptions]);

  const handleSubmit = async () => {
    if (!customerName.trim() || !selectedSlot) {
      Alert.alert('Error', 'Por favor ingresa tu nombre y elige un horario.');
      return;
    }
    if (closedDayNotice) {
      Alert.alert('No disponible', closedDayNotice);
      return;
    }
    if (!paymentMethod) {
      Alert.alert(
        'Cobro no disponible',
        'Esta barbería no tiene un medio de pago habilitado para reservas desde la app.',
      );
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
        servicePrice: selectedService?.price ?? 0,
        notes: phone,
        email: customerEmail.trim(),
        durationMinutes: selectedService?.durationMinutes ?? 30,
        paymentMethod,
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
            const isBooked = isSlotUnavailable(label);
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
        <ActivityIndicator size="large" color={theme.primary} />
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
                  <Text style={{ color: hexToRgba(theme.primary, 0.52) }}>
                    {s.durationMinutes} min · {formatPrice(s.price)}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={() => setServicePickerVisible(false)}
              style={{ marginTop: 10 }}
            >
              <Text
                style={{
                  color: theme.primary,
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
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectorMainText}>
                    {selectedService?.name || 'Seleccionar...'}
                  </Text>
                  {selectedService ? (
                    <Text style={styles.selectorMeta}>
                      {selectedService.durationMinutes} min · {formatPrice(selectedService.price)}
                    </Text>
                  ) : null}
                </View>
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

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>¿Cómo preferís pagar?</Text>
              {paymentOptions.length > 0 ? (
                <>
                  <View style={styles.paymentRow}>
                    {paymentOptions.map(option => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.paymentChip,
                          paymentMethod === option.value && styles.paymentChipActive,
                        ]}
                        onPress={() => setPaymentMethod(option.value)}
                      >
                        <Text
                          style={[
                            styles.paymentChipText,
                            paymentMethod === option.value &&
                              styles.paymentChipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.paymentHelperText}>
                    {
                      paymentOptions.find(option => option.value === paymentMethod)
                        ?.helper
                    }
                  </Text>
                  <Text style={styles.paymentMiniNote}>
                    En la app solo dejamos cobro presencial. El pago online queda para las reservas desde la web.
                  </Text>
                </>
              ) : (
                <View style={styles.paymentUnavailableBox}>
                  <Text style={styles.paymentUnavailableTitle}>
                    Reservas sin cobro habilitado
                  </Text>
                  <Text style={styles.paymentUnavailableText}>
                    Este local todavía no configuró un medio de pago disponible
                    para tomar reservas desde la app.
                  </Text>
                </View>
              )}
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
                      {b.photoUrl ? (
                        <Image
                          source={{ uri: b.photoUrl }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarText}>
                          {b.fullName.charAt(0)}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.barberName,
                        selectedBarber === b._id && styles.barberNameActive,
                      ]}
                    >
                      {b.fullName.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>

            {/* FECHA Y HORARIOS */}
            <View style={styles.section}>
              <View style={styles.dateHeader}>
                  <Text style={[styles.sectionLabel, styles.scheduleHeaderLabel]}>
                    Horarios{'\n'}Disponibles
                  </Text>
                <View style={styles.dateControls}>
                  <Pressable
                    hitSlop={12}
                    style={styles.navBtnWrap}
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
                    hitSlop={12}
                    style={styles.navBtnWrap}
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

              {closedDayNotice ? (
                <View style={styles.notWorkingBox}>
                  <Text style={styles.notWorkingIcon}>🔒</Text>
                  <Text style={styles.notWorkingText}>ESTE TURNO NO ESTA DISPONIBLE ESE DIA</Text>
                  <Text
                    style={{
                      color: hexToRgba(theme.primary, 0.56),
                      fontSize: 12,
                      marginTop: 5,
                      textAlign: 'center',
                    }}
                  >
                    {closedDayNotice}
                  </Text>
                </View>
              ) : !isWorkDay ? (
                <View style={styles.notWorkingBox}>
                  <Text style={styles.notWorkingIcon}>🚫</Text>
                  <Text style={styles.notWorkingText}>
                    ESTE BARBERO NO ESTA DISPONIBLE ESTE DIA
                  </Text>
                  <Text
                    style={{
                      color: hexToRgba(theme.primary, 0.56),
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
                    color: hexToRgba(theme.primary, 0.56),
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
              style={[
                styles.submitBtn,
                (!paymentMethod || saving || Boolean(closedDayNotice)) && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={saving || !paymentMethod || Boolean(closedDayNotice)}
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

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.background },
    scrollContent: { paddingBottom: 150 },
    header: {
      marginTop: Platform.OS === 'ios' ? 60 : 20,
      paddingHorizontal: 25,
      marginBottom: 20,
    },
    headerSubtitle: {
      color: theme.primary,
      fontSize: 14,
      fontWeight: '600',
      textTransform: 'uppercase',
    },
    headerTitle: { color: '#fff', fontSize: 32, fontWeight: '800' },
    mainCard: {
      marginHorizontal: 15,
      backgroundColor: theme.card,
      borderRadius: 32,
      padding: 20,
      gap: 20,
    },
    section: { gap: 10 },
    sectionLabel: {
      color: hexToRgba(theme.primary, 0.78),
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    selector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: '#252525',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#333',
    },
    selectorMainText: { color: '#fff', fontWeight: '600', fontSize: 16 },
    selectorMeta: { color: hexToRgba(theme.primary, 0.54), fontSize: 12, marginTop: 2 },
    arrowIcon: { color: theme.primary, fontSize: 14 },
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
    inputFocused: { borderColor: theme.primary },
    paymentRow: {
      flexDirection: 'row',
      gap: 10,
    },
    paymentChip: {
      flex: 1,
      backgroundColor: '#252525',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 12,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#333',
    },
    paymentChipActive: {
      backgroundColor: hexToRgba(theme.primary, 0.16),
      borderColor: theme.primary,
    },
    paymentChipText: {
      color: hexToRgba(theme.primary, 0.6),
      fontSize: 14,
      fontWeight: '700',
    },
    paymentChipTextActive: {
      color: theme.primary,
    },
    paymentHelperText: {
      color: hexToRgba(theme.primary, 0.6),
      fontSize: 12,
      lineHeight: 18,
      marginTop: 2,
    },
    paymentMiniNote: {
      color: hexToRgba(theme.primary, 0.42),
      fontSize: 11,
      lineHeight: 16,
      marginTop: 6,
    },
    paymentUnavailableBox: {
      backgroundColor: '#252525',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#333',
      padding: 14,
      gap: 6,
    },
    paymentUnavailableTitle: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
    paymentUnavailableText: {
      color: hexToRgba(theme.primary, 0.58),
      fontSize: 12,
      lineHeight: 18,
    },
    barberCard: { alignItems: 'center', marginRight: 10, width: 85 },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: '#333',
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
      overflow: 'hidden',
    },
    avatarActive: { borderColor: theme.primary, backgroundColor: theme.primary },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: { color: '#fff', fontSize: 19, fontWeight: 'bold' },
    barberName: { color: hexToRgba(theme.primary, 0.52), marginTop: 6, fontSize: 14, fontWeight: '600' },
    barberNameActive: { color: '#fff' },
    barberSchedule: { color: hexToRgba(theme.primary, 0.35), fontSize: 10, marginTop: 2 },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 5,
      gap: 10,
    },
    scheduleHeaderLabel: {
      width: 96,
      lineHeight: 14,
    },
    dateControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: '#252525',
      paddingHorizontal: 8,
      paddingVertical: 6,
      borderRadius: 16,
      flexShrink: 1,
      flex: 1,
    },
    navBtnWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: hexToRgba(theme.primary, 0.12),
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.2),
      alignItems: 'center',
      justifyContent: 'center',
    },
    navBtn: { color: theme.primary, fontSize: 34, fontWeight: 'bold', lineHeight: 36 },
    dateText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
      textTransform: 'capitalize',
      minWidth: 0,
      flex: 1,
      flexShrink: 1,
      textAlign: 'center',
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
    timeChipActive: { backgroundColor: theme.primary, borderColor: theme.primary },
    timeChipBooked: {
      backgroundColor: '#1a1a1a',
      borderColor: '#2a2a2a',
      opacity: 0.5,
    },
    timeText: { color: '#fff', fontWeight: '700' },
    timeTextBooked: { color: '#444', textDecorationLine: 'line-through' },
    timeDuration: { color: hexToRgba(theme.primary, 0.5), fontSize: 9, marginTop: 2, fontWeight: '600' },
    shiftGroupLabel: {
      color: theme.primary,
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
      color: theme.primary,
      textAlign: 'center',
      fontWeight: '800',
      fontSize: 15,
      lineHeight: 22,
    },
    submitBtn: {
      backgroundColor: theme.primary,
      padding: 12,
      borderRadius: 15,
      alignItems: 'center',
      marginTop: 10,
      shadowColor: theme.primary,
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnText: {
      color: '#fff',
      fontWeight: '600',
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
      backgroundColor: theme.card,
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
