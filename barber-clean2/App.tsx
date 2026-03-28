import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native'; 
import { DarkTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StackNavigator from './src/navigation/StackNavigation';
import { getCurrentUser, savePushTokenApi } from './src/services/api';
import {
  getToken,
  removeToken,
  removeUserProfile,
  saveUserProfile,
} from './src/services/authStorage';
import { ThemeProvider } from './src/context/ThemeContext';

export const navigationRef = createNavigationContainerRef();

const appNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#020203',
    card: '#020203',
    border: '#11111A',
    primary: '#4819AD',
  },
};

export default function App() {
  const [currentRouteName, setCurrentRouteName] = useState<string | undefined>();
  const [initialRouteName, setInitialRouteName] = useState<'Login' | 'Home'>('Login');
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrapSession = async () => {
      try {
        const token = await getToken();

        if (!token) {
          if (isMounted) {
            setInitialRouteName('Login');
          }
          return;
        }

        try {
          const response = await getCurrentUser();
          await saveUserProfile(response.user);

          if (isMounted) {
            setInitialRouteName('Home');
          }
        } catch (_error) {
          await removeToken();
          await removeUserProfile();

          if (isMounted) {
            setInitialRouteName('Login');
          }
        }
      } finally {
        if (isMounted) {
          setSessionReady(true);
        }
      }
    };

    bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

useEffect(() => {
  const initNotifications = async () => {
    try {
      // Necesario en Android 13+ para evitar que requestPermission falle silenciosamente
      await messaging().registerDeviceForRemoteMessages();

      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const token = await messaging().getToken();
        console.log("✅ TOKEN:", token);
        await AsyncStorage.setItem('@push_token', token);
        try {
          await savePushTokenApi(token);
        } catch (err) {
          console.log('No se pudo enviar token al backend:', err?.message);
        }
      }

      // Refrescos de token → los persistimos y enviamos al backend
      const unsubscribeRefresh = messaging().onTokenRefresh(async newToken => {
        await AsyncStorage.setItem('@push_token', newToken);
        try {
          await savePushTokenApi(newToken);
        } catch (err) {
          console.log('No se pudo enviar token refrescado:', err?.message);
        }
      });

      // --- ESCUCHAR NOTIFICACIONES CON LA APP ABIERTA (Foreground) ---
      const unsubscribe = messaging().onMessage(async remoteMessage => {
        // Esto muestra una alerta nativa cuando llega algo y el barbero está mirando la app
        Alert.alert(
          remoteMessage.notification?.title || 'Notificación',
          remoteMessage.notification?.body || 'Tienes una nueva notificación'
        );
      });

      return () => {
        unsubscribe();
        unsubscribeRefresh();
      }; // Se desuscribe al desmontar el componente

    } catch (e) {
      console.log("Error en initNotifications:", e);
    }
  };

  initNotifications();
	}, []);

  if (!sessionReady) {
    return (
      <ThemeProvider>
        <View
          style={{
            flex: 1,
            backgroundColor: '#020203',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color="#B89016" />
        </View>
      </ThemeProvider>
    );
  }
	
  return (
    <ThemeProvider>
      <View style={{ flex: 1, backgroundColor: '#020203' }}>
        <NavigationContainer
          theme={appNavigationTheme}
          ref={navigationRef}
          onReady={() => {
            setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
          }}
          onStateChange={() => {
            setCurrentRouteName(navigationRef.getCurrentRoute()?.name);
          }}
        >
          <StackNavigator
            currentRouteName={currentRouteName}
            initialRouteName={initialRouteName}
          />
        </NavigationContainer>
      </View>
    </ThemeProvider>
  );
}
