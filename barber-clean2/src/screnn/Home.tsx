import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  StatusBar,
  Alert,
  Platform,
  Share,
  PanResponder,
  Linking,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Clipboard from '@react-native-clipboard/clipboard';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';
import { getUserProfile, subscribeToUserProfile } from '../services/authStorage';
import { hasProPlanAccess } from '../services/planAccess';
import ProFeatureModal from '../components/ProFeatureModal';
import {
  fetchAppointments,
  Appointment,
  updateAppointmentStatus,
  deleteAppointment,
} from '../services/api';
import { TrendingUp, Share2, Users, Clock, Scissors } from 'lucide-react-native';

type Props = {
  navigation: any;
};

const PUBLIC_BOOKING_BASE = 'https://barberappbycodex.com';
const PRO_PLAN_URL = 'https://barberappbycodex.com/planes?plan=pro';
const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(
    sanitized.length === 3 ? sanitized.repeat(2) : sanitized,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const sanitizeWhatsappNumber = (value: string) => value.replace(/[^\d]/g, '');

function buildCancellationMessage({
  shopName,
  customerName,
  service,
  startTime,
}: {
  shopName: string;
  customerName: string;
  service: string;
  startTime: string;
}) {
  const dateLabel = new Date(startTime).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'America/Argentina/Cordoba',
  });
  const timeLabel = formatTimeOnly(startTime);
  return `Hola ${customerName}, te escribimos de ${shopName}. Tuvimos que cancelar tu turno de ${service} del ${dateLabel} a las ${timeLabel}. Responde este mensaje y te ofrecemos un nuevo horario.`;
}

function getPaymentSnapshot(appointment: Appointment) {
  if (appointment.status === 'completed') {
    if (appointment.paymentStatus === 'unpaid') {
      return { label: 'Sin cobrar', tone: 'neutral' as const };
    }
    if (appointment.paymentMethodCollected === 'transfer') {
      return {
        label: 'Cobrado por adelantado / transferencia',
        tone: 'transfer' as const,
      };
    }
    return { label: 'Cobrado en efectivo', tone: 'cash' as const };
  }

  if (appointment.paymentMethod === 'transfer') {
    return {
      label: 'Reserva con adelanto / transferencia',
      tone: 'transfer' as const,
    };
  }

  return {
    label: 'Reserva para cobrar en efectivo',
    tone: 'cash' as const,
  };
}

function Home({ navigation }: Props) {
  const { theme, shopSlug } = useTheme();
  const [fullName, setFullName] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasProAccess, setHasProAccess] = useState(false);
  const [proModalVariant, setProModalVariant] = useState<null | 'metrics' | 'history'>(null);

  const selectedDateRef = useRef(selectedDate);
  const didInitDateEffect = useRef(false);
  const openedSwipeableIdRef = useRef<string | null>(null);
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const shareLink = useMemo(() => {
    if (!shopSlug) return '';
    const base = PUBLIC_BOOKING_BASE.replace(/\/+$/, '');
    return `${base}/${shopSlug}`;
  }, [shopSlug]);

  const styles = useMemo(() => createStyles(theme), [theme]);

  const isToday = useMemo(
    () => isSameDay(selectedDate, new Date()),
    [selectedDate],
  );

  const formattedHeaderDate = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(selectedDate),
    [selectedDate],
  );

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const offset = index - 3;
      const date = addDays(selectedDate, offset);

      return {
        key: `${date.toISOString()}-${index}`,
        date,
        isSelected: isSameDay(date, selectedDate),
        isToday: isSameDay(date, new Date()),
        dayName: new Intl.DateTimeFormat('es-AR', { weekday: 'short' }).format(
          date,
        ),
        dayNumber: new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(
          date,
        ),
      };
    });
  }, [selectedDate]);

  const loadData = useCallback(async (isRefresh = false, targetDate?: Date) => {
    const activeDate = targetDate ?? selectedDateRef.current;
    try {
      if (!isRefresh) setLoading(true);
      setError('');
      const appointmentsRes = await fetchAppointments({
        date: activeDate.toISOString().slice(0, 10),
      });
      setAppointments(
        appointmentsRes.appointments.filter(a => a.status !== 'cancelled'),
      );
    } catch (err: any) {
      setError(err?.message ?? 'No pudimos cargar la información');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const storedUser = await getUserProfile<{ fullName?: string }>();
      if (isMounted && storedUser) {
        if (storedUser?.fullName) setFullName(storedUser.fullName);
        setHasProAccess(hasProPlanAccess(storedUser));
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToUserProfile(user => {
      setHasProAccess(hasProPlanAccess(user));
      setFullName(user?.fullName || '');
    });
  }, []);

  const handleOpenProModal = useCallback((variant: 'metrics' | 'history') => {
    setProModalVariant(variant);
  }, []);

  const handleCloseProModal = useCallback(() => {
    setProModalVariant(null);
  }, []);

  const handleOpenSubscriptionSettings = useCallback(async () => {
    setProModalVariant(null);
    try {
      await Linking.openURL(PRO_PLAN_URL);
    } catch (_error) {
      Alert.alert('No pudimos abrir el sitio de planes', PRO_PLAN_URL);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false, selectedDateRef.current);
      const intervalId = setInterval(
        () => loadData(true, selectedDateRef.current),
        15000,
      );
      return () => clearInterval(intervalId);
    }, [loadData]),
  );

  useEffect(() => {
    if (!didInitDateEffect.current) {
      didInitDateEffect.current = true;
      return;
    }
    loadData(false, selectedDate);
  }, [selectedDate, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true, selectedDate);
  };

  const handleShiftDate = (days: number) =>
    setSelectedDate(prev => addDays(prev, days));
  const handleSelectDate = (date: Date) => setSelectedDate(date);
  const handleGoToToday = () => setSelectedDate(new Date());

  const greetingName = fullName || 'Barbería';

  const handleCopyLink = async () => {
    if (!shareLink) return;
    Clipboard.setString(shareLink);
    try {
      await Share.share({ message: shareLink });
    } catch (_e) {}
    Alert.alert('¡Copiado!', 'El link de turnos se copió al portapapeles.');
  };

  const handleComplete = async (appointmentId: string) => {
    Alert.alert('Finalizar turno', '¿Deseas marcar este turno como completado?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Sí, finalizar',
        onPress: () => {
          const appointment = appointments.find(item => item._id === appointmentId);
          const totalAmount = Number(
            appointment?.amountTotal ??
              appointment?.servicePrice ??
              0,
          );

          Alert.alert(
            '¿Cómo pagó este cliente?',
            'Esto define las métricas reales del local.',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Efectivo',
                onPress: async () => {
                  try {
                    await updateAppointmentStatus(appointmentId, 'completed', {
                      paymentMethodCollected: 'cash',
                      paymentStatus: 'paid',
                      amountPaid: totalAmount,
                    });
                    await loadData(true, selectedDateRef.current);
                  } catch (err: any) {
                    setError(err?.message ?? 'Error');
                  }
                },
              },
              {
                text: 'Transferencia / adelantado',
                onPress: async () => {
                  try {
                    await updateAppointmentStatus(appointmentId, 'completed', {
                      paymentMethodCollected: 'transfer',
                      paymentStatus: 'paid',
                      amountPaid: totalAmount,
                    });
                    await loadData(true, selectedDateRef.current);
                  } catch (err: any) {
                    setError(err?.message ?? 'Error');
                  }
                },
              },
              {
                text: 'Aún no pagó',
                onPress: async () => {
                  try {
                    await updateAppointmentStatus(appointmentId, 'completed', {
                      paymentStatus: 'unpaid',
                      amountPaid: 0,
                    });
                    await loadData(true, selectedDateRef.current);
                  } catch (err: any) {
                    setError(err?.message ?? 'Error');
                  }
                },
              },
            ],
          );
        },
      },
    ]);
  };

  const handleRelease = async (appointmentId: string) => {
    const appointment = appointments.find(item => item._id === appointmentId);
    Alert.alert('Gestionar Turno', 'Elegí una acción para este turno:', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Liberar (Solo App)',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteAppointment(appointmentId);
            await loadData(true, selectedDateRef.current);
          } catch (err: any) {
            setError('Error al liberar');
          }
        },
      },
      {
        text: 'Cancelar y Avisar WhatsApp',
        onPress: async () => {
          try {
            if (!appointment?.notes) {
              Alert.alert('Sin contacto', 'No hay WhatsApp registrado para este cliente.');
              return;
            }
            const phone = sanitizeWhatsappNumber(appointment.notes);
            await deleteAppointment(appointmentId);
            await loadData(true, selectedDateRef.current);
            const message = buildCancellationMessage({
              shopName: greetingName,
              customerName: appointment.customerName,
              service: appointment.service,
              startTime: appointment.startTime,
            });
            await Linking.openURL(
              `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
            );
          } catch (err: any) {
            setError('Error al cancelar');
          }
        },
      },
    ]);
  };

  const datePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) handleShiftDate(1);
          else if (gestureState.dx > 40) handleShiftDate(-1);
        },
      }),
    [],
  );

  const handleSwipeableOpen = (appointmentId: string) => {
    const previousId = openedSwipeableIdRef.current;
    if (previousId && previousId !== appointmentId)
      swipeableRefs.current[previousId]?.close();
    openedSwipeableIdRef.current = appointmentId;
  };

  const renderAppointmentCard = (appointment: Appointment, index: number) => {
    const barberName =
      appointment.barber && typeof appointment.barber === 'object'
        ? appointment.barber.fullName
        : 'Sin asignar';
    const isCompleted = appointment.status === 'completed';
    const paymentSnapshot = getPaymentSnapshot(appointment);

    const card = (
      <View
        style={[
          styles.appointmentCard,
          isCompleted && styles.appointmentCardCompleted,
          { marginTop: index === 0 ? 0 : 12 },
        ]}
      >
        {/* Header: Hora y Estado */}
        <View style={styles.cardHeader}>
          <View style={styles.timeTag}>
            <Clock size={14} color={theme.primary} style={{ marginRight: 6 }} />
            <Text style={styles.timeText}>{formatTimeOnly(appointment.startTime)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              isCompleted ? styles.statusBadgeDone : styles.statusBadgePending,
            ]}
          >
            <Text style={[styles.statusText, isCompleted ? styles.statusTextDone : styles.statusTextPending]}>
              {isCompleted ? 'COMPLETADO' : 'PENDIENTE'}
            </Text>
          </View>
        </View>

        {/* Body: Cliente y Servicio */}
        <View style={styles.cardBody}>
          <Text style={styles.customerNameText}>{appointment.customerName}</Text>
          <View style={styles.serviceRow}>
            <Scissors size={14} color="#888" style={{ marginRight: 6 }} />
            <Text style={styles.serviceNameText}>{appointment.service}</Text>
            <Text style={styles.dotSeparator}>•</Text>
            <Text style={styles.durationText}>{appointment.durationMinutes || 60} min</Text>
          </View>
          <Text style={styles.barberSubText}>Atendido por: <Text style={{color: '#BBB'}}>{barberName}</Text></Text>
          <View
            style={[
              styles.paymentInfoBadge,
              paymentSnapshot.tone === 'cash'
                ? styles.paymentInfoBadgeCash
                : paymentSnapshot.tone === 'transfer'
                  ? styles.paymentInfoBadgeTransfer
                  : styles.paymentInfoBadgeNeutral,
            ]}
          >
            <Text style={styles.paymentInfoText}>{paymentSnapshot.label}</Text>
          </View>
        </View>

        {/* Acciones */}
        {!isCompleted && (
          <View style={styles.cardActions}>
            <Pressable
              style={[styles.btnAction, styles.btnMain]}
              onPress={() => handleComplete(appointment._id)}
            >
              <Text style={styles.btnMainText}>Cobrar y finalizar</Text>
            </Pressable>
            <Pressable
              style={[styles.btnAction, styles.btnSec]}
              onPress={() => handleRelease(appointment._id)}
            >
              <Text style={styles.btnSecText}>Liberar</Text>
            </Pressable>
          </View>
        )}
      </View>
    );

    if (isCompleted) return <View key={appointment._id}>{card}</View>;

    return (
      <Swipeable
        key={appointment._id}
        ref={ref => {
          swipeableRefs.current[appointment._id] = ref;
        }}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            style={[styles.swipeAction, { marginTop: index === 0 ? 0 : 12 }]}
            onPress={() => handleRelease(appointment._id)}
          >
            <Text style={styles.swipeActionText}>Liberar</Text>
          </Pressable>
        )}
        onSwipeableOpen={() => handleSwipeableOpen(appointment._id)}
      >
        {card}
      </Swipeable>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.topHeader}>
        <View>
          <Text style={styles.welcomeText}>¡Hola,</Text>
          <Text style={styles.nameText}>{greetingName}!</Text>
        </View>
        <Image source={theme.logo} style={styles.logo} resizeMode="contain" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {shopSlug && (
          <Pressable style={styles.linkCardCompact} onPress={handleCopyLink}>
            <View style={styles.linkIconBox}>
              <Share2 size={16} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitleCompact}>Link de autogestión</Text>
              <Text style={styles.linkUrlCompact} numberOfLines={1}>
                {shareLink}
              </Text>
              <Text style={styles.linkHelperCompact}>
                Copiá y enviá este link para turnos.
              </Text>
            </View>
            <View style={styles.copyBadgeCompact}>
              <Text style={styles.copyBadgeTextCompact}>COPIAR</Text>
            </View>
          </Pressable>
        )}

        <View style={styles.compactCardsRow}>
          <Pressable
            style={[styles.dualCompactCard, !hasProAccess && styles.dualCompactCardLocked]}
            onPress={() =>
              hasProAccess ? navigation.navigate('Owner-Metrics') : handleOpenProModal('metrics')
            }
          >
            <View style={styles.metricsIconBox}>
              <TrendingUp size={20} color={theme.primary} />
            </View>
            <Text style={styles.metricsTitleCompact}>Métricas</Text>
            {!hasProAccess ? <Text style={styles.proBadgeCompact}>PRO</Text> : null}
          </Pressable>

          <Pressable
            style={[styles.dualCompactCard, !hasProAccess && styles.dualCompactCardLocked]}
            onPress={() =>
              hasProAccess ? navigation.navigate('Customer-History') : handleOpenProModal('history')
            }
          >
            <View style={styles.metricsIconBox}>
              <Users size={20} color={theme.primary} />
            </View>
            <Text style={styles.metricsTitleCompact}>Historial</Text>
            {!hasProAccess ? <Text style={styles.proBadgeCompact}>PRO</Text> : null}
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.agendaTopRow}>
            <Text style={styles.sectionTitle}>Agenda de turnos</Text>
            {!isToday && (
              <Pressable style={styles.todayButton} onPress={handleGoToToday}>
                <Text style={styles.todayButtonText}>Volver a hoy</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.dateHeroCard} {...datePanResponder.panHandlers}>
            <View style={styles.dateHeroHeader}>
              <Pressable
                style={styles.dateCircleBtn}
                onPress={() => handleShiftDate(-1)}
              >
                <Text style={styles.dateCircleBtnText}>‹</Text>
              </Pressable>
              <View style={styles.dateHeroTextWrap}>
                <Text style={styles.dateHeroTitle}>
                  {capitalize(formattedHeaderDate.split(',')[0])}
                </Text>
                <Text style={styles.dateHeroSubtitle}>
                  {capitalize(
                    formattedHeaderDate.split(',').slice(1).join(',').trim(),
                  )}
                </Text>
              </View>
              <Pressable
                style={styles.dateCircleBtn}
                onPress={() => handleShiftDate(1)}
              >
                <Text style={styles.dateCircleBtnText}>›</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.weekStripContent}
            >
              {weekDays.map(item => (
                <Pressable
                  key={item.key}
                  style={[
                    styles.weekDayChip,
                    item.isSelected && styles.weekDayChipActive,
                  ]}
                  onPress={() => handleSelectDate(item.date)}
                >
                  <Text
                    style={[
                      styles.weekDayName,
                      item.isSelected && styles.weekDayNameActive,
                    ]}
                  >
                    {capitalize(item.dayName.replace('.', ''))}
                  </Text>
                  <Text
                    style={[
                      styles.weekDayNumber,
                      item.isSelected && styles.weekDayNumberActive,
                    ]}
                  >
                    {item.dayNumber}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ marginTop: 20 }}>
            {loading && !appointments.length ? (
              <ActivityIndicator
                color={theme.primary}
                style={{ marginTop: 40 }}
              />
            ) : appointments.length ? (
              appointments.map(renderAppointmentCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Sin turnos hoy</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
      <ProFeatureModal
        visible={proModalVariant != null}
        variant={proModalVariant ?? 'metrics'}
        theme={theme}
        onClose={handleCloseProModal}
        onOpenPlan={handleOpenSubscriptionSettings}
      />
    </View>
  );
}

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
const formatTimeOnly = (value: string) =>
  new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
  });
const capitalize = (text: string) =>
  text ? text.charAt(0).toUpperCase() + text.slice(1) : '';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    topHeader: {
      paddingHorizontal: 25,
      paddingTop: Platform.OS === 'ios' ? 60 : 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    welcomeText: { color: '#fff', fontSize: 16, fontWeight: '500' },
    nameText: { color: '#fff', fontSize: 28, fontWeight: '800' },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
    
    // Links y Métricas (Mismo estilo anterior)
    linkCardCompact: { backgroundColor: '#151515', borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#222', marginTop: 20, gap: 12 },
    linkIconBox: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#222', alignItems: 'center', justifyContent: 'center' },
    linkTitleCompact: { color: '#666', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    linkUrlCompact: { color: '#AAA', fontSize: 13, marginTop: 1 },
    linkHelperCompact: { color: '#6F7787', fontSize: 10, marginTop: 3, lineHeight: 14 },
    copyBadgeCompact: { backgroundColor: hexToRgba(theme.primary, 0.15), paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    copyBadgeTextCompact: { color: theme.primary, fontSize: 9, fontWeight: '900' },
    compactCardsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
    dualCompactCard: { flex: 1, backgroundColor: theme.card, borderRadius: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#2A2A2A', flexDirection: 'row' },
    metricsIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: hexToRgba(theme.primary, 0.1), alignItems: 'center', justifyContent: 'center' },
    metricsTitleCompact: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    dualCompactCardLocked: {
      opacity: 0.82,
      borderColor: hexToRgba(theme.primary, 0.25),
    },
    proBadgeCompact: {
      marginTop: 6,
      color: theme.primary,
      fontSize: 10,
      fontWeight: '900',
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },

    // Agenda Section
    section: { marginTop: 25 },
    sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
    agendaTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    todayButton: { backgroundColor: hexToRgba(theme.primary, 0.12), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    todayButtonText: { color: theme.primary, fontSize: 12, fontWeight: '700' },
    dateHeroCard: { backgroundColor: theme.card, borderRadius: 24, borderWidth: 1, borderColor: '#2A2A2A', paddingVertical: 15 },
    dateHeroHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14 },
    dateCircleBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' },
    dateCircleBtnText: { color: theme.primary, fontSize: 24, fontWeight: '700' },
    dateHeroTextWrap: { flex: 1, alignItems: 'center' },
    dateHeroTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
    dateHeroSubtitle: { color: '#8E8E8E', fontSize: 11, fontWeight: '500' },
    weekStripContent: { paddingHorizontal: 14, paddingTop: 15 },
    weekDayChip: { width: 55, height: 60, borderRadius: 15, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
    weekDayChipActive: { backgroundColor: hexToRgba(theme.primary, 0.15), borderWidth: 1, borderColor: theme.primary },
    weekDayName: { color: '#7A7A7A', fontSize: 10, fontWeight: '700' },
    weekDayNameActive: { color: theme.primary },
    weekDayNumber: { color: '#F2F2F2', fontSize: 16, fontWeight: '800' },
    weekDayNumberActive: { color: theme.primary },

    // NUEVO DISEÑO DE CARD DE TURNO
    appointmentCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: '#2A2A2A',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    appointmentCardCompleted: { opacity: 0.5 },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    timeTag: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#1A1A1A',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#333',
    },
    timeText: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    statusBadgePending: { backgroundColor: hexToRgba(theme.primary, 0.1) },
    statusBadgeDone: { backgroundColor: 'rgba(49, 201, 108, 0.1)' },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
    statusTextPending: { color: theme.primary },
    statusTextDone: { color: '#66DA92' },
    
    cardBody: {
      marginBottom: 16,
    },
    customerNameText: {
      color: '#FFF',
      fontSize: 20,
      fontWeight: '800',
      marginBottom: 6,
    },
    serviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    serviceNameText: { color: '#DDD', fontSize: 14, fontWeight: '600' },
    dotSeparator: { color: '#555', marginHorizontal: 8 },
    durationText: { color: '#888', fontSize: 13 },
    barberSubText: { color: '#777', fontSize: 12, fontWeight: '500' },
    paymentInfoBadge: {
      marginTop: 10,
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderWidth: 1,
      borderRadius: 8,
    },
    paymentInfoBadgeCash: {
      backgroundColor: 'rgba(56, 189, 118, 0.14)',
      borderColor: 'rgba(56, 189, 118, 0.34)',
    },
    paymentInfoBadgeTransfer: {
      backgroundColor: hexToRgba(theme.primary, 0.14),
      borderColor: hexToRgba(theme.primary, 0.34),
    },
    paymentInfoBadgeNeutral: {
      backgroundColor: 'rgba(148, 163, 184, 0.12)',
      borderColor: 'rgba(148, 163, 184, 0.28)',
    },
    paymentInfoText: { color: '#EDEDED', fontSize: 11, fontWeight: '700' },

    cardActions: {
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: '#2A2A2A',
      paddingTop: 16,
    },
    btnAction: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    btnMain: { backgroundColor: theme.primary },
    btnMainText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    btnSec: { backgroundColor: '#222', borderWidth: 1, borderColor: '#333' },
    btnSecText: { color: '#FFF', fontSize: 13, fontWeight: '700' },

    swipeAction: {
      width: 90,
      borderRadius: 24,
      backgroundColor: '#9D2121',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 12,
    },
    swipeActionText: { color: '#fff', fontSize: 12, fontWeight: '800' },
    emptyContainer: { padding: 40, alignItems: 'center', backgroundColor: '#111', borderRadius: 20, borderStyle: 'dashed', borderWidth: 1, borderColor: '#333' },
    emptyTitle: { color: '#555', fontSize: 14, fontWeight: '600' },
    errorText: { color: '#ff7b7b', textAlign: 'center', marginBottom: 10 },
    logo: { width: 55, height: 55 },
  });

export default Home;
