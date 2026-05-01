import api from './api';

export const paypalService = {
  // Create Order
  createOrder: async (amount, currency = 'USD', planId, returnUrl, cancelUrl) => {
    const response = await api.post('/payments/paypal/create-order', {
      amount,
      currency,
      planId,
      returnUrl,
      cancelUrl,
    });
    return response.data;
  },

  // Capture Order (after approval)
  captureOrder: async (orderId) => {
    const response = await api.post('/payments/paypal/capture', { orderId });
    return response.data;
  },

  // Get Order Details
  getOrderDetails: async (orderId) => {
    const response = await api.get(`/payments/paypal/order/${orderId}`);
    return response.data;
  },

  // Refund Payment
  refundPayment: async (captureId, amount, reason = '') => {
    const response = await api.post('/payments/paypal/refund', {
      captureId,
      amount,
      reason,
    });
    return response.data;
  },

  // Get Payment History
  getPaymentHistory: async (startDate, endDate) => {
    const response = await api.get('/payments/paypal/history', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Webhook Handling
  handleWebhook: async (webhookData) => {
    const response = await api.post('/payments/paypal/webhook', webhookData);
    return response.data;
  },

  // Verify Webhook Signature
  verifyWebhookSignature: async (headers, body) => {
    const response = await api.post('/payments/paypal/verify-webhook', {
      headers,
      body,
    });
    return response.data;
  },
};

export default paypalService;