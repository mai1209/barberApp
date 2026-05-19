export function normalizeEffectiveSubscription(subscription) {
  const source = subscription && typeof subscription === "object" ? subscription : {};
  const plan = String(source?.plan || "").trim().toLowerCase();
  const status = String(source?.status || "").trim().toLowerCase();
  const provider = String(source?.provider || "").trim().toLowerCase();
  const hasPaidBinding = Boolean(
    provider ||
      source?.mercadoPagoPreapprovalId ||
      source?.storeProductId ||
      source?.storeCurrentPlanId,
  );

  if (plan === "basic" && status === "trial" && !hasPaidBinding) {
    return {
      ...source,
      plan: "free",
      status: "active",
      billingCycle: null,
      renewalMode: source?.renewalMode || "manual",
    };
  }

  return source;
}
