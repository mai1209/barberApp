import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { getCurrentUser, getPlanPricing, updateSubscriptionSettings } from '../services/api';
import { saveUserProfile } from '../services/authStorage';
import { useTheme } from '../context/ThemeContext';
import type { Theme } from '../context/ThemeContext';

const COMMERCIAL_EMAIL = 'barberappbycodex@gmail.com';
const CUSTOM_PLAN_URL =
  'https://wa.me/543425543308?text=Hola%20quiero%20consultar%20por%20el%20plan%20personalizable%20de%20BarberApp';
const PLANS_WEBSITE_URL = 'https://barberappbycodex.com/planes';

type SubscriptionState = {
  plan?: 'basic' | 'pro' | 'custom';
  status?: 'trial' | 'active' | 'past_due' | 'cancelled';
  billingCycle?: 'monthly' | 'yearly' | 'custom' | null;
  renewalMode?: 'manual' | 'automatic';
  customPriceArs?: number | null;
  customPriceUsdReference?: number | null;
  couponCode?: string | null;
  couponDiscountType?: 'percentage' | 'fixed_usd_reference' | null;
  couponDiscountPercent?: number | null;
  couponDiscountAmountUsdReference?: number | null;
  couponBenefitDurationType?: 'forever' | 'one_time' | 'months' | null;
  couponBenefitDurationValue?: number | null;
  couponValidUntil?: string | null;
  startedAt?: string | null;
  expiresAt?: string | null;
  mercadoPagoPreapprovalId?: string | null;
  mercadoPagoPreapprovalStatus?: string | null;
  nextBillingAt?: string | null;
};

const PLAN_COPY: Record<
  NonNullable<SubscriptionState['plan']>,
  {
    label: string;
    summary: string;
    price: string;
    includes: string[];
  }
> = {
  basic: {
    label: 'Básico',
    summary: 'Todo lo necesario para vender turnos online y ordenar la agenda.',
    price: 'ARS 25.000 / mes · ref. USD 25',
    includes: [
      'Logo, colores y link personalizado',
      'Mercado Pago y cobro online',
      'Barberos, servicios y turnos ilimitados',
      'Mails y recordatorios automáticos',
    ],
  },
  pro: {
    label: 'Pro',
    summary: 'Más control del negocio con métricas, historial y exportaciones.',
    price: 'ARS 35.000 / mes · ref. USD 35',
    includes: [
      'Todo lo del plan Básico',
      'Métricas generales e individuales',
      'Historial de turnos, servicios y caja',
      'Exportación por mail, PDF y Excel',
    ],
  },
  custom: {
    label: 'Personalizable',
    summary: 'Marca propia, dominio propio y solución hecha a medida.',
    price: 'A medida',
    includes: [
      'Todo lo del plan Pro',
      'Web personalizada',
      'Dominio y branding propios',
      'App con nombre propio',
    ],
  },
};

function applyFixedDiscountByUsdReference(amountArs: number, baseUsdReference: number, discountUsdReference: number) {
  if (!(amountArs > 0) || !(baseUsdReference > 0) || !(discountUsdReference > 0)) {
    return amountArs;
  }

  const arsPerUsd = amountArs / baseUsdReference;
  const discountArs = Number((arsPerUsd * discountUsdReference).toFixed(2));
  return Math.max(0, Number((amountArs - discountArs).toFixed(2)));
}

function formatDateLabel(value?: string | null) {
  if (!value) return 'Sin fecha definida';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha definida';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

function getStatusCopy(status?: SubscriptionState['status']) {
  switch (status) {
    case 'active':
      return { label: 'Activa', color: '#21C063' };
    case 'past_due':
      return { label: 'Pago pendiente', color: '#F5C451' };
    case 'cancelled':
      return { label: 'Cancelada', color: '#FF5A5F' };
    case 'trial':
    default:
      return { label: 'Cuenta de prueba', color: '#5A8CFF' };
  }
}

function getPlanAccent(plan: SubscriptionState['plan'], theme: Theme) {
  if (plan === 'pro') return '#21C063';
  if (plan === 'custom') return '#F5C451';
  return theme.primary;
}

function getCycleCopy(cycle?: SubscriptionState['billingCycle']) {
  switch (cycle) {
    case 'yearly':
      return 'Anual';
    case 'custom':
      return 'Manual / especial';
    case 'monthly':
    default:
      return 'Mensual';
  }
}

export default function SubscriptionSettingsScreen({ navigation }: { navigation: any }) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingRenewalMode, setUpdatingRenewalMode] = useState(false);
  const [priceOverrides, setPriceOverrides] = useState({
    basic: { ars: 25000, usdReference: 25 },
    pro: { ars: 35000, usdReference: 35 },
  });

  const loadSubscription = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [res, pricingResponse] = await Promise.all([getCurrentUser(), getPlanPricing()]);
      setSubscription(res.user?.subscription ?? null);
      await saveUserProfile(res.user);
      setPriceOverrides({
        basic: {
          ars: Number(pricingResponse.pricing?.basic?.ars || 25000),
          usdReference: Number(pricingResponse.pricing?.basic?.usdReference || 25),
        },
        pro: {
          ars: Number(pricingResponse.pricing?.pro?.ars || 35000),
          usdReference: Number(pricingResponse.pricing?.pro?.usdReference || 35),
        },
      });
    } catch (error: any) {
      Alert.alert('No pudimos cargar el plan', error?.message ?? 'Probá de nuevo.');
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const planKey = subscription?.plan ?? 'basic';
  const planInfo = PLAN_COPY[planKey];
  const planAccent = getPlanAccent(planKey, theme);
  const basePriceArs =
    planKey === 'basic' ? priceOverrides.basic.ars : planKey === 'pro' ? priceOverrides.pro.ars : 0;
  const baseUsdReference =
    planKey === 'basic'
      ? priceOverrides.basic.usdReference
      : planKey === 'pro'
        ? priceOverrides.pro.usdReference
        : 0;
  const couponStillValid =
    !subscription?.couponValidUntil ||
    new Date(subscription.couponValidUntil).getTime() >= Date.now();
  const hasFixedUsdCoupon =
    subscription?.couponDiscountType === 'fixed_usd_reference' &&
    Number(subscription?.couponDiscountAmountUsdReference || 0) > 0 &&
    couponStillValid;
  const hasPercentCoupon =
    Number(subscription?.couponDiscountPercent || 0) > 0 && couponStillValid;
  const calculatedCouponArs = hasFixedUsdCoupon
    ? applyFixedDiscountByUsdReference(
        basePriceArs,
        baseUsdReference,
        Number(subscription?.couponDiscountAmountUsdReference || 0),
      )
    : hasPercentCoupon
      ? basePriceArs * (1 - Number(subscription?.couponDiscountPercent || 0) / 100)
      : basePriceArs;
  const calculatedCouponUsdReference = hasFixedUsdCoupon
    ? Math.max(
        0,
        Number(
          (
            baseUsdReference - Number(subscription?.couponDiscountAmountUsdReference || 0)
          ).toFixed(2),
        ),
      )
    : hasPercentCoupon
      ? baseUsdReference * (1 - Number(subscription?.couponDiscountPercent || 0) / 100)
      : baseUsdReference;
  const effectiveArs =
    planKey === 'basic' || planKey === 'pro'
      ? Number(subscription?.customPriceArs ?? calculatedCouponArs)
      : null;
  const effectiveUsdReference =
    planKey === 'basic' || planKey === 'pro'
      ? Number(subscription?.customPriceUsdReference ?? calculatedCouponUsdReference)
      : null;
  const effectivePlanPrice =
    planKey === 'basic' || planKey === 'pro'
      ? `ARS ${Number(effectiveArs || 0).toLocaleString('es-AR')} / mes · ref. USD ${Number(
          effectiveUsdReference || 0,
        )}`
      : planInfo.price;
  const discountArs =
    planKey === 'basic' || planKey === 'pro'
      ? Math.max(0, Number(basePriceArs || 0) - Number(effectiveArs || 0))
      : 0;
  const statusInfo = getStatusCopy(subscription?.status);
  const expiresAtDate = subscription?.expiresAt ? new Date(subscription.expiresAt) : null;
  const daysRemaining =
    expiresAtDate && !Number.isNaN(expiresAtDate.getTime())
      ? Math.ceil((expiresAtDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
      : null;
  const isRestrictedAccount =
    subscription?.status === 'trial' ||
    subscription?.status === 'past_due' ||
    subscription?.status === 'cancelled';
  const hasAutomaticRenewal =
    subscription?.renewalMode === 'automatic' && Boolean(subscription?.mercadoPagoPreapprovalId);
  const nextRelevantBillingDate =
    subscription?.nextBillingAt || subscription?.expiresAt || null;

  const getRenewalHint = () => {
    if (!expiresAtDate || Number.isNaN(expiresAtDate.getTime())) {
      return 'Podés renovar tu plan desde esta pantalla cuando lo necesites.';
    }

    if (subscription?.status === 'past_due') {
      return 'Tu plan está pendiente de pago. Renovalo para volver a quedar activo.';
    }

    if (subscription?.status === 'cancelled') {
      return 'Tu plan fue desactivado. Podés activarlo otra vez desde esta pantalla.';
    }

    if (typeof daysRemaining === 'number' && daysRemaining <= 1) {
      return 'Tu plan vence muy pronto. Renovalo ahora para evitar cortes.';
    }

    if (typeof daysRemaining === 'number' && daysRemaining <= 7) {
      return `Tu plan vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}.`;
    }

    return 'Tu plan está activo. Si querés, podés renovarlo antes del vencimiento.';
  };

  const openCustomContact = async () => {
    try {
      await Linking.openURL(CUSTOM_PLAN_URL);
    } catch (_error) {
      Alert.alert('No pudimos abrir el contacto comercial', CUSTOM_PLAN_URL);
    }
  };

  const openSupportMail = async () => {
    try {
      await Linking.openURL(
        `mailto:${COMMERCIAL_EMAIL}?subject=${encodeURIComponent('Consulta sobre plan BarberApp')}`,
      );
    } catch (_error) {
      Alert.alert('No pudimos abrir el mail', COMMERCIAL_EMAIL);
    }
  };

  const openPlansWebsite = async () => {
    try {
      await Linking.openURL(PLANS_WEBSITE_URL);
    } catch (_error) {
      Alert.alert('No pudimos abrir el sitio de planes', PLANS_WEBSITE_URL);
    }
  };

  const handleSwitchToManualRenewal = async () => {
    try {
      setUpdatingRenewalMode(true);
      const response = await updateSubscriptionSettings({ renewalMode: 'manual' });
      setSubscription(response.user?.subscription ?? null);
      await saveUserProfile(response.user);
      Alert.alert(
        'Renovación automática desactivada',
        'La cuenta volvió a renovación manual. Cuando venza, vas a poder renovar desde la web.',
      );
    } catch (error: any) {
      Alert.alert('No pudimos cambiar el modo', error?.message ?? 'Probá de nuevo.');
    } finally {
      setUpdatingRenewalMode(false);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadSubscription(true)} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>PLAN Y SUSCRIPCIÓN</Text>
        <Text style={styles.title}>Estado comercial de tu cuenta</Text>
        <Text style={styles.subtitle}>
          Acá ves qué plan tenés activo, cómo está la cuenta y qué incluye hoy tu barbería.
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={styles.loadingText}>Cargando estado del plan...</Text>
        </View>
      ) : (
        <>
          {isRestrictedAccount ? (
            <View style={styles.lockedCard}>
              <Text style={styles.lockedEyebrow}>ACCESO LIMITADO</Text>
              <Text style={styles.lockedTitle}>Activá tu plan para usar la barbería</Text>
              <Text style={styles.lockedText}>
                Esta cuenta todavía no tiene una suscripción activa. Hasta completar el alta o la renovación, dejamos bloqueado el panel principal y solo vas a ver el estado comercial.
              </Text>
              <Text style={styles.lockedHint}>
                Para activar tu cuenta, completá el pago desde la web o pedile a soporte que la active.
              </Text>
            </View>
          ) : null}

          <View style={styles.statusCard}>
            <View style={styles.statusTopRow}>
              <View>
                <Text style={styles.planLabel}>Plan actual</Text>
                <Text style={styles.planValue}>{planInfo.label}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}22` }]}>
                <Text style={[styles.statusBadgeText, { color: statusInfo.color }]}>
                  {statusInfo.label}
                </Text>
              </View>
            </View>

            <Text style={styles.planSummary}>{planInfo.summary}</Text>
            <Text style={[styles.planPrice, { color: planAccent }]}>Precio: {effectivePlanPrice}</Text>
            {discountArs > 0 ? (
              <View style={styles.discountCard}>
                <Text style={styles.discountTitle}>Descuento aplicado</Text>
                <Text style={styles.discountText}>
                  Se te aplicó un descuento de ARS {discountArs.toLocaleString('es-AR')} sobre el valor del plan
                  {subscription?.couponCode ? ` con el cupón ${subscription.couponCode}` : ''}
                  {subscription?.couponDiscountType === 'fixed_usd_reference' &&
                  Number(subscription?.couponDiscountAmountUsdReference || 0) > 0
                    ? ` equivalente a USD ${Number(subscription?.couponDiscountAmountUsdReference || 0).toLocaleString('es-AR')} de referencia`
                    : ''}
                  {subscription?.couponBenefitDurationType === 'forever'
                    ? '.'
                    : subscription?.couponBenefitDurationType === 'one_time'
                      ? ' solo en el primer pago.'
                      : subscription?.couponValidUntil
                        ? ` durante ${subscription.couponBenefitDurationValue || 0} mes${Number(subscription?.couponBenefitDurationValue || 0) === 1 ? '' : 'es'}, hasta ${formatDateLabel(subscription.couponValidUntil)}.`
                        : '.'}
                </Text>
              </View>
            ) : null}

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Ciclo</Text>
                <Text style={styles.metaValue}>{getCycleCopy(subscription?.billingCycle)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Inicio</Text>
                <Text style={styles.metaValue}>{formatDateLabel(subscription?.startedAt)}</Text>
              </View>
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>Vencimiento</Text>
                <Text style={styles.metaValue}>{formatDateLabel(subscription?.expiresAt)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.includesCard}>
            <Text style={styles.sectionTitle}>Qué incluye hoy tu plan</Text>
            {planInfo.includes.map(item => (
              <View key={item} style={styles.includeRow}>
                <View style={[styles.includeDot, { backgroundColor: planAccent }]} />
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actionsCard}>
            <Text style={styles.sectionTitle}>Acciones rápidas</Text>
            {hasAutomaticRenewal ? (
              <View style={styles.autoRenewCard}>
                <Text style={styles.autoRenewTitle}>Renovación automática activa</Text>
                <Text style={styles.autoRenewText}>
                  Mercado Pago va a intentar renovar este plan todos los meses automáticamente.
                </Text>
                <Text style={styles.autoRenewMeta}>
                  Próximo intento: {formatDateLabel(subscription?.nextBillingAt || subscription?.expiresAt)}
                </Text>
                <Pressable
                  style={[styles.secondaryButton, updatingRenewalMode && styles.primaryButtonDisabled]}
                  onPress={handleSwitchToManualRenewal}
                  disabled={updatingRenewalMode}
                >
                  <Text style={styles.secondaryButtonText}>
                    {updatingRenewalMode ? 'Cambiando modo...' : 'Pasar a renovación manual'}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.autoRenewCard}>
                <Text style={styles.autoRenewTitle}>Renovación manual</Text>
                <Text style={styles.autoRenewText}>
                  Cuando llegue el vencimiento, te vamos a avisar por mail y vas a poder renovar desde la web con el link directo.
                </Text>
              </View>
            )}
            <View style={styles.renewalHintCard}>
              <Text style={styles.renewalHintTitle}>
                {subscription?.status === 'past_due' || subscription?.status === 'cancelled'
                  ? 'Estado de renovación'
                  : 'Próximo vencimiento'}
              </Text>
              <View style={styles.renewalMetaList}>
                <View style={styles.renewalMetaRow}>
                  <Text style={styles.renewalMetaLabel}>Estado</Text>
                  <Text style={[styles.renewalMetaValue, { color: statusInfo.color }]}>
                    {statusInfo.label}
                  </Text>
                </View>
                <View style={styles.renewalMetaRow}>
                  <Text style={styles.renewalMetaLabel}>
                    {hasAutomaticRenewal ? 'Próximo cobro' : 'Vence'}
                  </Text>
                  <Text style={styles.renewalMetaValue}>
                    {formatDateLabel(nextRelevantBillingDate)}
                  </Text>
                </View>
                <View style={styles.renewalMetaRow}>
                  <Text style={styles.renewalMetaLabel}>Modo</Text>
                  <Text style={styles.renewalMetaValue}>
                    {hasAutomaticRenewal ? 'Renovación automática' : 'Renovación manual'}
                  </Text>
                </View>
              </View>
              <Text style={styles.renewalHintText}>{getRenewalHint()}</Text>
            </View>
            {isRestrictedAccount ? (
              <Pressable style={styles.primaryButton} onPress={openPlansWebsite}>
                <Text style={styles.primaryButtonText}>Ver sitio de planes</Text>
              </Pressable>
            ) : null}
            {!isRestrictedAccount ? (
              <Pressable style={styles.primaryButton} onPress={openPlansWebsite}>
                <Text style={styles.primaryButtonText}>Entrar al panel de planes</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.secondaryButton} onPress={openSupportMail}>
              <Text style={styles.secondaryButtonText}>Hablar con soporte comercial</Text>
            </Pressable>
            <Pressable style={styles.ghostButton} onPress={openCustomContact}>
              <Text style={styles.ghostButtonText}>Consultar plan personalizable</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.background,
    },
    content: {
      paddingHorizontal: 18,
      paddingTop: 32,
      paddingBottom: 130,
      gap: 16,
    },
    header: {
      gap: 10,
      paddingTop: 18,
      paddingBottom: 10,
    },
    eyebrow: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 2,
      textTransform: 'uppercase',
    },
    title: {
      color: theme.textPrimary,
      fontSize: 28,
      lineHeight: 32,
      fontWeight: '900',
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    loadingCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '600',
    },
    lockedCard: {
      backgroundColor: `${theme.primary}14`,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: `${theme.primary}55`,
      padding: 18,
      gap: 8,
    },
    lockedEyebrow: {
      color: theme.primary,
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    lockedTitle: {
      color: theme.textPrimary,
      fontSize: 20,
      lineHeight: 24,
      fontWeight: '900',
    },
    lockedText: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    lockedHint: {
      color: theme.textPrimary,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '700',
    },
    statusCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      gap: 16,
    },
    statusTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    planLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 4,
    },
    planValue: {
      color: theme.textPrimary,
      fontSize: 24,
      fontWeight: '900',
    },
    statusBadge: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    planSummary: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    planPrice: {
      fontSize: 16,
      fontWeight: '900',
    },
    discountCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 4,
    },
    discountTitle: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    discountText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    metaGrid: {
      gap: 12,
    },
    metaItem: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    metaLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 4,
    },
    metaValue: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    includesCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      gap: 14,
    },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
    includeRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'flex-start',
    },
    includeDot: {
      width: 8,
      height: 8,
      borderRadius: 999,
      marginTop: 6,
      flexShrink: 0,
    },
    includeText: {
      flex: 1,
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    actionsCard: {
      backgroundColor: theme.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      gap: 12,
    },
    autoRenewCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    autoRenewTitle: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    autoRenewText: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    autoRenewMeta: {
      color: theme.textMuted,
      fontSize: 12,
      lineHeight: 18,
      marginBottom: 2,
    },
    renewalHintCard: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 6,
    },
    renewalHintTitle: {
      color: theme.primary,
      fontSize: 12,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    renewalHintText: {
      color: theme.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    renewalMetaList: {
      gap: 8,
    },
    renewalMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    renewalMetaLabel: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    renewalMetaValue: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'right',
      flexShrink: 1,
    },
    primaryButton: {
      backgroundColor: theme.primary,
      borderRadius: 18,
      minHeight: 52,
      paddingVertical: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primaryButtonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: theme.textOnPrimary,
      fontSize: 15,
      fontWeight: '900',
    },
    secondaryButton: {
      backgroundColor: theme.surfaceAlt,
      borderRadius: 18,
      paddingVertical: 15,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: theme.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    ghostButton: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 15,
      alignItems: 'center',
    },
    ghostButtonText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
