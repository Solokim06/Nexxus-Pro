import api from './api';

export const authService = {
  // Authentication
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },

  refreshToken: async (refreshToken) => {
    const response = await api.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  // Password Management
  forgotPassword: async (email) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token, newPassword) => {
    const response = await api.post('/auth/reset-password', { token, newPassword });
    return response.data;
  },

  changePassword: async (currentPassword, newPassword) => {
    const response = await api.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  // Email Verification
  verifyEmail: async (token) => {
    const response = await api.post('/auth/verify-email', { token });
    return response.data;
  },

  resendVerificationEmail: async (email) => {
    const response = await api.post('/auth/resend-verification', { email });
    return response.data;
  },

  // User Profile
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/profile', userData);
    return response.data;
  },

  updateAvatar: async (formData) => {
    const response = await api.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteAvatar: async () => {
    const response = await api.delete('/auth/avatar');
    return response.data;
  },

  // Two-Factor Authentication
  enable2FA: async () => {
    const response = await api.post('/auth/2fa/enable');
    return response.data;
  },

  verify2FA: async (code) => {
    const response = await api.post('/auth/2fa/verify', { code });
    return response.data;
  },

  disable2FA: async (code) => {
    const response = await api.post('/auth/2fa/disable', { code });
    return response.data;
  },

  // Sessions
  getSessions: async () => {
    const response = await api.get('/auth/sessions');
    return response.data;
  },

  revokeSession: async (sessionId) => {
    const response = await api.delete(`/auth/sessions/${sessionId}`);
    return response.data;
  },

  revokeAllSessions: async () => {
    const response = await api.delete('/auth/sessions');
    return response.data;
  },

  // Social Login
  socialLogin: (provider) => {
    window.location.href = `${process.env.REACT_APP_API_URL}/auth/${provider}`;
  },

  handleSocialCallback: async (code, provider) => {
    const response = await api.post(`/auth/${provider}/callback`, { code });
    return response.data;
  },
};

export default authService;