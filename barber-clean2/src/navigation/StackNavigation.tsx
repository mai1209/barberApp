import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View } from 'react-native';

import Login from '../screnn/Login';
import Register from '../screnn/Register';
import Home from '../screnn/Home';
import ReservasForm from '../screnn/ReservasForm';
import RegisterEmployed from '../screnn/RegisterEmployed';
import ListBarber from '../screnn/ListBarber';
import Nav from '../screnn/Nav';
import BarberDashboard from '../screnn/BarberDashboard';
import MetricsScreen from '../screnn/MetricsScreen';
import OwnerMetricsScreen from '../screnn/OwnerMetricsScreen';
import AppearanceSettingsScreen from '../screnn/AppearanceSettingsScreen';
import ChangePasswordScreen from '../screnn/ChangePasswordScreen';
import RecoverPasswordScreen from '../screnn/RecoverPasswordScreen';
import SettingsScreen from '../screnn/SettingsScreen';
import ScreenGradient from '../components/ScreenGradient';
import { navigationRef } from '../../App';

const Stack = createNativeStackNavigator();

type Props = {
  currentRouteName?: string;
  initialRouteName?: 'Login' | 'Home';
};

export default function StackNavigator({ currentRouteName, initialRouteName = 'Login' }: Props) {
  return (
    <View style={styles.container}>
      <ScreenGradient />

      <View style={styles.stackContainer}>
        <Stack.Navigator
          initialRouteName={initialRouteName}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="Login" component={Login} />
          <Stack.Screen name="Register" component={Register} />
          <Stack.Screen name="Home" component={Home} />
          <Stack.Screen name="Reservas" component={ReservasForm} />
          <Stack.Screen name="Register-Employed" component={RegisterEmployed} />
          <Stack.Screen name="List-Barber" component={ListBarber} />
          <Stack.Screen name="Barber-Home" component={BarberDashboard} />
          <Stack.Screen name="Metrics" component={MetricsScreen} />
          <Stack.Screen name="Owner-Metrics" component={OwnerMetricsScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Appearance-Settings" component={AppearanceSettingsScreen} />
          <Stack.Screen name="Change-Password" component={ChangePasswordScreen} />
          <Stack.Screen name="Recover-Password" component={RecoverPasswordScreen} />
        </Stack.Navigator>
      </View>

      <Nav currentRouteName={currentRouteName} onNavigate={routeName => {
        navigationRef.navigate(routeName as never);
      }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#08080D',
  },
  stackContainer: {
    flex: 1,
  },
});
