import React, { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, Platform, View } from 'react-native'; 
import { DarkTheme, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import StackNavigator from './src/navigation/StackNavigation';
import { getCurrentUser, savePushTokenApi } from './src/services/api';
import {
  getToken,
  getUserProfile,
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
        const storedUser = await getUserProfile();

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
        } catch (error: any) {
          const unauthorized = error?.status === 401 || error?.status === 403;

          if (unauthorized) {
            await removeToken();
            await removeUserProfile();

            if (isMounted) {
              setInitialRouteName('Login');
            }
          } else if (isMounted) {
            if (storedUser) {
              await saveUserProfile(storedUser);
            }
            setInitialRouteName('Home');
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
  let unsubscribeRefresh: (() => void) | undefined;
  let unsubscribeForeground: (() => void) | undefined;

  const initNotifications = async () => {
    try {
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
        } catch (err: any) {
          console.log('No se pudo enviar token al backend:', err?.message);
        }
      }

      unsubscribeRefresh = messaging().onTokenRefresh(async newToken => {
        await AsyncStorage.setItem('@push_token', newToken);
        try {
          await savePushTokenApi(newToken);
        } catch (err: any) {
          console.log('No se pudo enviar token refrescado:', err?.message);
        }
      });

      unsubscribeForeground = messaging().onMessage(async remoteMessage => {
        Alert.alert(
          remoteMessage.notification?.title || 'Notificación',
          remoteMessage.notification?.body || 'Tienes una nueva notificación'
        );
      });
    } catch (e) {
      console.log("Error en initNotifications:", e);
    }
  };

  initNotifications();

  return () => {
    unsubscribeForeground?.();
    unsubscribeRefresh?.();
  };
	}, []);

  if (!sessionReady) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
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
      </GestureHandlerRootView>
    );
  }
	
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
  );
}
