import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Text,
  Platform,
  Pressable,
  ActivityIndicator,
  Alert,
  PanResponder,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appointment,
  fetchBarberAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from '../services/api';

type Props = {
  navigation: any;
  route: {
    params: {
      barberId: string;
      barberName?: string;
    };
  };
};

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoLineRow}>
      <Text style={styles.infoLineLabel}>{label}</Text>
      <Text style={styles.infoLineValue}>{value}</Text>
    </View>
  );
}

function BarberDashboard({ route, navigation }: Props) {
  const { barberId, barberName } = route.params;

  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const dateRef = useRef(date);

  useEffect(() => {
    dateRef.current = date;
  }, [date]);

  const isToday = useMemo(() => isSameDay(date, new Date()), [date]);

  const formattedHeaderDate = useMemo(() => {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }, [date]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const offset = index - 3;
      const itemDate = addDays(date, offset);

      return {
        key: `${itemDate.toISOString()}-${index}`,
        date: itemDate,
        isSelected: isSameDay(itemDate, date),
        isToday: isSameDay(itemDate, new Date()),
        dayName: new Intl.DateTimeFormat('es-AR', {
          weekday: 'short',
        }).format(itemDate),
        dayNumber: new Intl.DateTimeFormat('es-AR', {
          day: '2-digit',
        }).format(itemDate),
      };
    });
  }, [date]);

  const dateParam = useMemo(() => formatDateParam(date), [date]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBarberAppointments(barberId, dateParam);

      setAppointments(
        res.appointments.filter((item: Appointment) => item.status !== 'cancelled'),
      );
      setError('');
    } catch (err: any) {
      setError(err?.message ?? 'No pudimos cargar los turnos');
    } finally {
      setLoading(false);
    }
  }, [barberId, dateParam]);

  useFocusEffect(
    useCallback(() => {
      loadAppointments();
      const intervalId = setInterval(() => loadAppointments(), 15000);
      return () => clearInterval(intervalId);
    }, [loadAppointments]),
  );

  useEffect(() => {
    loadAppointments();
  }, [date, loadAppointments]);

  const handleShiftDate = (days: number) => {
    setDate(prev => addDays(prev, days));
  };

  const handleSelectDate = (selected: Date) => {
    setDate(selected);
  };

  const handleGoToToday = () => {
    setDate(new Date());
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

  const handleComplete = async (appointmentId: string) => {
    try {
      await updateAppointmentStatus(appointmentId, 'completed');

      setAppointments(prev =>
        prev.map(app =>
          app._id === appointmentId ? { ...app, status: 'completed' } : app,
        ),
      );
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'No se pudo actualizar el turno');
    }
  };

  const handleRelease = (appointmentId: string) => {
    Alert.alert(
      'Liberar Turno',
      '¿Estás seguro que deseas liberar este turno?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAppointment(appointmentId);
              setAppointments(prev => prev.filter(app => app._id !== appointmentId));
            } catch (err: any) {
              Alert.alert('Error', err?.message ?? 'No se pudo liberar el turno');
            }
          },
        },
      ],
    );
  };

  const renderAppointmentCard = (appointment: Appointment, index: number) => {
    const isCompleted = appointment.status === 'completed';

    return (
      <View
        key={appointment._id}
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
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.headerSubtitle}>BARBER DASHBOARD</Text>
          <Text style={styles.headerTitle}>{barberName || 'Mi Agenda'}</Text>

          <Pressable
            onPress={() => navigation.navigate('Reservas')}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>+ Nuevo Turno</Text>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.agendaTopRow}>
            <Text style={styles.sectionTitle}>Agenda del día</Text>

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
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {loading ? (
              <ActivityIndicator color="#B89016" style={{ marginTop: 40 }} />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  scrollContent: {
    paddingBottom: 100,
  },

  header: {
    marginTop: Platform.OS === 'ios' ? 70 : 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginBottom: 22,
  },

  headerSubtitle: {
    color: '#B89016',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
  },

  headerTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 5,
    textAlign: 'center',
  },

  addBtn: {
    backgroundColor: '#B89016',
    paddingVertical: 10,
    paddingHorizontal: 25,
    borderRadius: 20,
    marginTop: 18,
  },

  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  section: {
    paddingHorizontal: 20,
  },

  agendaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },

  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },

  todayButton: {
    backgroundColor: 'rgba(184, 144, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 22, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  todayButtonText: {
    color: '#B89016',
    fontSize: 12,
    fontWeight: '700',
  },

  dateHeroCard: {
    backgroundColor: '#1C1C1C',
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
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#303030',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dateCircleBtnText: {
    color: '#B89016',
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
    backgroundColor: 'rgba(184, 144, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 22, 0.22)',
  },

  dateHeroBadgeText: {
    color: '#B89016',
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
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
    position: 'relative',
  },

  weekDayChipActive: {
    backgroundColor: 'rgba(184, 144, 22, 0.14)',
    borderColor: 'rgba(184, 144, 22, 0.32)',
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
    color: '#B89016',
  },

  weekTodayDot: {
    position: 'absolute',
    bottom: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#B89016',
  },

  appointmentCard: {
    position: 'relative',
    backgroundColor: '#1C1C1C',
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
    backgroundColor: '#B89016',
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
    backgroundColor: '#181818',
    borderWidth: 1,
    borderColor: '#2E2E2E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  cardTimeMain: {
    color: '#B89016',
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
    backgroundColor: 'rgba(184, 144, 22, 0.10)',
    borderColor: 'rgba(184, 144, 22, 0.22)',
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
    backgroundColor: '#181818',
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
    backgroundColor: '#B89016',
    borderColor: '#B89016',
  },

  cardActionSecondary: {
    flex: 1,
    backgroundColor: '#222',
    borderColor: '#333',
  },

  cardActionPrimaryText: {
    color: '#111',
    fontSize: 12,
    fontWeight: '800',
  },

  cardActionSecondaryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  emptyContainer: {
    backgroundColor: '#171717',
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
    color: '#ff8080',
    textAlign: 'center',
    marginBottom: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});

export default BarberDashboard;