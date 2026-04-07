/**
 * Subscription Configuration
 * 
 * Centralized subscription plans configuration
 * Fetches plans from backend API to ensure consistency
 * 
 * @version 2.0.0
 */

import api from '../services/api';

// Cache for plans
let cachedPlans = null;

/**
 * Get subscription plans from backend API
 * @returns {Promise<Array>} Array of subscription plans
 */
export const getSubscriptionPlans = async () => {
  if (cachedPlans) {
    return cachedPlans;
  }

  try {
    const response = await api.get('/payments/plans');
    if (response.data?.success && response.data?.plans) {
      // Convert backend plans object to array format
      const plans = response.data.plans;
      cachedPlans = Object.values(plans).map(plan => ({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        duration: plan.duration,
        successFee: plan.successFee || 0,
        features: plan.features || []
      }));
      return cachedPlans;
    }
  } catch (error) {
    console.error('Failed to fetch subscription plans:', error);
  }

  // Fallback to default plans if API fails
  return getDefaultPlans();
};

/**
 * Get default plans (fallback)
 */
export const getDefaultPlans = () => {
  return [
    {
      id: 'FREE',
      name: 'Free',
      price: 0,
      duration: 0,
      successFee: 0,
      features: ['Basic profile creation', 'Profile search & matching (Based on availability)', 'Express interest in profiles (When suitable matches found)']
    },
    {
      id: 'BASIC',
      name: 'Basic',
      price: 1000,
      duration: 30,
      successFee: 25000,
      features: ['Basic profile creation', 'Profile search & matching (Enhanced visibility)', 'Express interest in profiles', 'View contact details']
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: 2000,
      duration: 90,
      successFee: 50000,
      features: ['All Basic features', 'Profile search & matching (Higher visibility)', 'Express interest in profiles', 'View contact details', 'Priority listing', 'Verified badge']
    },
    {
      id: 'PREMIUM',
      name: 'Premium',
      price: 5000,
      duration: 180,
      successFee: 100000,
      features: ['All Pro features', 'Profile search & matching (Highest visibility)', 'Express interest in profiles', 'View contact details', 'Priority listing', 'Verified badge', 'Profile highlighting', 'Dedicated support']
    }
  ];
};

/**
 * Clear cached plans (useful after updates)
 */
export const clearPlansCache = () => {
  cachedPlans = null;
};

// Export default plans for synchronous access (for initial render)
export const SUBSCRIPTION_TIERS = getDefaultPlans();

export default {
  getSubscriptionPlans,
  getDefaultPlans,
  clearPlansCache,
  SUBSCRIPTION_TIERS
};
