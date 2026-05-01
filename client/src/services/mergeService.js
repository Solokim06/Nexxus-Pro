import api, { upload } from './api';

export const mergeService = {
  // File Merging
  mergeFiles: async (files, outputFormat, options, onProgress) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
      formData.append(`fileOrder[${index}]`, index);
    });
    formData.append('outputFormat', outputFormat);
    formData.append('options', JSON.stringify(options));

    const response = await upload('/merge/files', formData, onProgress);
    return response.data;
  },

  mergeFolders: async (folders, options, onProgress) => {
    const formData = new FormData();
    formData.append('folders', JSON.stringify(folders));
    formData.append('options', JSON.stringify(options));

    const response = await upload('/merge/folders', formData, onProgress);
    return response.data;
  },

  // Merge Queue
  addToQueue: async (mergeJob) => {
    const response = await api.post('/merge/queue', mergeJob);
    return response.data;
  },

  getQueue: async () => {
    const response = await api.get('/merge/queue');
    return response.data;
  },

  removeFromQueue: async (jobId) => {
    const response = await api.delete(`/merge/queue/${jobId}`);
    return response.data;
  },

  reorderQueue: async (queue) => {
    const response = await api.post('/merge/queue/reorder', { queue });
    return response.data;
  },

  // Merge History
  getMergeHistory: async (userId, limit = 10) => {
    const response = await api.get(`/merge/history/${userId}`, { params: { limit } });
    return response.data;
  },

  getMergeJob: async (jobId) => {
    const response = await api.get(`/merge/jobs/${jobId}`);
    return response.data;
  },

  deleteMergeHistory: async (jobId) => {
    const response = await api.delete(`/merge/history/${jobId}`);
    return response.data;
  },

  downloadMergeResult: async (jobId) => {
    const response = await api.get(`/merge/download/${jobId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Merge Status
  getMergeStatus: async (jobId) => {
    const response = await api.get(`/merge/status/${jobId}`);
    return response.data;
  },

  cancelMerge: async (jobId) => {
    const response = await api.post(`/merge/cancel/${jobId}`);
    return response.data;
  },

  // Merge Options
  getMergeOptions: async (fileType) => {
    const response = await api.get(`/merge/options/${fileType}`);
    return response.data;
  },

  validateMerge: async (files) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await api.post('/merge/validate', formData);
    return response.data;
  },

  // Preview
  generatePreview: async (files) => {
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
    });
    const response = await api.post('/merge/preview', formData);
    return response.data;
  },
};

export default mergeService;