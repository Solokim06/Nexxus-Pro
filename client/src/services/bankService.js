import api, { upload } from './api';

export const bankService = {
  // Bank Transfer
  initiateBankTransfer: async (amount, planId) => {
    const response = await api.post('/payments/bank/initiate', { amount, planId });
    return response.data;
  },

  confirmBankTransfer: async (reference, receiptFile) => {
    const formData = new FormData();
    formData.append('reference', reference);
    formData.append('receipt', receiptFile);
    
    const response = await upload('/payments/bank/confirm', formData);
    return response.data;
  },

  getBankDetails: async () => {
    const response = await api.get('/payments/bank/details');
    return response.data;
  },

  // Bank Transfer Status
  getTransferStatus: async (reference) => {
    const response = await api.get(`/payments/bank/status/${reference}`);
    return response.data;
  },

  // Bank Accounts
  addBankAccount: async (accountData) => {
    const response = await api.post('/payments/bank/accounts', accountData);
    return response.data;
  },

  getBankAccounts: async () => {
    const response = await api.get('/payments/bank/accounts');
    return response.data;
  },

  deleteBankAccount: async (accountId) => {
    const response = await api.delete(`/payments/bank/accounts/${accountId}`);
    return response.data;
  },

  setDefaultBankAccount: async (accountId) => {
    const response = await api.put(`/payments/bank/accounts/${accountId}/default`);
    return response.data;
  },

  // Virtual Accounts
  createVirtualAccount: async () => {
    const response = await api.post('/payments/bank/virtual-account');
    return response.data;
  },

  getVirtualAccount: async () => {
    const response = await api.get('/payments/bank/virtual-account');
    return response.data;
  },
};

export default bankService;