import api from './api';

export const notificationService = {
  // Get Notifications
  getNotifications: async (params = {}) => {
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get('/notifications/unread/count');
    return response.data;
  },

  // Update Notifications
  markAsRead: async (notificationId) => {
    const response = await api.put(`/notifications/${notificationId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.put('/notifications/read-all');
    return response.data;
  },

  deleteNotification: async (notificationId) => {
    const response = await api.delete(`/notifications/${notificationId}`);
    return response.data;
  },

  deleteAllNotifications: async () => {
    const response = await api.delete('/notifications');
    return response.data;
  },

  // Notification Preferences
  getPreferences: async () => {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  updatePreferences: async (preferences) => {
    const response = await api.put('/notifications/preferences', preferences);
    return response.data;
  },

  // Channels
  enableChannel: async (channel) => {
    const response = await api.post(`/notifications/channels/${channel}/enable`);
    return response.data;
  },

  disableChannel: async (channel) => {
    const response = await api.post(`/notifications/channels/${channel}/disable`);
    return response.data;
  },

  // WebSocket Subscription
  subscribeToNotifications: (onNotification, onConnect, onError) => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/notifications?token=${token}`);
    
    ws.onopen = () => {
      if (onConnect) onConnect();
    };
    
    ws.onmessage = (event) => {
      const notification = JSON.parse(event.data);
      if (onNotification) onNotification(notification);
    };
    
    ws.onerror = (error) => {
      if (onError) onError(error);
    };
    
    return () => ws.close();
  },

  // Send Notification (Admin only)
  sendNotification: async (notificationData) => {
    const response = await api.post('/notifications/send', notificationData);
    return response.data;
  },

  broadcastNotification: async (notificationData) => {
    const response = await api.post('/notifications/broadcast', notificationData);
    return response.data;
  },

  // Email Notifications
  sendTestEmail: async (email) => {
    const response = await api.post('/notifications/test-email', { email });
    return response.data;
  },

  // Push Notifications
  registerPushToken: async (token, platform) => {
    const response = await api.post('/notifications/push/register', { token, platform });
    return response.data;
  },

  unregisterPushToken: async (token) => {
    const response = await api.delete('/notifications/push/unregister', { data: { token } });
    return response.data;
  },
};

export default notificationService;