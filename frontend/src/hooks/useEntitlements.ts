import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { subscriptionService, type Entitlements } from '@/services/subscriptionService';

const FREE_DEFAULTS: Entitlements = {
  tier: 'free',
  status: 'free',
  max_held_qualifications:    5,
  max_wishlist:               10,
  max_exam_plans:             3,
  max_score_history_per_qual: 5,
  push_notification_types:    1,
  calendar_export:  false,
  study_planner:    false,
  ai_advice:        false,
  data_export:      false,
  usage: { held_qualifications: 0, wishlist: 0, exam_plans: 0 },
};

export function useEntitlements() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey:  ['entitlements'],
    queryFn:   subscriptionService.getEntitlements,
    enabled:   !!user,
    staleTime: 60_000,
  });

  const entitlements = data ?? FREE_DEFAULTS;
  const isPremium    = entitlements.tier === 'premium';

  function isAtLimit(feature: keyof Pick<Entitlements, 'max_held_qualifications' | 'max_wishlist' | 'max_exam_plans'>) {
    const usageMap = {
      max_held_qualifications: entitlements.usage.held_qualifications,
      max_wishlist:            entitlements.usage.wishlist,
      max_exam_plans:          entitlements.usage.exam_plans,
    };
    const max = entitlements[feature];
    if (max === null) return false;
    return usageMap[feature] >= max;
  }

  function usageLabel(feature: 'max_held_qualifications' | 'max_wishlist' | 'max_exam_plans') {
    const usageMap = {
      max_held_qualifications: entitlements.usage.held_qualifications,
      max_wishlist:            entitlements.usage.wishlist,
      max_exam_plans:          entitlements.usage.exam_plans,
    };
    const max = entitlements[feature];
    const current = usageMap[feature];
    if (max === null) return `${current}件（無制限）`;
    return `${current} / ${max}件`;
  }

  return { entitlements, isPremium, isLoading, isAtLimit, usageLabel };
}
