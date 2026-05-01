import api, { upload } from './api';

export const fileService = {
  // File CRUD
  getFiles: async (params = {}) => {
    const response = await api.get('/files', { params });
    return response.data;
  },

  getFile: async (fileId) => {
    const response = await api.get(`/files/${fileId}`);
    return response.data;
  },

  getFileInfo: async (fileId) => {
    const response = await api.get(`/files/${fileId}/info`);
    return response.data;
  },

  uploadFile: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await upload('/files/upload', formData, onProgress);
    return response.data;
  },

  uploadMultiple: async (files, onProgress) => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await upload('/files/upload-multiple', formData, onProgress);
    return response.data;
  },

  uploadChunk: async (chunkData, onProgress) => {
    const formData = new FormData();
    Object.keys(chunkData).forEach(key => {
      formData.append(key, chunkData[key]);
    });
    const response = await upload('/files/upload-chunk', formData, onProgress);
    return response.data;
  },

  completeUpload: async (fileId, fileName, fileSize) => {
    const response = await api.post('/files/complete-upload', { fileId, fileName, fileSize });
    return response.data;
  },

  getUploadStatus: async (fileId) => {
    const response = await api.get(`/files/upload-status/${fileId}`);
    return response.data;
  },

  downloadFile: async (fileId) => {
    const response = await api.get(`/files/download/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadMultiple: async (fileIds) => {
    const response = await api.post('/files/download-multiple', { fileIds }, {
      responseType: 'blob',
    });
    return response.data;
  },

  updateFile: async (fileId, data) => {
    const response = await api.put(`/files/${fileId}`, data);
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}`);
    return response.data;
  },

  deleteMultiple: async (fileIds) => {
    const response = await api.post('/files/delete-multiple', { fileIds });
    return response.data;
  },

  // File Operations
  renameFile: async (fileId, newName) => {
    const response = await api.put(`/files/${fileId}/rename`, { newName });
    return response.data;
  },

  moveFile: async (fileId, destinationFolderId) => {
    const response = await api.put(`/files/${fileId}/move`, { destinationFolderId });
    return response.data;
  },

  copyFile: async (fileId, destinationFolderId) => {
    const response = await api.post(`/files/${fileId}/copy`, { destinationFolderId });
    return response.data;
  },

  starFile: async (fileId) => {
    const response = await api.put(`/files/${fileId}/star`);
    return response.data;
  },

  unstarFile: async (fileId) => {
    const response = await api.delete(`/files/${fileId}/star`);
    return response.data;
  },

  // Search
  searchFiles: async (query, filters = {}) => {
    const response = await api.get('/files/search', { params: { q: query, ...filters } });
    return response.data;
  },

  getRecentFiles: async (limit = 10) => {
    const response = await api.get('/files/recent', { params: { limit } });
    return response.data;
  },

  getStarredFiles: async () => {
    const response = await api.get('/files/starred');
    return response.data;
  },

  getTrashedFiles: async () => {
    const response = await api.get('/files/trash');
    return response.data;
  },

  // Trash
  moveToTrash: async (fileId) => {
    const response = await api.post(`/files/${fileId}/trash`);
    return response.data;
  },

  restoreFromTrash: async (fileId) => {
    const response = await api.post(`/files/${fileId}/restore`);
    return response.data;
  },

  emptyTrash: async () => {
    const response = await api.delete('/files/trash/empty');
    return response.data;
  },

  // Sharing
  shareFile: async (fileId, shareData) => {
    const response = await api.post(`/files/${fileId}/share`, shareData);
    return response.data;
  },

  getSharedLinks: async (fileId) => {
    const response = await api.get(`/files/${fileId}/shares`);
    return response.data;
  },

  revokeShare: async (shareId) => {
    const response = await api.delete(`/files/shares/${shareId}`);
    return response.data;
  },

  getSharedWithMe: async () => {
    const response = await api.get('/files/shared-with-me');
    return response.data;
  },

  // Versions
  getFileVersions: async (fileId) => {
    const response = await api.get(`/files/${fileId}/versions`);
    return response.data;
  },

  restoreVersion: async (fileId, versionId) => {
    const response = await api.post(`/files/${fileId}/versions/${versionId}/restore`);
    return response.data;
  },

  deleteVersion: async (fileId, versionId) => {
    const response = await api.delete(`/files/${fileId}/versions/${versionId}`);
    return response.data;
  },
};

export default fileService;