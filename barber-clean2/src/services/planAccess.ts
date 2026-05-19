export function hasProPlanAccess(user: any) {
  const plan = String(user?.subscription?.plan || "").trim();
  const status = String(user?.subscription?.status || "").trim();
  return (plan === 'pro' || plan === 'custom') && status === 'active';
}

export function hasActiveFreePlan(user: any) {
  const plan = String(user?.subscription?.plan || '').trim();
  const status = String(user?.subscription?.status || '').trim();
  return plan === 'free' && status === 'active';
}

export function hasPaidPlanAccess(user: any) {
  const plan = String(user?.subscription?.plan || '').trim();
  const status = String(user?.subscription?.status || '').trim();
  return (plan === 'basic' || plan === 'pro' || plan === 'custom') && status === 'active';
}
