export interface UsageEstimate {
  requestsPerMonth: number;
  tier: string;
  estimatedCost: number;
  recommendation?: string;
}

/**
 * Estimates Supabase cost based on monthly request volume.
 * Reference: Supabase Cost Tuning Skill
 */
export function estimateSupabaseCost(requestsPerMonth: number): UsageEstimate {
  // Free Tier limit: 500MB database, 5GB bandwidth, 50,000 monthly active users, etc.
  // For simplicity, we strictly model based on "requests" as a proxy for egress/compute
  // in this basic estimation, mirroring the skill's example logic.
  
  // Free Tier Check (Approximation)
  if (requestsPerMonth <= 1000) {
    return { 
        requestsPerMonth, 
        tier: 'Free', 
        estimatedCost: 0,
        recommendation: 'Current usage fits within Free Tier limits.'
    };
  }

  // Pro Tier Base
  if (requestsPerMonth <= 100000) {
    return { 
        requestsPerMonth, 
        tier: 'Pro', 
        estimatedCost: 25,
        recommendation: 'Pro Tier ($25/mo) is recommended for production apps.'
    };
  }

  // Pro Tier with Overage
  // Assuming strict linear scaling for simplicity as per skill example
  const proOverage = (requestsPerMonth - 100000) * 0.001; 
  const proCost = 25 + proOverage;

  return {
    requestsPerMonth,
    tier: 'Pro (with overage)',
    estimatedCost: parseFloat(proCost.toFixed(2)),
    recommendation: proCost > 500
      ? 'Consider Enterprise tier for volume discounts.'
      : 'Monitor usage patterns to optimize big queries.',
  };
}
