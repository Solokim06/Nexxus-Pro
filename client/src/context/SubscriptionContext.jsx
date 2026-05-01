import React, { createContext, useState, useEffect, useContext } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadSubscription();
      loadPlans();
      loadUsage();
    }
  }, [user]);

  const loadSubscription = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await subscriptionService.getSubscription(user.id);
      setSubscription(data);
    } catch (error) {
      console.error('Failed to load subscription:', error);
      setError(error.message);
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
      setError(error.message);
    }
  };

  const loadUsage = async () => {
    if (!user?.id) return;
    try {
      const data = await subscriptionService.getUsage(user.id);
      setUsage(data);
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
  };

  const subscribe = async (planId, paymentMethod, paymentDetails) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await subscriptionService.createSubscription({
        userId: user.id,
        planId,
        paymentMethod,
        paymentDetails,
      });
      await loadSubscription();
      await loadUsage();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (subscriptionId, reason = '') => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await subscriptionService.cancelSubscription(subscriptionId, reason);
      await loadSubscription();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const reactivateSubscription = async (subscriptionId) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await subscriptionService.reactivateSubscription(subscriptionId);
      await loadSubscription();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const changePlan = async (subscriptionId, newPlanId) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await subscriptionService.changePlan(subscriptionId, newPlanId);
      await loadSubscription();
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const checkFeatureAccess = (feature) => {
    if (!subscription) return false;
    const plan = plans.find(p => p.id === subscription.planId);
    return plan?.features?.includes(feature) || false;
  };

  const getRemainingUsage = (limitType) => {
    if (!usage) return 0;
    const limit = usage.limits?.[limitType] || 0;
    const used = usage.used?.[limitType] || 0;
    return Math.max(0, limit - used);
  };

  const isLimitReached = (limitType) => {
    if (!usage) return true;
    const limit = usage.limits?.[limitType] || 0;
    const used = usage.used?.[limitType] || 0;
    return used >= limit && limit !== -1;
  };

  const value = {
    subscription,
    plans,
    usage,
    isLoading,
    error,
    subscribe,
    cancelSubscription,
    reactivateSubscription,
    changePlan,
    loadSubscription,
    loadUsage,
    checkFeatureAccess,
    getRemainingUsage,
    isLimitReached,
  };

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
};

export default SubscriptionContext;