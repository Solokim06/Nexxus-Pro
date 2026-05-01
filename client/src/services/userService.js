import api from './api';

export const userService = {
  // User Profile
  getUser: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  },

  deleteUser: async (userId) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
  },

  // User Preferences
  getPreferences: async (userId) => {
    const response = await api.get(`/users/${userId}/preferences`);
    return response.data;
  },

  updatePreferences: async (userId, preferences) => {
    const response = await api.put(`/users/${userId}/preferences`, preferences);
    return response.data;
  },

  // Notifications Settings
  getNotificationSettings: async (userId) => {
    const response = await api.get(`/users/${userId}/notifications/settings`);
    return response.data;
  },

  updateNotificationSettings: async (userId, settings) => {
    const response = await api.put(`/users/${userId}/notifications/settings`, settings);
    return response.data;
  },

  // API Keys
  getApiKeys: async (userId) => {
    const response = await api.get(`/users/${userId}/api-keys`);
    return response.data;
  },

  createApiKey: async (userId, name) => {
    const response = await api.post(`/users/${userId}/api-keys`, { name });
    return response.data;
  },

  revokeApiKey: async (userId, keyId) => {
    const response = await api.delete(`/users/${userId}/api-keys/${keyId}`);
    return response.data;
  },

  // User Statistics
  getUserStats: async (userId) => {
    const response = await api.get(`/users/${userId}/stats`);
    return response.data;
  },

  getActivityLog: async (userId, limit = 50) => {
    const response = await api.get(`/users/${userId}/activity`, { params: { limit } });
    return response.data;
  },

  // Team/Organization
  getTeam: async (userId) => {
    const response = await api.get(`/users/${userId}/team`);
    return response.data;
  },

  inviteTeamMember: async (userId, email, role) => {
    const response = await api.post(`/users/${userId}/team/invite`, { email, role });
    return response.data;
  },

  removeTeamMember: async (userId, memberId) => {
    const response = await api.delete(`/users/${userId}/team/${memberId}`);
    return response.data;
  },

  updateTeamMemberRole: async (userId, memberId, role) => {
    const response = await api.put(`/users/${userId}/team/${memberId}`, { role });
    return response.data;
  },

  // Data Export
  requestDataExport: async (userId) => {
    const response = await api.post(`/users/${userId}/export-data`);
    return response.data;
  },

  getExportStatus: async (exportId) => {
    const response = await api.get(`/users/exports/${exportId}/status`);
    return response.data;
  },

  downloadExport: async (exportId) => {
    const response = await api.get(`/users/exports/${exportId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default userService;