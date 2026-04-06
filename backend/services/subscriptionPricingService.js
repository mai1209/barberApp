export function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

export function applyPercentDiscount(amount, percent) {
  const safeAmount = Number(amount || 0);
  const safePercent = Number(percent || 0);
  if (!(safeAmount > 0) || !(safePercent > 0)) return 0;
  const multiplier = Math.max(0, 1 - safePercent / 100);
  return Number((safeAmount * multiplier).toFixed(2));
}

export function resolvePlanPricingForSubscription({
  plan,
  pricing,
  subscription = {},
  couponDiscountPercent = 0,
}) {
  const baseArs = Number(pricing?.[plan]?.ars || 0);
  const baseUsdReference = Number(pricing?.[plan]?.usdReference || 0);

  const customPriceArs = Number(subscription?.customPriceArs ?? 0);
  const customPriceUsdReference = Number(subscription?.customPriceUsdReference ?? 0);
  const accountCouponValidUntil = subscription?.couponValidUntil
    ? new Date(subscription.couponValidUntil)
    : null;
  const accountCouponStillValid =
    !accountCouponValidUntil || Number.isNaN(accountCouponValidUntil.getTime())
      ? true
      : accountCouponValidUntil.getTime() >= Date.now();
  const accountCouponPercent = accountCouponStillValid
    ? Number(subscription?.couponDiscountPercent ?? 0)
    : 0;
  const effectiveCouponPercent = Number(couponDiscountPercent || accountCouponPercent || 0);

  if (customPriceArs > 0) {
    return {
      baseArs,
      baseUsdReference,
      effectiveArs: customPriceArs,
      effectiveUsdReference:
        customPriceUsdReference > 0 ? customPriceUsdReference : baseUsdReference,
      discountApplied: customPriceArs < baseArs,
      couponDiscountPercent: 0,
      source: "custom_price",
    };
  }

  if (effectiveCouponPercent > 0) {
    return {
      baseArs,
      baseUsdReference,
      effectiveArs: applyPercentDiscount(baseArs, effectiveCouponPercent),
      effectiveUsdReference: applyPercentDiscount(
        baseUsdReference,
        effectiveCouponPercent,
      ),
      discountApplied: true,
      couponDiscountPercent: effectiveCouponPercent,
      source: "coupon",
    };
  }

  return {
    baseArs,
    baseUsdReference,
    effectiveArs: baseArs,
    effectiveUsdReference: baseUsdReference,
    discountApplied: false,
    couponDiscountPercent: 0,
    source: "plan",
  };
}
