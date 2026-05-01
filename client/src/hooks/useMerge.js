import { useState, useCallback } from 'react';
import { mergeService } from '../services/mergeService';

export const useMerge = (options = {}) => {
  const { onProgress, onComplete, onError } = options;

  const [isMerging, setIsMerging] = useState(false);
  const [mergeProgress, setMergeProgress] = useState(0);
  const [currentMerge, setCurrentMerge] = useState(null);
  const [mergeHistory, setMergeHistory] = useState([]);

  const mergeFiles = async (files, outputFormat, mergeOptions) => {
    setIsMerging(true);
    setMergeProgress(0);
    
    const formData = new FormData();
    files.forEach((file, index) => {
      formData.append('files', file);
      formData.append(`fileOrder[${index}]`, index);
    });
    formData.append('outputFormat', outputFormat);
    formData.append('options', JSON.stringify(mergeOptions));

    try {
      const response = await fetch('/api/merge/files', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Merge failed');
      }

      // Track progress
      const contentLength = response.headers.get('Content-Length');
      const reader = response.body.getReader();
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        receivedLength += value.length;
        if (contentLength) {
          const progress = (receivedLength / parseInt(contentLength)) * 100;
          setMergeProgress(progress);
          onProgress?.(progress);
        }
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_${Date.now()}.${outputFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const result = { success: true, outputFormat };
      onComplete?.(result);
      return result;
    } catch (error) {
      onError?.(error.message);
      throw error;
    } finally {
      setIsMerging(false);
      setMergeProgress(0);
    }
  };

  const mergeFolders = async (folders, options) => {
    setIsMerging(true);
    setMergeProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('folders', JSON.stringify(folders));
      formData.append('options', JSON.stringify(options));
      
      const response = await fetch('/api/merge/folders', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Folder merge failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_folders_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const result = { success: true, type: 'folder' };
      onComplete?.(result);
      return result;
    } catch (error) {
      onError?.(error.message);
      throw error;
    } finally {
      setIsMerging(false);
      setMergeProgress(0);
    }
  };

  const getMergeHistory = async (userId, limit = 10) => {
    try {
      const history = await mergeService.getHistory(userId, limit);
      setMergeHistory(history);
      return history;
    } catch (error) {
      console.error('Failed to get merge history:', error);
      return [];
    }
  };

  const cancelMerge = () => {
    setIsMerging(false);
    setMergeProgress(0);
    setCurrentMerge(null);
  };

  return {
    isMerging,
    mergeProgress,
    currentMerge,
    mergeHistory,
    mergeFiles,
    mergeFolders,
    getMergeHistory,
    cancelMerge,
  };
};

export default useMerge;