import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ChevronRight,
  KeyRound,
  LogOut,
  Mail,
  Palette,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import { removeToken, removeUserProfile } from '../services/authStorage';

const SUPPORT_EMAIL = 'soporte@barberappbycodex.com';

type MenuItemProps = {
  icon: React.ComponentType<any>;
  label: string;
  description: string;
  onPress: () => void;
  danger?: boolean;
};

function MenuItem({
  icon: Icon,
  label,
  description,
  onPress,
  danger = false,
}: MenuItemProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
      <View style={[styles.iconWrap, danger && styles.iconWrapDanger]}>
        <Icon size={18} color={danger ? '#ff1414ff' : '#FF1493'} />
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemLabel, danger && styles.itemLabelDanger]}>{label}</Text>
        <Text style={styles.itemDescription}>{description}</Text>
      </View>
      <ChevronRight size={18} color="#6E7585" />
    </Pressable>
  );
}

export default function SettingsScreen({ navigation }: { navigation: any }) {
  const { applyUserTheme } = useTheme();
  const styles = createStyles();

  const handleLogout = async () => {
    Alert.alert('Cerrar sesion', 'Vas a salir de esta cuenta en este dispositivo.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesion',
        style: 'destructive',
        onPress: async () => {
          await removeToken();
          await removeUserProfile();
          applyUserTheme(null);
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  const handleSupportMail = async () => {
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Soporte BarberApp')}`;
    try {
      await Linking.openURL(url);
    } catch (_error) {
      Alert.alert('No pudimos abrir el mail', SUPPORT_EMAIL);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Ajustes</Text>
          <Text style={styles.subtitle}>Todo lo importante, explicado en simple.</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>Preferencias</Text>
      <View style={styles.groupCard}>
        <MenuItem
          icon={Palette}
          label="Personalizar aspecto"
          description="Logo, colores de botones, textos destacados, tarjetas y fondo."
          onPress={() => navigation.navigate('Appearance-Settings')}
        />
      </View>

      <Text style={styles.sectionLabel}>Seguridad y cuenta</Text>
      <View style={styles.groupCard}>
        <MenuItem
          icon={KeyRound}
          label="Cambiar contraseña"
          description="Actualizá la clave de acceso de esta cuenta."
          onPress={() => navigation.navigate('Change-Password')}
        />
        <View style={styles.separator} />
        <MenuItem
          icon={Mail}
          label="Recuperar contraseña"
          description="Te mandamos un código al mail para poner una nueva."
          onPress={() => navigation.navigate('Recover-Password')}
        />
      </View>

      <Text style={styles.sectionLabel}>Soporte</Text>
      <View style={styles.groupCard}>
        <MenuItem
          icon={Mail}
          label="Comunicate con soporte"
          description="Abrí un mail y te ayudamos con la configuración."
          onPress={handleSupportMail}
        />
      </View>

      <Text style={styles.sectionLabel}>Sesión</Text>
      <View style={styles.groupCard}>
        <MenuItem
          icon={LogOut}
          label="Cerrar sesión"
          description="Salir de esta cuenta en este dispositivo."
          onPress={handleLogout}
          danger
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemPressed: {
    opacity: 0.82,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 161, 255, 0.12)',
    marginRight: 12,
  },
  iconWrapDanger: {
    backgroundColor: 'rgba(255, 138, 138, 0.12)',
  },
  itemBody: {
    flex: 1,
    paddingRight: 12,
  },
  itemLabel: {
    color: '#F5F7FB',
    fontSize: 16,
    fontWeight: '700',
  },
  itemLabelDanger: {
    color: '#FFD0D0',
  },
  itemDescription: {
    color: '#95A0B5',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
});

function createStyles() {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: '#1c1c1c',
    },
    scrollContent: {
      paddingTop: Platform.OS === 'ios' ? 72 : 28,
      paddingHorizontal: 20,
      paddingBottom: 130,
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 18,
    },
    title: {
      color: '#FFFFFF',
      fontSize: 34,
      fontWeight: '800',
    },
    subtitle: {
      color: '#98A2B3',
      fontSize: 14,
      marginTop: 6,
    },
    sectionLabel: {
      color: '#6E7585',
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginBottom: 10,
      marginTop: 6,
    },
    groupCard: {
      backgroundColor: '#1c1c1c',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: 'rgba(110, 117, 133, 0.24)',
      marginBottom: 20,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 20,
      elevation: 8,
    },
    separator: {
      height: 1,
      backgroundColor: 'rgba(255,255,255,0.05)',
      marginLeft: 64,
    },
  
  });
}
