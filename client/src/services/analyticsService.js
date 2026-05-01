import api from './api';

export const analyticsService = {
  // Track Events
  trackEvent: async (eventName, eventData = {}) => {
    const response = await api.post('/analytics/track', {
      eventName,
      eventData,
      timestamp: new Date().toISOString(),
    });
    return response.data;
  },

  trackPageView: async (page, metadata = {}) => {
    return analyticsService.trackEvent('page_view', { page, ...metadata });
  },

  trackFileUpload: async (fileSize, fileType, success = true) => {
    return analyticsService.trackEvent('file_upload', { fileSize, fileType, success });
  },

  trackFileDownload: async (fileId, fileSize, success = true) => {
    return analyticsService.trackEvent('file_download', { fileId, fileSize, success });
  },

  trackMerge: async (fileCount, outputFormat, success = true) => {
    return analyticsService.trackEvent('file_merge', { fileCount, outputFormat, success });
  },

  trackPayment: async (amount, method, success = true) => {
    return analyticsService.trackEvent('payment', { amount, method, success });
  },

  // User Analytics
  getUserAnalytics: async (userId, startDate, endDate) => {
    const response = await api.get(`/analytics/users/${userId}`, {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // File Analytics
  getFileAnalytics: async (fileId, period = '30d') => {
    const response = await api.get(`/analytics/files/${fileId}`, {
      params: { period },
    });
    return response.data;
  },

  // System Analytics (Admin only)
  getSystemAnalytics: async (params = {}) => {
    const response = await api.get('/analytics/system', { params });
    return response.data;
  },

  getStorageAnalytics: async (period = '30d') => {
    const response = await api.get('/analytics/storage', { params: { period } });
    return response.data;
  },

  getPaymentAnalytics: async (startDate, endDate) => {
    const response = await api.get('/analytics/payments', {
      params: { startDate, endDate },
    });
    return response.data;
  },

  // Custom Reports
  generateReport: async (reportConfig) => {
    const response = await api.post('/analytics/reports/generate', reportConfig);
    return response.data;
  },

  getReport: async (reportId) => {
    const response = await api.get(`/analytics/reports/${reportId}`);
    return response.data;
  },

  downloadReport: async (reportId, format = 'csv') => {
    const response = await api.get(`/analytics/reports/${reportId}/download`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },

  // Real-time Analytics
  getRealtimeStats: async () => {
    const response = await api.get('/analytics/realtime');
    return response.data;
  },

  subscribeToRealtime: (onData) => {
    // WebSocket connection for real-time analytics
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/analytics`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onData(data);
    };
    
    return () => ws.close();
  },
};

export default analyticsService;