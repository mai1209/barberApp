import React, { useMemo } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  BookOpen,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Link2,
  Scissors,
  Store,
  Users,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const PUBLIC_BOOKING_BASE = 'https://barberappbycodex.com';

type Props = {
  navigation: any;
};

type StepCardProps = {
  step: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  actionLabel: string;
  onPress: () => void;
  styles: any;
  theme: any;
};

function StepCard({
  step,
  title,
  description,
  icon: Icon,
  actionLabel,
  onPress,
  styles,
  theme,
}: StepCardProps) {
  return (
    <View style={styles.stepCard}>
      <View style={styles.stepHeader}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>{step}</Text>
        </View>
        <View style={styles.stepIcon}>
          <Icon size={18} color={theme.primary} />
        </View>
      </View>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepDescription}>{description}</Text>
      <Pressable style={styles.stepButton} onPress={onPress}>
        <Text style={styles.stepButtonText}>{actionLabel}</Text>
        <ChevronRight size={16} color={theme.textOnPrimary} />
      </Pressable>
    </View>
  );
}

function TipRow({
  icon: Icon,
  title,
  text,
  styles,
  theme,
}: {
  icon: React.ComponentType<any>;
  title: string;
  text: string;
  styles: any;
  theme: any;
}) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>
        <Icon size={16} color={theme.primary} />
      </View>
      <View style={styles.tipBody}>
        <Text style={styles.tipTitle}>{title}</Text>
        <Text style={styles.tipText}>{text}</Text>
      </View>
    </View>
  );
}

export default function UsageGuideScreen({ navigation }: Props) {
  const { theme, shopSlug } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const shareLink = useMemo(() => {
    if (!shopSlug) return '';
    const base = PUBLIC_BOOKING_BASE.replace(/\/+$/, '');
    return `${base}/${shopSlug}`;
  }, [shopSlug]);

  const handleCopyLink = async () => {
    if (!shareLink) {
      Alert.alert(
        'Todavía no está listo',
        'Cuando tu local tenga shopSlug, acá vas a poder copiar el link de turnos.',
      );
      return;
    }

    Clipboard.setString(shareLink);
    try {
      await Share.share({ message: shareLink });
    } catch (_error) {}
    Alert.alert('Link copiado', 'Ya podés compartirlo con tus clientes.');
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroIcon}>
          <BookOpen size={24} color={theme.primary} />
        </View>
        <Text style={styles.heroEyebrow}>Centro de ayuda</Text>
        <Text style={styles.heroTitle}>Cómo arrancar con la app</Text>
        <Text style={styles.heroText}>
          Si es tu primera vez, seguí estos pasos en orden. En menos de cinco
          minutos dejás lista la barbería para tomar turnos.
        </Text>
      </View>

      <Text style={styles.sectionLabel}>Primeros pasos</Text>
      <StepCard
        step="1"
        title="Cargá tus servicios"
        description="Agregá cada servicio con su duración y precio. Esto define lo que el cliente va a poder elegir al pedir un turno."
        icon={Scissors}
        actionLabel="Ir a servicios"
        onPress={() => navigation.navigate('Service-Settings')}
        styles={styles}
        theme={theme}
      />
      <StepCard
        step="2"
        title="Sumá tus barberos"
        description="Creá al menos un barbero con sus horarios, días de trabajo y foto si querés personalizar más la experiencia."
        icon={Users}
        actionLabel="Ir a barberos"
        onPress={() => navigation.navigate('List-Barber')}
        styles={styles}
        theme={theme}
      />
      <StepCard
        step="3"
        title="Configurá cómo cobrás"
        description="Definí si aceptás efectivo, transferencia o seña online con Mercado Pago para que el cliente vea las opciones correctas."
        icon={CreditCard}
        actionLabel="Ir a cobros"
        onPress={() => navigation.navigate('Payment-Settings')}
        styles={styles}
        theme={theme}
      />
      <StepCard
        step="4"
        title="Compartí tu enlace de turnos"
        description="Copiá tu link y mandalo por WhatsApp, Instagram o donde quieras. Ese link abre la web para que tus clientes pidan turnos solos."
        icon={Link2}
        actionLabel="Copiar enlace"
        onPress={handleCopyLink}
        styles={styles}
        theme={theme}
      />

      <Text style={styles.sectionLabel}>Dónde está cada cosa</Text>
      <View style={styles.infoCard}>
        <TipRow
          icon={Store}
          title="Ajustes"
          text="Acá tenés colores, servicios, notificaciones, cierre de barbería, pagos, suscripción y seguridad."
          styles={styles}
          theme={theme}
        />
        <TipRow
          icon={CalendarDays}
          title="Home"
          text="Desde el inicio ves los turnos del día, copiás el link de autogestión y entrás a métricas e historial."
          styles={styles}
          theme={theme}
        />
        <TipRow
          icon={Users}
          title="Barberos"
          text="En el listado de barberos podés crear, editar o eliminar perfiles, y entrar al panel de cada uno."
          styles={styles}
          theme={theme}
        />
      </View>

      <Text style={styles.sectionLabel}>Consejo rápido</Text>
      <View style={styles.noteCard}>
        <Text style={styles.noteTitle}>Orden recomendado</Text>
        <Text style={styles.noteText}>
          Primero cargá servicios. Después sumá barberos. Recién ahí configurá
          cobros y compartí el link. Así evitás que el cliente entre a una web
          incompleta.
        </Text>
      </View>
    </ScrollView>
  );
}

function createStyles(theme: any) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 72 : 28,
      paddingHorizontal: 20,
      paddingBottom: 130,
    },
    heroCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      marginBottom: 20,
    },
    heroIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 14,
    },
    heroEyebrow: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroTitle: {
      color: theme.textPrimary,
      fontSize: 28,
      fontWeight: '800',
      marginTop: 6,
    },
    heroText: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },
    sectionLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    stepCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      marginBottom: 12,
    },
    stepHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    stepBadge: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    stepBadgeText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: '900',
    },
    stepIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    stepDescription: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 6,
      marginBottom: 14,
    },
    stepButton: {
      height: 44,
      borderRadius: 14,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    stepButtonText: {
      color: theme.textOnPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    infoCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      marginBottom: 18,
      gap: 14,
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    tipIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: theme.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tipBody: {
      flex: 1,
    },
    tipTitle: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
    tipText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 3,
    },
    noteCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
    },
    noteTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '800',
      marginBottom: 6,
    },
    noteText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
