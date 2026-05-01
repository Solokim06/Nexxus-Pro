import api from './api';

export const folderService = {
  // Folder CRUD
  getFolders: async (parentId = null) => {
    const response = await api.get('/folders', { params: { parentId } });
    return response.data;
  },

  getFolder: async (folderId) => {
    const response = await api.get(`/folders/${folderId}`);
    return response.data;
  },

  createFolder: async (name, parentId = null) => {
    const response = await api.post('/folders', { name, parentId });
    return response.data;
  },

  updateFolder: async (folderId, data) => {
    const response = await api.put(`/folders/${folderId}`, data);
    return response.data;
  },

  deleteFolder: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}`);
    return response.data;
  },

  // Folder Operations
  renameFolder: async (folderId, newName) => {
    const response = await api.put(`/folders/${folderId}/rename`, { newName });
    return response.data;
  },

  moveFolder: async (folderId, destinationFolderId) => {
    const response = await api.put(`/folders/${folderId}/move`, { destinationFolderId });
    return response.data;
  },

  copyFolder: async (folderId, destinationFolderId) => {
    const response = await api.post(`/folders/${folderId}/copy`, { destinationFolderId });
    return response.data;
  },

  // Folder Contents
  getFolderContents: async (folderId) => {
    const response = await api.get(`/folders/${folderId}/contents`);
    return response.data;
  },

  getFolderTree: async () => {
    const response = await api.get('/folders/tree');
    return response.data;
  },

  // Folder Sharing
  shareFolder: async (folderId, shareData) => {
    const response = await api.post(`/folders/${folderId}/share`, shareData);
    return response.data;
  },

  getFolderShares: async (folderId) => {
    const response = await api.get(`/folders/${folderId}/shares`);
    return response.data;
  },

  revokeFolderShare: async (shareId) => {
    const response = await api.delete(`/folders/shares/${shareId}`);
    return response.data;
  },

  // Starred Folders
  starFolder: async (folderId) => {
    const response = await api.put(`/folders/${folderId}/star`);
    return response.data;
  },

  unstarFolder: async (folderId) => {
    const response = await api.delete(`/folders/${folderId}/star`);
    return response.data;
  },

  getStarredFolders: async () => {
    const response = await api.get('/folders/starred');
    return response.data;
  },
};

export default folderService;