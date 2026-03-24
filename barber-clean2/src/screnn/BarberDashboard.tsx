import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  Appointment,
  fetchBarberAppointments,
  updateAppointmentStatus,
  deleteAppointment,
} from '../services/api';

function formatDateParam(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type Props = {
  navigation: any;
  route: {
    params: {
      barberId: string;
      barberName?: string;
    };
  };
};

function BarberDashboard({ route, navigation }: Props) {
  const { barberId, barberName } = route.params;
  const [date, setDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isToday = date.toDateString() === new Date().toDateString();

  const formattedDate = useMemo(() => {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  }, [date]);

  const dateParam = useMemo(() => formatDateParam(date), [date]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchBarberAppointments(barberId, dateParam);
      setAppointments(res.appointments);
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

  const handleShiftDate = (days: number) => {
    setDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
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
        {/* Header */}
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

        {/* SELECTOR DE FECHA — mismo estilo que Home */}
        <View style={styles.dateSelectorCard}>
          <Pressable
            style={styles.dateArrowBtn}
            onPress={() => handleShiftDate(-1)}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>

          <View style={styles.dateCenterBlock}>
            {isToday && (
              <Text style={styles.dateTodayLabel}>HOY</Text>
            )}
            <Text style={styles.dateDayText}>
              {formattedDate.split(',')[0]}
            </Text>
            <Text style={styles.dateFullText}>
              {formattedDate.split(',').slice(1).join(',').trim()}
            </Text>
          </View>

          <Pressable
            style={styles.dateArrowBtn}
            onPress={() => handleShiftDate(1)}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>

        <Text style={styles.subtitle}>Agenda del día:</Text>

        <View style={styles.mainContainer}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {loading ? (
            <ActivityIndicator color="#B89016" style={{ marginTop: 40 }} />
          ) : appointments.length ? (
            appointments.map(appointment => (
              <View key={appointment._id} style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>
                      {formatDateTime(appointment.startTime)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusTag,
                      appointment.status === 'completed'
                        ? styles.statusTagCompleted
                        : styles.statusTagPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusTagText,
                        appointment.status === 'completed'
                          ? styles.textCompleted
                          : styles.textPending,
                      ]}
                    >
                      {appointment.status === 'completed'
                        ? '✓ LISTO'
                        : '• Pendiente'}
                    </Text>
                  </View>
                </View>

                <Text style={styles.serviceName}>
                  {appointment.service}
                  {appointment.durationMinutes ? ` · ${appointment.durationMinutes}min` : ''}
                </Text>

                <View style={styles.customerInfo}>
                  <Text style={styles.label}>Cliente:</Text>
                  <Text style={styles.customerName}>
                    {appointment.customerName}
                  </Text>
                </View>

                {appointment.notes ? (
                  <View style={styles.customerInfo}>
                    <Text style={styles.label}>Teléfono:</Text>
                    <Text style={styles.customerName}>{appointment.notes}</Text>
                  </View>
                ) : null}

                {appointment.status !== 'completed' && (
                  <Pressable
                    style={styles.completeBtn}
                    onPress={async () => {
                      try {
                        await updateAppointmentStatus(appointment._id, 'completed');
                        setAppointments(prev =>
                          prev.map(app =>
                            app._id === appointment._id
                              ? { ...app, status: 'completed' }
                              : app,
                          ),
                        );
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                  >
                    <Text style={styles.completeBtnText}>Finalizar Servicio</Text>
                  </Pressable>
                )}

                {appointment.status !== 'completed' && (
                  <Pressable
                    style={[styles.completeBtn, styles.releaseBtn]}
                    onPress={() => {
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
                                await deleteAppointment(appointment._id);
                                setAppointments(prev =>
                                  prev.filter(app => app._id !== appointment._id)
                                );
                              } catch (err) {
                                console.error(err);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.completeBtnText}>Liberar Turno</Text>
                  </Pressable>
                )}
              </View>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay turnos agendados.</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
  });
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  scrollContent: { paddingBottom: 100 },

  header: {
    marginTop: Platform.OS === 'ios' ? 70 : 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    marginBottom: 25,
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
    marginTop: 20,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // SELECTOR DE FECHA — mismo estilo que Home
  dateSelectorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 20,
  },
  dateArrowBtn: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#252525',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  dateArrowText: {
    color: '#B89016',
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 36,
  },
  dateCenterBlock: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  dateTodayLabel: {
    color: '#B89016',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 2,
  },
  dateDayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  dateFullText: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
    textTransform: 'capitalize',
  },

  subtitle: {
    color: '#fff',
    paddingBottom: 15,
    paddingTop: 25,
    marginHorizontal: 20,
    fontSize: 18,
    fontWeight: '700',
  },
  mainContainer: { paddingHorizontal: 20 },

  appointmentCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#252525',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBadge: {
    backgroundColor: '#252525',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  timeText: { color: '#B89016', fontWeight: '800', fontSize: 16 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagPending: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  statusTagCompleted: { backgroundColor: 'rgba(46, 204, 113, 0.1)' },
  statusTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  textPending: { color: '#f1c40f' },
  textCompleted: { color: '#2ecc71' },
  serviceName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 5,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 5,
  },
  label: { color: '#666', fontSize: 14 },
  customerName: { color: '#ddd', fontSize: 14, fontWeight: '600' },
  completeBtn: {
    backgroundColor: '#252525',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  releaseBtn: { marginTop: 8 },
  completeBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyText: { color: '#666', fontSize: 16 },
  errorText: { color: '#ff8080', textAlign: 'center', marginBottom: 10 },
});

export default BarberDashboard;
