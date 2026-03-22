/**
 * Subscription Tier Utility
 * 
 * TIER HIERARCHY (lowest to highest):
 * FREE -> BASIC -> PREMIUM -> PRO -> ELITE
 * 
 * Rules:
 * - FREE: No payment, basic features
 * - BASIC: Paid tier, can upgrade to higher tiers (PREMIUM, PRO, ELITE)
 * - PREMIUM: Higher tier, can upgrade to PRO/ELITE
 * - PRO: Higher tier, can upgrade to ELITE
 * - ELITE: Highest tier, no upgrade needed
 */

// All tier values that exist in the system
export const TIER_VALUES = {
  FREE: 'FREE',
  BASIC: 'BASIC', 
  PREMIUM: 'PREMIUM',
  PRO: 'PRO',
  ELITE: 'ELITE'
};

// Check if tier can upgrade (anything below ELITE)
export const canUpgrade = (tier) => {
  return tier && tier !== TIER_VALUES.ELITE;
};

// Check if user has any paid tier (BASIC or higher)
export const isPaidTier = (tier) => {
  return tier && tier !== TIER_VALUES.FREE;
};

// Get the next available upgrade tiers
export const getUpgradeOptions = (currentTier) => {
  switch (currentTier) {
    case TIER_VALUES.FREE:
      return [TIER_VALUES.BASIC, TIER_VALUES.PREMIUM];
    case TIER_VALUES.BASIC:
      return [TIER_VALUES.PREMIUM];
    case TIER_VALUES.PREMIUM:
      return [TIER_VALUES.PRO];
    case TIER_VALUES.PRO:
      return [TIER_VALUES.ELITE];
    default:
      return [];
  }
};

// Get badge color for tier
export const getTierBadgeColor = (tier) => {
  switch (tier) {
    case TIER_VALUES.PREMIUM:
      return '#FFD700'; // Gold
    case TIER_VALUES.PRO:
      return '#8B5CF6'; // Purple  
    case TIER_VALUES.ELITE:
      return '#E91E63'; // Pink
    case TIER_VALUES.BASIC:
      return '#4CAF50'; // Green
    default:
      return '#9E9E9E'; // Grey for FREE
  }
};

// Get display name for tier
export const getTierDisplayName = (tier) => {
  switch (tier) {
    case TIER_VALUES.PREMIUM:
      return 'Premium';
    case TIER_VALUES.PRO:
      return 'Pro';
    case TIER_VALUES.ELITE:
      return 'Elite';
    case TIER_VALUES.BASIC:
      return 'Basic';
    default:
      return 'Free';
  }
};

// Normalize tier value (handle case sensitivity)
export const normalizeTier = (tier) => {
  if (!tier) return TIER_VALUES.FREE;
  const upper = tier.toUpperCase();
  if (upper === 'BASIC' || upper === 'PREMIUM' || upper === 'PRO' || upper === 'ELITE') {
    return upper;
  }
  return TIER_VALUES.FREE;
};
