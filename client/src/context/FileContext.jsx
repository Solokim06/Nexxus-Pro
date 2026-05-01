import React, { createContext, useState, useContext, useCallback } from 'react';
import { fileService } from '../services/fileService';
import { folderService } from '../services/folderService';
import { useAuth } from './AuthContext';

const FileContext = createContext();

export const useFiles = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFiles must be used within a FileProvider');
  }
  return context;
};

export const FileProvider = ({ children }) => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({});

  const loadFiles = useCallback(async (folderId = null) => {
    if (!user?.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fileService.getFiles({ folderId, ...filters });
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user, filters]);

  const loadFolders = useCallback(async (parentId = null) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await folderService.getFolders(parentId);
      setFolders(data);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadFolderContents = useCallback(async (folderId) => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const data = await folderService.getFolderContents(folderId);
      setFiles(data.files || []);
      setFolders(data.folders || []);
      setCurrentFolder(data.currentFolder);
    } catch (error) {
      console.error('Failed to load folder contents:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const uploadFile = async (file, onProgress) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fileService.uploadFile(file, onProgress);
      await loadFiles(currentFolder?.id);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadMultipleFiles = async (filesList, onProgress) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await fileService.uploadMultiple(filesList, onProgress);
      await loadFiles(currentFolder?.id);
      return results;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFile = async (fileId) => {
    setIsLoading(true);
    setError(null);
    try {
      await fileService.deleteFile(fileId);
      await loadFiles(currentFolder?.id);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMultipleFiles = async (fileIds) => {
    setIsLoading(true);
    setError(null);
    try {
      await fileService.deleteMultiple(fileIds);
      await loadFiles(currentFolder?.id);
      setSelectedFiles([]);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const renameFile = async (fileId, newName) => {
    setIsLoading(true);
    setError(null);
    try {
      await fileService.renameFile(fileId, newName);
      await loadFiles(currentFolder?.id);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const moveFile = async (fileId, destinationFolderId) => {
    setIsLoading(true);
    setError(null);
    try {
      await fileService.moveFile(fileId, destinationFolderId);
      await loadFiles(currentFolder?.id);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createFolder = async (name, parentId = null) => {
    setIsLoading(true);
    setError(null);
    try {
      await folderService.createFolder(name, parentId || currentFolder?.id);
      await loadFolders(currentFolder?.id);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const searchFiles = async (query) => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await fileService.searchFiles(query, filters);
      setFiles(results);
      setSearchQuery(query);
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const shareFile = async (fileId, shareData) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fileService.shareFile(fileId, shareData);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    files,
    folders,
    currentFolder,
    selectedFiles,
    isLoading,
    error,
    searchQuery,
    filters,
    loadFiles,
    loadFolders,
    loadFolderContents,
    uploadFile,
    uploadMultipleFiles,
    deleteFile,
    deleteMultipleFiles,
    renameFile,
    moveFile,
    createFolder,
    searchFiles,
    shareFile,
    setCurrentFolder,
    setSelectedFiles,
    setFilters,
  };

  return <FileContext.Provider value={value}>{children}</FileContext.Provider>;
};

export default FileContext;