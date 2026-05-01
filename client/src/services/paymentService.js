import api from './api';

export const paymentService = {
  // Payment Methods
  getPaymentMethods: async () => {
    const response = await api.get('/payments/methods');
    return response.data;
  },

  // Process Payment
  processPayment: async (paymentData) => {
    const response = await api.post('/payments/process', paymentData);
    return response.data;
  },

  verifyPayment: async (transactionId) => {
    const response = await api.post('/payments/verify', { transactionId });
    return response.data;
  },

  // Payment History
  getPaymentHistory: async (userId, params = {}) => {
    const response = await api.get(`/payments/history/${userId}`, { params });
    return response.data;
  },

  getPayment: async (paymentId) => {
    const response = await api.get(`/payments/${paymentId}`);
    return response.data;
  },

  // Invoices
  getInvoices: async (userId) => {
    const response = await api.get(`/payments/invoices/${userId}`);
    return response.data;
  },

  downloadInvoice: async (invoiceId, format = 'pdf') => {
    const response = await api.get(`/payments/invoices/${invoiceId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Refunds
  requestRefund: async (paymentId, reason) => {
    const response = await api.post(`/payments/${paymentId}/refund`, { reason });
    return response.data;
  },

  getRefundStatus: async (refundId) => {
    const response = await api.get(`/payments/refunds/${refundId}`);
    return response.data;
  },

  // Saved Payment Methods
  savePaymentMethod: async (paymentMethodData) => {
    const response = await api.post('/payments/save-method', paymentMethodData);
    return response.data;
  },

  getSavedPaymentMethods: async () => {
    const response = await api.get('/payments/saved-methods');
    return response.data;
  },

  deletePaymentMethod: async (methodId) => {
    const response = await api.delete(`/payments/methods/${methodId}`);
    return response.data;
  },

  setDefaultPaymentMethod: async (methodId) => {
    const response = await api.put(`/payments/methods/${methodId}/default`);
    return response.data;
  },
};

export default paymentService;