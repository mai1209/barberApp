import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MessageCircle, Search, Send } from 'lucide-react-native';
import { CustomerContact, fetchCustomerContacts } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const DEFAULT_MESSAGE =
  'Hola {nombre}! Tenemos una promoción especial en la barbería. Escribinos para reservar tu turno.';

const hexToRgba = (hex: string, alpha: number) => {
  const sanitized = hex.replace('#', '');
  const bigint = parseInt(
    sanitized.length === 3 ? sanitized.repeat(2) : sanitized,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const normalizeWhatsAppPhone = (value?: string | null) =>
  String(value ?? '').replace(/\D/g, '');

const buildMessage = (template: string, contact: CustomerContact) =>
  template
    .replace(/\{nombre\}/gi, contact.customerName || 'Cliente')
    .replace(/\{servicio\}/gi, contact.lastService || 'tu servicio');

export default function WhatsAppCampaignScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(DEFAULT_MESSAGE);

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchCustomerContacts({ limit: 500 });
      setContacts(response.contacts ?? []);
    } catch (err: any) {
      console.error('Error clientes WhatsApp:', err?.message, err?.status);
      const detail =
        err?.status === 404
          ? 'La ruta de clientes no existe en el backend actual. Subí los cambios y reiniciá el backend.'
          : err?.code === 'PLAN_UPGRADE_REQUIRED' || err?.status === 403
            ? 'Esta función requiere plan Pro activo.'
            : err?.message || 'Intentá de nuevo en unos minutos.';
      Alert.alert(
        'No pudimos cargar clientes',
        detail,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts]),
  );

  const filteredContacts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return contacts;
    return contacts.filter(contact => {
      return (
        contact.customerName.toLowerCase().includes(term) ||
        String(contact.phone || '').toLowerCase().includes(term) ||
        String(contact.lastService || '').toLowerCase().includes(term)
      );
    });
  }, [contacts, search]);

  const handleOpenWhatsApp = async (contact: CustomerContact) => {
    const phone = normalizeWhatsAppPhone(contact.normalizedPhone || contact.phone);
    const text = buildMessage(message, contact).trim();

    if (!phone || phone.length < 8) {
      Alert.alert(
        'Teléfono inválido',
        'Este cliente no tiene un WhatsApp válido guardado.',
      );
      return;
    }

    if (!text) {
      Alert.alert('Mensaje vacío', 'Escribí el mensaje que querés enviar.');
      return;
    }

    const encodedText = encodeURIComponent(text);
    const appUrl = `whatsapp://send?phone=${phone}&text=${encodedText}`;
    const webUrl = `https://wa.me/${phone}?text=${encodedText}`;

    try {
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : webUrl);
    } catch (_error) {
      Alert.alert(
        'No pudimos abrir WhatsApp',
        'Revisá que WhatsApp esté instalado o copiá el número manualmente.',
      );
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <MessageCircle size={22} color={theme.textOnPrimary} />
        </View>
        <Text style={styles.title}>Promociones por WhatsApp</Text>
        <Text style={styles.subtitle}>
          Escribí un mensaje y abrí WhatsApp con cada cliente que ya reservó
          turno. Usá {'{nombre}'} para personalizarlo.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Mensaje</Text>
        <TextInput
          style={styles.messageInput}
          value={message}
          onChangeText={setMessage}
          multiline
          placeholder="Escribí tu promoción o descuento"
          placeholderTextColor={hexToRgba(theme.primary, 0.45)}
        />
        <Text style={styles.helper}>
          Ejemplo: Hola {'{nombre}'}, esta semana tenemos 15% de descuento en
          corte y barba.
        </Text>
      </View>

      <View style={styles.searchBox}>
        <Search size={18} color={hexToRgba(theme.primary, 0.64)} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar cliente, teléfono o servicio"
          placeholderTextColor={hexToRgba(theme.primary, 0.44)}
        />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : filteredContacts.length ? (
        <View style={styles.list}>
          {filteredContacts.map(contact => (
            <View key={contact.id} style={styles.contactCard}>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.customerName}</Text>
                <Text style={styles.contactMeta}>{contact.phone}</Text>
                <Text style={styles.contactHint}>
                  {contact.appointmentsCount} turno(s)
                  {contact.lastService ? ` · Último: ${contact.lastService}` : ''}
                </Text>
              </View>
              <Pressable
                onPress={() => handleOpenWhatsApp(contact)}
                style={({ pressed }) => [
                  styles.sendButton,
                  pressed && styles.sendButtonPressed,
                ]}
              >
                <Send size={16} color={theme.textOnPrimary} />
                <Text style={styles.sendButtonText}>Enviar</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Sin clientes con WhatsApp</Text>
          <Text style={styles.emptyText}>
            Cuando los clientes reserven turnos con teléfono, van a aparecer acá.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingTop: 36,
      paddingHorizontal: 20,
      paddingBottom: 140,
      gap: 16,
    },
    header: {
      gap: 10,
    },
    iconBubble: {
      width: 46,
      height: 46,
      borderRadius: 18,
      backgroundColor: theme.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      color: theme.textPrimary,
      fontSize: 31,
      fontWeight: '900',
      letterSpacing: -0.8,
    },
    subtitle: {
      color: hexToRgba(theme.primary, 0.58),
      fontSize: 13,
      lineHeight: 20,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 24,
      padding: 18,
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.16),
      gap: 10,
    },
    label: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    messageInput: {
      minHeight: 122,
      borderRadius: 18,
      padding: 14,
      backgroundColor: theme.input,
      borderWidth: 1,
      borderColor: theme.border,
      color: theme.textPrimary,
      fontSize: 14,
      lineHeight: 20,
      textAlignVertical: 'top',
    },
    helper: {
      color: hexToRgba(theme.primary, 0.48),
      fontSize: 12,
      lineHeight: 18,
    },
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 18,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.14),
      paddingHorizontal: 14,
      height: 52,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 14,
    },
    loadingBox: {
      padding: 28,
      alignItems: 'center',
    },
    list: {
      gap: 10,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.card,
      borderRadius: 20,
      padding: 14,
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.12),
    },
    contactInfo: {
      flex: 1,
      gap: 4,
    },
    contactName: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    contactMeta: {
      color: theme.textSecondary,
      fontSize: 13,
      fontWeight: '700',
    },
    contactHint: {
      color: hexToRgba(theme.primary, 0.46),
      fontSize: 11,
      fontWeight: '600',
    },
    sendButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: theme.primary,
      borderRadius: 15,
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    sendButtonPressed: {
      opacity: 0.82,
      transform: [{ scale: 0.98 }],
    },
    sendButtonText: {
      color: theme.textOnPrimary,
      fontSize: 12,
      fontWeight: '900',
    },
    emptyCard: {
      padding: 24,
      borderRadius: 22,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: hexToRgba(theme.primary, 0.14),
      gap: 8,
    },
    emptyTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: '900',
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
  });
}
