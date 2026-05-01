import api from './api';

export const mpesaService = {
  // STK Push (Lipa Na M-Pesa Online)
  initiateSTKPush: async (phoneNumber, amount, accountReference = 'Nexxus-Pro Subscription') => {
    const response = await api.post('/payments/mpesa/stkpush', {
      phoneNumber,
      amount,
      accountReference,
    });
    return response.data;
  },

  // Check Payment Status
  getPaymentStatus: async (transactionId) => {
    const response = await api.get(`/payments/mpesa/status/${transactionId}`);
    return response.data;
  },

  // C2B (Customer to Business) - for receiving payments
  registerC2BURLs: async () => {
    const response = await api.post('/payments/mpesa/register-urls');
    return response.data;
  },

  simulateC2BPayment: async (phoneNumber, amount, shortCode) => {
    const response = await api.post('/payments/mpesa/simulate', {
      phoneNumber,
      amount,
      shortCode,
    });
    return response.data;
  },

  // B2C (Business to Customer) - for sending payments
  sendB2CPayment: async (phoneNumber, amount, command = 'SalaryPayment') => {
    const response = await api.post('/payments/mpesa/b2c', {
      phoneNumber,
      amount,
      command,
    });
    return response.data;
  },

  // Reversals
  reverseTransaction: async (transactionId, amount) => {
    const response = await api.post('/payments/mpesa/reverse', {
      transactionId,
      amount,
    });
    return response.data;
  },

  // Account Balance
  checkAccountBalance: async (shortCode) => {
    const response = await api.get(`/payments/mpesa/balance/${shortCode}`);
    return response.data;
  },

  // Transaction Status
  queryTransactionStatus: async (transactionId) => {
    const response = await api.post('/payments/mpesa/query', { transactionId });
    return response.data;
  },
};

export default mpesaService;