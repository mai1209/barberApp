// NAV.tsx
import React, { useEffect, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Animated,
  Platform,
} from 'react-native';
import { House, Plus, UserRound, Settings } from 'lucide-react-native';

type MainRoute = 'Home' | 'List-Barber' | 'Reservas';

type Props = {
  currentRouteName?: string;
  onNavigate: (routeName: any) => void;
};

const HIDDEN_ROUTES = new Set(['Login', 'Register']);

function resolveActiveRoute(routeName?: string): MainRoute | undefined {
  if (
    routeName === 'Barber-Home' ||
    routeName === 'Register-Employed' ||
    routeName === 'List-Barber'
  ) {
    return 'List-Barber';
  }
  if (routeName === 'Home') return 'Home';
  if (routeName === 'Reservas') return 'Reservas';
  return undefined;
}

const NavButton = ({
  isActive,
  onPress,
  label,
  Icon,
}: {
  isActive: boolean;
  onPress: () => void;
  label: string;
  Icon: any;
}) => {
  const animValue = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: isActive ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40,
    }).start();
  }, [isActive]);

  // Estilos animados para el fondo y el ancho
  const activeButtonStyle = {
    backgroundColor: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', '#B89016'],
    }),
    paddingHorizontal: animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [12, 16],
    }),
  };

  return (
    <Pressable onPress={onPress}>
      <Animated.View style={[styles.navItem, activeButtonStyle]}>
        <Icon
          size={20}
          strokeWidth={2.5}
          color={isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)'}
        />
        {isActive && (
          <Animated.Text
            numberOfLines={1}
            style={[styles.text, { opacity: animValue }]}
          >
            {label}
          </Animated.Text>
        )}
      </Animated.View>
    </Pressable>
  );
};

function Nav({ currentRouteName, onNavigate }: Props) {
  if (!currentRouteName || HIDDEN_ROUTES.has(currentRouteName)) {
    return null;
  }

  const activeRoute = resolveActiveRoute(currentRouteName);

  return (
    <View style={styles.safeArea}>
      <View style={styles.floatingContainer}>
        <View style={styles.navInner}>
          <NavButton
            isActive={activeRoute === 'Home'}
            onPress={() => onNavigate('Home')}
            label="Inicio"
            Icon={House}
          />

          <NavButton
            isActive={activeRoute === 'Reservas'}
            onPress={() => onNavigate('Reservas')}
            label="Nuevo Turno"
            Icon={Plus}
          />

          <NavButton
            isActive={activeRoute === 'List-Barber'}
            onPress={() => onNavigate('List-Barber')}
            label="Barberos"
            Icon={UserRound}
          />

          <NavButton label="Ajustes" Icon={Settings} />
        </View>
      </View>
      <View style={styles.footer}>
        <Text style={styles.codexText}>BarberApp by CODEX®</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20, // Más espacio en iOS para el home indicator
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  floatingContainer: {
    backgroundColor: '#1C1C1C',
    borderRadius: 35,
    width: '92%', // Un poquito más ancho para dar aire
    maxWidth: 380,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  navInner: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribución uniforme
    alignItems: 'center',
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44, // Altura un poco más compacta
    borderRadius: 22,
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 12, // Fuente más chica para asegurar que entre
    fontWeight: '800',
    marginLeft: 6,
  },
  footer: {
    marginTop: 8,
  },
  codexText: {
    color: '#555',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});

export default Nav;
