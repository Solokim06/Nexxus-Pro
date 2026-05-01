import { useState, useCallback } from 'react';
import { fileService } from '../services/fileService';

export const useFileDownload = (options = {}) => {
  const { onProgress, onSuccess, onError } = options;

  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [currentDownload, setCurrentDownload] = useState(null);

  const downloadFile = async (fileId, fileName, chunkSize = 1024 * 1024) => {
    setIsDownloading(true);
    setCurrentDownload(fileId);

    try {
      // Get file info
      const fileInfo = await fileService.getFileInfo(fileId);
      const totalChunks = Math.ceil(fileInfo.size / chunkSize);
      const chunks = [];

      // Download chunks
      for (let i = 0; i < totalChunks; i++) {
        const response = await fetch(`/api/download/chunk/${fileId}?chunk=${i}`, {
          headers: { 'Range': `bytes=${i * chunkSize}-${(i + 1) * chunkSize - 1}` }
        });
        
        const chunk = await response.blob();
        chunks.push(chunk);
        
        const progress = ((i + 1) / totalChunks) * 100;
        setDownloadProgress(prev => ({ ...prev, [fileId]: progress }));
        onProgress?.({ fileId, progress });
      }

      // Combine chunks
      const blob = new Blob(chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || fileInfo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onSuccess?.({ fileId, fileName: fileInfo.name });
      return { success: true };
    } catch (error) {
      onError?.({ fileId, error: error.message });
      throw error;
    } finally {
      setIsDownloading(false);
      setCurrentDownload(null);
    }
  };

  const downloadMultiple = async (files) => {
    const results = [];
    for (const file of files) {
      const result = await downloadFile(file.id, file.name);
      results.push(result);
    }
    return results;
  };

  const cancelDownload = () => {
    // Implementation for cancelling download
    setIsDownloading(false);
    setCurrentDownload(null);
  };

  return {
    isDownloading,
    downloadProgress,
    currentDownload,
    downloadFile,
    downloadMultiple,
    cancelDownload,
  };
};

export default useFileDownload;