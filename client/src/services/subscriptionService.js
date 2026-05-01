import api from './api';

export const subscriptionService = {
  // Plans
  getPlans: async () => {
    const response = await api.get('/subscriptions/plans');
    return response.data;
  },

  getPlan: async (planId) => {
    const response = await api.get(`/subscriptions/plans/${planId}`);
    return response.data;
  },

  // User Subscription
  getSubscription: async (userId) => {
    const response = await api.get(`/subscriptions/user/${userId}`);
    return response.data;
  },

  createSubscription: async (subscriptionData) => {
    const response = await api.post('/subscriptions/create', subscriptionData);
    return response.data;
  },

  updateSubscription: async (subscriptionId, updateData) => {
    const response = await api.put(`/subscriptions/${subscriptionId}`, updateData);
    return response.data;
  },

  cancelSubscription: async (subscriptionId, reason = '') => {
    const response = await api.post(`/subscriptions/${subscriptionId}/cancel`, { reason });
    return response.data;
  },

  reactivateSubscription: async (subscriptionId) => {
    const response = await api.post(`/subscriptions/${subscriptionId}/reactivate`);
    return response.data;
  },

  changePlan: async (subscriptionId, newPlanId) => {
    const response = await api.put(`/subscriptions/${subscriptionId}/change-plan`, { newPlanId });
    return response.data;
  },

  // Usage
  getUsage: async (userId, period = 'current') => {
    const response = await api.get(`/subscriptions/usage/${userId}`, { params: { period } });
    return response.data;
  },

  getUsageLimit: async (userId, limitType) => {
    const response = await api.get(`/subscriptions/usage-limit/${userId}/${limitType}`);
    return response.data;
  },

  // Billing
  getBillingHistory: async (userId) => {
    const response = await api.get(`/subscriptions/billing/${userId}`);
    return response.data;
  },

  updateBillingInfo: async (billingData) => {
    const response = await api.put('/subscriptions/billing-info', billingData);
    return response.data;
  },

  // Invoices
  getInvoices: async (subscriptionId) => {
    const response = await api.get(`/subscriptions/${subscriptionId}/invoices`);
    return response.data;
  },

  downloadInvoice: async (invoiceId) => {
    const response = await api.get(`/subscriptions/invoices/${invoiceId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Trials
  startTrial: async (planId) => {
    const response = await api.post('/subscriptions/trial/start', { planId });
    return response.data;
  },

  getTrialStatus: async () => {
    const response = await api.get('/subscriptions/trial/status');
    return response.data;
  },
};

export default subscriptionService;