// Home.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { getUserProfile } from '../services/authStorage';
import {
  fetchAppointments,
  fetchBarbers,
  Appointment,
  Barber,
  updateAppointmentStatus,
  deleteAppointment,
} from '../services/api';
import { Copy } from 'lucide-react-native';

type Props = {
  navigation: any;
};

function Home({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [shopSlug, setShopSlug] = useState('');
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(selectedDate),
    [selectedDate],
  );

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setError('');
        const [barbersRes, appointmentsRes] = await Promise.all([
          fetchBarbers(),
          fetchAppointments({ date: selectedDate.toISOString().slice(0, 10) }),
        ]);
        setBarbers(barbersRes.barbers);
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
    [selectedDate],
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
        if (storedUser?.shopSlug) setShopSlug(storedUser.shopSlug);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
      const intervalId = setInterval(() => loadData(true), 15000);
      return () => clearInterval(intervalId);
    }, [loadData]),
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleShiftDate = (days: number) => {
    setSelectedDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + days);
      return next;
    });
  };

  const greetingName = fullName || 'Barbería';

  const handleCopyLink = () => {
    Alert.alert('¡Copiado!', 'El link de turnos se copió al portapapeles.');
  };

  const handleComplete = async (appointmentId: string) => {
    try {
      await updateAppointmentStatus(appointmentId, 'completed');
      await loadData(true);
    } catch (err: any) {
      setError(err?.message ?? 'No se pudo actualizar');
    }
  };

  const handleRelease = async (appointmentId: string) => {
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
              await loadData(true);
            } catch (err: any) {
              setError(err?.message ?? 'No se pudo liberar el turno');
            }
          },
        },
      ]
    );
  };

  const renderAppointmentCard = (appointment: Appointment) => {
    const barberName =
      appointment.barber && typeof appointment.barber === 'object'
        ? appointment.barber.fullName
        : 'Sin asignar';
    const isCompleted = appointment.status === 'completed';

    return (
      <View
        key={appointment._id}
        style={[styles.appointmentCard, isCompleted && styles.cardCompleted]}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.cardTime}>
              {formatTimeOnly(appointment.startTime)}
            </Text>
            <Text style={styles.cardService}>
              {appointment.service}
              {appointment.durationMinutes ? ` · ${appointment.durationMinutes}min` : ''}
            </Text>
          </View>
          <View
            style={[
              styles.statusTag,
              isCompleted ? styles.statusTagCompleted : styles.statusTagPending,
            ]}
          >
            <Text
              style={[
                styles.statusTagText,
                isCompleted ? styles.textCompleted : styles.textPending,
              ]}
            >
              {isCompleted ? '✓ Completado' : '• Pendiente'}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Cliente:</Text>
            <Text style={styles.infoValue}>{appointment.customerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Barbero:</Text>
            <Text style={styles.infoValue}>{barberName}</Text>
          </View>
          {appointment.notes ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Teléfono:</Text>
              <Text style={styles.infoValue}>{appointment.notes}</Text>
            </View>
          ) : null}
        </View>
        {!isCompleted && (
          <View style={styles.btn}>
            <Pressable
              style={styles.btnComplete}
              onPress={() => handleComplete(appointment._id)}
            >
              <Text style={styles.btnCompleteText}>Finalizar Atención</Text>
            </Pressable>
            <Pressable
              style={[styles.btnComplete, styles.btnRelease]}
              onPress={() => handleRelease(appointment._id)}
            >
              <Text style={styles.btnCompleteText}>Liberar Turno</Text>
            </Pressable>
          </View>
        )}
      </View>
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
          source={require('../assets/LogoOrion.png')}
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
            tintColor="#B89016"
          />
        }
      >
        {!!error && <Text style={styles.errorText}>{error}</Text>}

        {/* LINK DE COMPARTIR */}
        {shopSlug ? (
          <Pressable style={styles.shareCard} onPress={handleCopyLink}>
            <View style={styles.shareTextContent}>
              <Text style={styles.shareTitle}>
                Enlace de autogestión para clientes
              </Text>
              <Text style={styles.shareSubtitle}>
                tubarberia.com/book/{shopSlug}
              </Text>
            </View>
            <Copy color="#B89016" size={20} />
          </Pressable>
        ) : null}

        {/* EQUIPO */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tu Equipo</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.barbersList}
          >
            {barbers.map(barber => (
              <Pressable
                key={barber._id}
                style={styles.barberAvatarCard}
                onPress={() =>
                  navigation.navigate('Barber-Home', {
                    barberId: barber._id,
                    barberName: barber.fullName,
                  })
                }
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {barber.fullName.charAt(0)}
                  </Text>
                </View>
                <Text style={styles.barberNameLabel}>
                  {barber.fullName.split(' ')[0]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* AGENDA */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agenda del día</Text>

          {/* SELECTOR DE FECHA */}
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

          <View style={{ marginTop: 15 }}>
            {loading && !appointments.length ? (
              <ActivityIndicator color="#B89016" style={{ marginTop: 40 }} />
            ) : appointments.length ? (
              appointments.map(renderAppointmentCard)
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay turnos programados.</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function formatTimeOnly(value: string) {
  return new Date(value).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Cordoba',
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  topHeader: {
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  welcomeText: { color: '#888', fontSize: 16, fontWeight: '500' },
  nameText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  shareCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 20,
  },
  shareTextContent: { flex: 1 },
  shareTitle: {
    color: '#888',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  shareSubtitle: { color: '#fff', fontSize: 14, marginTop: 2, fontWeight: '500' },
  section: { marginTop: 25 },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  barbersList: { paddingRight: 20 },
  barberAvatarCard: { alignItems: 'center', marginRight: 20 },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#B89016', fontSize: 20, fontWeight: 'bold' },
  barberNameLabel: { color: '#888', fontSize: 12, marginTop: 8, fontWeight: '600' },

  // SELECTOR DE FECHA
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

  appointmentCard: {
    backgroundColor: '#1C1C1C',
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#252525',
  },
  cardCompleted: { opacity: 0.6 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  cardTime: { color: '#B89016', fontSize: 20, fontWeight: '800' },
  cardService: { color: '#fff', fontSize: 14, fontWeight: '600', marginTop: 2 },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusTagPending: { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  statusTagCompleted: { backgroundColor: 'rgba(46, 204, 113, 0.1)' },
  statusTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  textPending: { color: '#f1c40f' },
  textCompleted: { color: '#00ff6aff', opacity: 4 },
  cardBody: {
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#252525',
  },
  infoRow: { flexDirection: 'row', gap: 10 },
  infoLabel: { color: '#666', fontSize: 13 },
  infoValue: { color: '#ddd', fontSize: 13, fontWeight: '600' },
  btnComplete: {
    backgroundColor: '#252525',
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#333',
    width: 140,
    paddingVertical: 7,
    paddingHorizontal: 2,
  },
  btnRelease: { marginTop: 8 },
  btnCompleteText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyContainer: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#444', fontSize: 14, fontWeight: '500' },
  errorText: { color: '#ff7b7b', fontSize: 13, fontWeight: '600', marginTop: 20 },
  logo: { width: 70, height: 70 },
  btn: { flexDirection: 'row', flex: 1, justifyContent: 'space-between' },
});

export default Home;
