export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | null | undefined;

export function isSubscriptionRestricted(status: SubscriptionStatus) {
  return status === 'trial' || status === 'past_due' || status === 'cancelled';
}

export function resolvePostAuthRoute(user: any) {
  return isSubscriptionRestricted(user?.subscription?.status)
    ? 'Subscription-Settings'
    : 'Home';
}
