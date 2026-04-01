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
import { getUserProfile } from '../services/authStorage';
import {
  fetchAppointments,
  Appointment,
  updateAppointmentStatus,
  deleteAppointment,
} from '../services/api';
import { Copy } from 'lucide-react-native';

type Props = {
  navigation: any;
};

const PUBLIC_BOOKING_BASE = 'https://barberappbycodex.com';
const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(sanitized.length === 3 ? sanitized.repeat(2) : sanitized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const sanitizeWhatsappNumber = (value: string) =>
  value.replace(/[^\d]/g, '');

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

function Home({ navigation }: Props) {
  const { theme, shopSlug } = useTheme();
  const [fullName, setFullName] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

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

  const isToday = useMemo(() => {
    return isSameDay(selectedDate, new Date());
  }, [selectedDate]);

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
        dayName: new Intl.DateTimeFormat('es-AR', {
          weekday: 'short',
        }).format(date),
        dayNumber: new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
        }).format(date),
      };
    });
  }, [selectedDate]);

  const loadData = useCallback(
    async (isRefresh = false, targetDate?: Date) => {
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
    },
    [],
  );

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const storedUser = await getUserProfile<{
        fullName?: string;
        shopSlug?: string;
      }>();

      if (isMounted) {
        if (storedUser?.fullName) setFullName(storedUser.fullName);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(false, selectedDateRef.current);

      const intervalId = setInterval(() => {
        loadData(true, selectedDateRef.current);
      }, 15000);

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

  const handleShiftDate = (days: number) => {
    setSelectedDate(prev => addDays(prev, days));
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };

  const handleGoToToday = () => {
    setSelectedDate(new Date());
  };

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
    Alert.alert(
      'Completar turno',
      '¿Estás seguro que deseas completar el turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Completar',
          onPress: async () => {
            try {
              await updateAppointmentStatus(appointmentId, 'completed');
              await loadData(true, selectedDateRef.current);
            } catch (err: any) {
              setError(err?.message ?? 'No se pudo actualizar');
            }
          },
        },
      ],
    );
  };

  const handleRelease = async (appointmentId: string) => {
    const appointment = appointments.find(item => item._id === appointmentId);
    Alert.alert(
      'Liberar Turno',
      'Elegí si querés solo liberar el turno o cancelarlo avisando al cliente por WhatsApp.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId);
              await loadData(true, selectedDateRef.current);
            } catch (err: any) {
              setError(err?.message ?? 'No se pudo liberar el turno');
            }
          },
        },
        {
          text: 'Cancelar turno',
          onPress: async () => {
            try {
              if (!appointment?.notes) {
                Alert.alert('Falta WhatsApp', 'Este turno no tiene número de cliente cargado.');
                return;
              }

              const phone = sanitizeWhatsappNumber(appointment.notes);
              if (!phone) {
                Alert.alert('WhatsApp inválido', 'El número del cliente no tiene un formato válido.');
                return;
              }

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
              setError(err?.message ?? 'No se pudo cancelar el turno');
            }
          },
        },
      ],
    );
  };

  const datePanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dy) < 10,
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -40) {
            handleShiftDate(1);
          } else if (gestureState.dx > 40) {
            handleShiftDate(-1);
          }
        },
      }),
    [],
  );

  const handleSwipeableOpen = (appointmentId: string) => {
    const previousId = openedSwipeableIdRef.current;
    if (previousId && previousId !== appointmentId) {
      swipeableRefs.current[previousId]?.close();
    }
    openedSwipeableIdRef.current = appointmentId;
  };

  const renderAppointmentCard = (appointment: Appointment, index: number) => {
    const barberName =
      appointment.barber && typeof appointment.barber === 'object'
        ? appointment.barber.fullName
        : 'Sin asignar';

    const isCompleted = appointment.status === 'completed';

    const card = (
      <View
        style={[
          styles.appointmentCard,
          isCompleted && styles.appointmentCardCompleted,
          { marginTop: index === 0 ? 0 : 14 },
        ]}
      >
        <View
          style={[
            styles.cardGlowLine,
            isCompleted && styles.cardGlowLineCompleted,
          ]}
        />

        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTimeBox}>
            <Text style={styles.cardTimeMain}>
              {formatTimeOnly(appointment.startTime)}
            </Text>
            <Text style={styles.cardTimeSub}>HORARIO</Text>
          </View>

          <View style={styles.cardHeaderContent}>
            <View style={styles.cardTitleRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.cardServiceTitle}>
                  {appointment.service}
                </Text>
                <Text style={styles.cardDurationText}>
                  {appointment.durationMinutes
                    ? `${appointment.durationMinutes} min`
                    : 'Duración no definida'}
                </Text>
              </View>

              <View
                style={[
                  styles.cardStatusPill,
                  isCompleted
                    ? styles.cardStatusPillCompleted
                    : styles.cardStatusPillPending,
                ]}
              >
                <Text
                  style={[
                    styles.cardStatusText,
                    isCompleted
                      ? styles.cardStatusTextCompleted
                      : styles.cardStatusTextPending,
                  ]}
                >
                  {isCompleted ? 'Completado' : 'Pendiente'}
                </Text>
              </View>
            </View>

            <View style={styles.cardInfoPanel}>
              <InfoLine label="Cliente" value={appointment.customerName} />
              <InfoLine label="Barbero" value={barberName} />
              {appointment.notes ? (
                <InfoLine label="Teléfono Cliente" value={appointment.notes} />
              ) : null}
            </View>
          </View>
        </View>

        {!isCompleted && (
          <View style={styles.cardButtonsRow}>
            <Pressable
              style={[styles.cardActionBtn, styles.cardActionPrimary]}
              onPress={() => handleComplete(appointment._id)}
            >
              <Text style={styles.cardActionPrimaryText}>
                Finalizar Atención
              </Text>
            </Pressable>

            <Pressable
              style={[styles.cardActionBtn, styles.cardActionSecondary]}
              onPress={() => handleRelease(appointment._id)}
            >
              <Text style={styles.cardActionSecondaryText}>Liberar</Text>
            </Pressable>
          </View>
        )}
      </View>
    );

    if (isCompleted) {
      return <View key={appointment._id}>{card}</View>;
    }

    return (
      <Swipeable
        key={appointment._id}
        ref={ref => {
          swipeableRefs.current[appointment._id] = ref;
        }}
        overshootRight={false}
        renderRightActions={() => (
          <Pressable
            style={[styles.swipeAction, { marginTop: index === 0 ? 0 : 14 }]}
            onPress={() => {
              swipeableRefs.current[appointment._id]?.close();
              handleRelease(appointment._id);
            }}
          >
            <Text style={styles.swipeActionText}>Liberar</Text>
          </Pressable>
        )}
        onSwipeableOpen={() => handleSwipeableOpen(appointment._id)}
        onSwipeableClose={() => {
          if (openedSwipeableIdRef.current === appointment._id) {
            openedSwipeableIdRef.current = null;
          }
        }}
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

        <Image
          source={theme.logo}
          style={styles.logo}
          resizeMode="contain"
        />
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

        {shopSlug ? (
          <Pressable style={styles.shareCard} onPress={handleCopyLink}>
            <View style={styles.shareTextContent}>
              <Text style={styles.shareTitle}>
                Enlace de autogestión para clientes
              </Text>
              <Text style={styles.shareSubtitle}>{shareLink}</Text>
            </View>
            <Copy color={theme.primary} size={20} />
          </Pressable>
        ) : null}

        <Pressable
          style={styles.metricsCard}
          onPress={() => navigation.navigate('Owner-Metrics')}
        >
          <View style={styles.shareTextContent}>
            <Text style={styles.shareTitle}>Métricas del mes</Text>
            <Text style={styles.metricsSubtitle}>
              Ver resumen general por barbero y total del local
            </Text>
          </View>
          <Text style={styles.metricsCardAction}>Abrir</Text>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.agendaTopRow}>
            <Text style={styles.sectionTitle}>Agenda colectiva de turnos</Text>

            {!isToday && (
              <Pressable style={styles.todayButton} onPress={handleGoToToday}>
                <Text style={styles.todayButtonText}>Ir a hoy</Text>
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
                <View style={styles.dateBadgeRow}>
                  <View style={styles.dateHeroBadge}>
                    <Text style={styles.dateHeroBadgeText}>
                      {isToday ? 'HOY' : 'AGENDA'}
                    </Text>
                  </View>
                  <Text style={styles.dateHeroSwipeHint}>Deslizá o tocá</Text>
                </View>

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

                  {item.isToday && !item.isSelected ? (
                    <View style={styles.weekTodayDot} />
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={{ marginTop: 16 }}>
            {loading && !appointments.length ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
            ) : appointments.length ? (
              appointments.map(renderAppointmentCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>Sin turnos por ahora</Text>
                <Text style={styles.emptyText}>
                  No hay turnos programados para esta fecha.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.infoLineRow}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={styles.infoLineValue}>{value}</Text>
    </View>
  );
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatTimeOnly(value: string) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
  });
}

function capitalize(text: string) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },

    topHeader: {
      paddingHorizontal: 25,
      paddingTop: Platform.OS === 'ios' ? 60 : 20,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    welcomeText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '500',
    },

    nameText: {
      color: '#fff',
      fontSize: 28,
      fontWeight: '800',
    },

    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 120,
    },

    shareCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.2),
      marginTop: 20,
    },

    metricsCard: {
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 15,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#2A2A2A',
      marginTop: 12,
    },

    shareTextContent: {
      flex: 1,
    },

    shareTitle: {
      color: '#888',
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },

    shareSubtitle: {
      color: '#fff',
      fontSize: 14,
      marginTop: 2,
      fontWeight: '500',
    },

    metricsSubtitle: {
      color: '#CFCFCF',
      fontSize: 14,
      marginTop: 2,
      fontWeight: '500',
    },

    metricsCardAction: {
      color: theme.primary,
      fontSize: 13,
      fontWeight: '800',
    },

    section: {
      marginTop: 25,
    },

    sectionTitle: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },

    agendaTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },

    todayButton: {
      backgroundColor: hexToRgba(theme.primary, 0.12),
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.25),
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },

    todayButtonText: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '700',
    },

    dateHeroCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#2A2A2A',
      paddingTop: 15,
      paddingBottom: 13,
      overflow: 'hidden',
    },

    dateHeroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
    },

    dateCircleBtn: {
      width: 44,
      height: 44,
      borderRadius: 16,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: '#303030',
      alignItems: 'center',
      justifyContent: 'center',
    },

    dateCircleBtnText: {
      color: theme.primary,
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 28,
      marginTop: -2,
    },

    dateHeroTextWrap: {
      flex: 1,
      paddingHorizontal: 12,
    },

    dateBadgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },

    dateHeroBadge: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: hexToRgba(theme.primary, 0.12),
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.22),
    },

    dateHeroBadgeText: {
      color: theme.primary,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.2,
    },

    dateHeroSwipeHint: {
      color: '#5F5F5F',
      fontSize: 11,
      fontWeight: '600',
    },

    dateHeroTitle: {
      color: '#fff',
      fontSize: 20,
      fontWeight: '800',
    },

    dateHeroSubtitle: {
      color: '#8E8E8E',
      fontSize: 12,
      fontWeight: '500',
      marginTop: 3,
    },

    weekStripContent: {
      paddingHorizontal: 14,
      paddingTop: 15,
    },

    weekDayChip: {
      width: 64,
      height: 64,
      borderRadius: 18,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: '#2D2D2D',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
      position: 'relative',
    },

    weekDayChipActive: {
      backgroundColor: hexToRgba(theme.primary, 0.14),
      borderColor: hexToRgba(theme.primary, 0.32),
    },

    weekDayName: {
      color: '#7A7A7A',
      fontSize: 11,
      fontWeight: '700',
      marginBottom: 5,
    },

    weekDayNameActive: {
      color: '#E7D2A0',
    },

    weekDayNumber: {
      color: '#F2F2F2',
      fontSize: 18,
      fontWeight: '800',
    },

    weekDayNumberActive: {
      color: theme.primary,
    },

    weekTodayDot: {
      position: 'absolute',
      bottom: 9,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },

    appointmentCard: {
      position: 'relative',
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#252525',
      padding: 15,
      overflow: 'hidden',
    },

    appointmentCardCompleted: {
      opacity: 0.72,
    },

    cardGlowLine: {
      position: 'absolute',
      left: 0,
      top: 16,
      bottom: 16,
      width: 4,
      borderTopRightRadius: 10,
      borderBottomRightRadius: 10,
      backgroundColor: theme.primary,
    },

    cardGlowLineCompleted: {
      backgroundColor: '#31C96C',
    },

    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    cardTimeBox: {
      width: 78,
      minHeight: 78,
      borderRadius: 18,
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: '#2E2E2E',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },

    cardTimeMain: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '800',
    },

    cardTimeSub: {
      color: '#676767',
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: 1,
      marginTop: 4,
    },

    cardHeaderContent: {
      flex: 1,
    },

    cardTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    cardServiceTitle: {
      color: '#fff',
      fontSize: 15,
      fontWeight: '800',
    },

    cardDurationText: {
      color: '#7C7C7C',
      fontSize: 12,
      fontWeight: '500',
      marginTop: 4,
    },

    cardStatusPill: {
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderWidth: 1,
    },

    cardStatusPillPending: {
      backgroundColor: hexToRgba(theme.primary, 0.1),
      borderColor: hexToRgba(theme.primary, 0.22),
    },

    cardStatusPillCompleted: {
      backgroundColor: 'rgba(49, 201, 108, 0.10)',
      borderColor: 'rgba(49, 201, 108, 0.22)',
    },

    cardStatusText: {
      fontSize: 10,
      fontWeight: '800',
    },

    cardStatusTextPending: {
      color: '#E7C975',
    },

    cardStatusTextCompleted: {
      color: '#66DA92',
    },

    cardInfoPanel: {
      backgroundColor: theme.background,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: '#262626',
      padding: 11,
      gap: 9,
    },

    infoLineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 14,
    },

    infoLineLabel: {
      color: '#6B6B6B',
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0,
    },

    infoLineValue: {
      flex: 1,
      textAlign: 'right',
      color: '#ECECEC',
      fontSize: 12,
      fontWeight: '600',
    },

    cardButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 13,
    },

    cardActionBtn: {
      borderRadius: 15,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },

    cardActionPrimary: {
      flex: 1.5,
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },

    cardActionSecondary: {
      flex: 1,
      backgroundColor: '#222',
      borderColor: '#333',
    },

    cardActionPrimaryText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '800',
    },

    cardActionSecondaryText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '700',
    },

    swipeAction: {
      width: 108,
      borderRadius: 22,
      backgroundColor: '#9D2121',
      borderWidth: 1,
      borderColor: '#C23A3A',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 10,
    },

    swipeActionText: {
      color: '#fff',
      fontSize: 13,
      fontWeight: '800',
    },

    emptyContainer: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: '#252525',
      paddingVertical: 36,
      paddingHorizontal: 20,
      alignItems: 'center',
    },

    emptyTitle: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },

    emptyText: {
      color: '#6A6A6A',
      fontSize: 13,
      marginTop: 6,
      textAlign: 'center',
    },

    errorText: {
      color: '#ff7b7b',
      fontSize: 13,
      fontWeight: '600',
      marginTop: 20,
    },

    logo: {
      width: 70,
      height: 70,
    },
  });

export default Home;
