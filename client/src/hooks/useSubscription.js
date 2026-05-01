import { useState, useEffect, useCallback } from 'react';
import { subscriptionService } from '../services/subscriptionService';

export const useSubscription = (userId) => {
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (userId) {
      loadSubscription();
      loadPlans();
    }
  }, [userId]);

  const loadSubscription = async () => {
    setIsLoading(true);
    try {
      const data = await subscriptionService.getSubscription(userId);
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
  };

  const subscribe = async (planId, paymentMethod, paymentDetails) => {
    setIsSubscribing(true);
    try {
      const result = await subscriptionService.createSubscription({
        userId,
        planId,
        paymentMethod,
        paymentDetails,
      });
      await loadSubscription();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const cancelSubscription = async (subscriptionId) => {
    setIsSubscribing(true);
    try {
      const result = await subscriptionService.cancelSubscription(subscriptionId);
      await loadSubscription();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const changePlan = async (subscriptionId, newPlanId) => {
    setIsSubscribing(true);
    try {
      const result = await subscriptionService.changePlan(subscriptionId, newPlanId);
      await loadSubscription();
      return result;
    } catch (error) {
      throw error;
    } finally {
      setIsSubscribing(false);
    }
  };

  const getFeatureAccess = useCallback((feature) => {
    if (!subscription) return false;
    const plan = plans.find(p => p.id === subscription.planId);
    return plan?.features?.includes(feature) || false;
  }, [subscription, plans]);

  const getUsageLimit = useCallback((limitType) => {
    if (!subscription) return 0;
    const plan = plans.find(p => p.id === subscription.planId);
    return plan?.limits?.[limitType] || 0;
  }, [subscription, plans]);

  const checkUsage = useCallback(async (limitType) => {
    try {
      const usage = await subscriptionService.getUsage(userId, limitType);
      const limit = getUsageLimit(limitType);
      return {
        used: usage,
        limit,
        remaining: limit - usage,
        percentage: (usage / limit) * 100,
        isExceeded: usage >= limit,
      };
    } catch (error) {
      console.error('Failed to check usage:', error);
      return null;
    }
  }, [userId, getUsageLimit]);

  return {
    subscription,
    plans,
    isLoading,
    isSubscribing,
    subscribe,
    cancelSubscription,
    changePlan,
    getFeatureAccess,
    getUsageLimit,
    checkUsage,
    refreshSubscription: loadSubscription,
  };
};

export default useSubscription;