import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  getCurrentUser,
  PublicProfileSettings,
  updatePublicProfileSettings,
} from '../services/api';
import { getUserProfile } from '../services/authStorage';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';
import { hasActiveFreePlan } from '../services/planAccess';

type Props = {
  navigation: any;
};

type FormState = Required<
  Omit<PublicProfileSettings, 'googleRating' | 'googleReviewCount'>
> & {
};

const EMPTY_FORM: FormState = {
  subtitle: '',
  address: '',
  phone: '',
  googleMapsUrl: '',
  googleReviewsUrl: '',
  googlePlaceId: '',
  instagramUrl: '',
  linktreeUrl: '',
};

const FIELDS: Array<{
  key: keyof FormState;
  label: string;
  placeholder: string;
  keyboardType?: 'default' | 'numeric' | 'url' | 'phone-pad';
  multiline?: boolean;
}> = [
  {
    key: 'subtitle',
    label: 'Texto corto del local',
    placeholder: 'Ej: Corte y afeitado premium',
    multiline: true,
  },
  {
    key: 'address',
    label: 'Dirección',
    placeholder: 'Calle, número, ciudad',
    multiline: true,
  },
  {
    key: 'phone',
    label: 'Teléfono',
    placeholder: 'Ej: 3413-391929',
    keyboardType: 'phone-pad',
  },
  {
    key: 'googleMapsUrl',
    label: 'Link de Google Maps',
    placeholder: 'https://maps.google.com/...',
    keyboardType: 'url',
  },
  {
    key: 'googleReviewsUrl',
    label: 'Link de reseñas de Google',
    placeholder: 'https://g.page/.../review',
    keyboardType: 'url',
  },
  {
    key: 'googlePlaceId',
    label: 'Google Place ID (opcional)',
    placeholder: 'ChIJ...',
  },
  {
    key: 'instagramUrl',
    label: 'Instagram',
    placeholder: 'https://instagram.com/tu_local',
    keyboardType: 'url',
  },
  {
    key: 'linktreeUrl',
    label: 'Linktree',
    placeholder: 'https://linktr.ee/tu_local',
    keyboardType: 'url',
  },
];

function toFormState(profile: PublicProfileSettings | undefined | null): FormState {
  return {
    subtitle: String(profile?.subtitle ?? ''),
    address: String(profile?.address ?? ''),
    phone: String(profile?.phone ?? ''),
    googleMapsUrl: String(profile?.googleMapsUrl ?? ''),
    googleReviewsUrl: String(profile?.googleReviewsUrl ?? ''),
    googlePlaceId: String(profile?.googlePlaceId ?? ''),
    instagramUrl: String(profile?.instagramUrl ?? ''),
    linktreeUrl: String(profile?.linktreeUrl ?? ''),
  };
}

function toPayload(form: FormState): PublicProfileSettings {
  return {
    subtitle: form.subtitle,
    address: form.address,
    phone: form.phone,
    googleMapsUrl: form.googleMapsUrl,
    googleReviewsUrl: form.googleReviewsUrl,
    googlePlaceId: form.googlePlaceId,
    instagramUrl: form.instagramUrl,
    linktreeUrl: form.linktreeUrl,
  };
}

export default function PublicProfileSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const openUpgradeScreen = (email?: string) => {
    if (Platform.OS === 'ios') {
      navigation.replace('Subscription-Settings');
      return;
    }

    navigation.replace('Plans', {
      fromRegistration: false,
      email,
    });
  };

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const storedUser = await getUserProfile();
        if (hasActiveFreePlan(storedUser)) {
          if (!active) return;
          Alert.alert(
            'Disponible con plan pago',
            'El perfil público del local se desbloquea al extender tu plan.',
            [{ text: 'Continuar', onPress: () => openUpgradeScreen(storedUser?.email) }],
          );
          return;
        }

        const res = await getCurrentUser();
        if (!active) return;

        if (hasActiveFreePlan(res?.user)) {
          Alert.alert(
            'Disponible con plan pago',
            'El perfil público del local se desbloquea al extender tu plan.',
            [{ text: 'Continuar', onPress: () => openUpgradeScreen(res?.user?.email) }],
          );
          return;
        }

        setForm(toFormState(res?.user?.publicProfile));
      } catch (err: any) {
        if (active) {
          Alert.alert(
            'Error',
            err?.message || 'No se pudo cargar el perfil público del local.',
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updatePublicProfileSettings(toPayload(form));
      Alert.alert(
        'Guardado',
        'El perfil público del local quedó actualizado.',
      );
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.message || 'No se pudo guardar el perfil público.',
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Perfil público del local</Text>
        <Text style={styles.subtitle}>
          Estos datos se usan en la web de turnos para mostrar dirección, links
          de mapa y reseñas.
        </Text>
      </View>

      <View style={styles.card}>
        {FIELDS.map(field => (
          <View key={field.key} style={styles.fieldGroup}>
            <Text style={styles.label}>{field.label}</Text>
            <TextInput
              style={[
                styles.input,
                field.multiline ? styles.inputMultiline : null,
              ]}
              placeholder={field.placeholder}
              placeholderTextColor={theme.textMuted}
              value={form[field.key]}
              onChangeText={value => handleChange(field.key, value)}
              multiline={field.multiline}
              textAlignVertical={field.multiline ? 'top' : 'center'}
              keyboardType={field.keyboardType}
              autoCapitalize="none"
            />
          </View>
        ))}
      </View>

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>Implementación recomendada</Text>
        <Text style={styles.tipText}>
          Para empezar, cargá el link de Google Maps y el link de reseñas. El
          Place ID queda preparado para una integración futura si después
          querés traer datos automáticos desde Google.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.saveButton,
          pressed && !saving ? styles.saveButtonPressed : null,
          saving ? styles.saveButtonDisabled : null,
        ]}
        disabled={saving}
        onPress={handleSave}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Guardando...' : 'Guardar perfil público'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 120,
      gap: 16,
    },
    header: {
      gap: 8,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 28,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.textMuted,
      fontSize: 14,
      lineHeight: 21,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '700',
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.input,
      color: theme.textPrimary,
      fontSize: 15,
    },
    inputMultiline: {
      minHeight: 96,
      paddingTop: 14,
    },
    tipCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 20,
      padding: 16,
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
    },
    tipTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    tipText: {
      color: theme.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    saveButton: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.primary,
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    saveButtonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    saveButtonDisabled: {
      opacity: 0.7,
    },
    saveButtonText: {
      color: theme.textOnPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
