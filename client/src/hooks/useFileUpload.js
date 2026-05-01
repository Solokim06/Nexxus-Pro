import { useState, useCallback, useRef } from 'react';
import { fileService } from '../services/fileService';

export const useFileUpload = (options = {}) => {
  const {
    onProgress,
    onSuccess,
    onError,
    chunkSize = 1024 * 1024, // 1MB
    maxConcurrent = 3,
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadQueue, setUploadQueue] = useState([]);
  const abortControllers = useRef(new Map());

  const updateProgress = useCallback((fileId, progress, uploadedSize, speed) => {
    setUploadProgress(prev => ({
      ...prev,
      [fileId]: { progress, uploadedSize, speed, timestamp: Date.now() }
    }));
    onProgress?.({ fileId, progress, uploadedSize, speed });
  }, [onProgress]);

  const uploadChunk = async (file, chunk, chunkIndex, totalChunks, fileId, signal) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('totalChunks', totalChunks);
    formData.append('fileName', file.name);
    formData.append('fileId', fileId);
    formData.append('fileSize', file.size);

    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!response.ok) {
      throw new Error(`Chunk ${chunkIndex} upload failed`);
    }

    return response.json();
  };

  const uploadFile = async (file) => {
    const fileId = `${Date.now()}_${file.name}`;
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;
    let startTime = Date.now();
    let uploadedBytes = 0;

    const abortController = new AbortController();
    abortControllers.current.set(fileId, abortController);

    try {
      for (let i = 0; i < totalChunks; i++) {
        if (abortController.signal.aborted) {
          throw new Error('Upload cancelled');
        }

        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        await uploadChunk(file, chunk, i, totalChunks, fileId, abortController.signal);

        uploadedChunks++;
        uploadedBytes += chunk.size;
        const progress = (uploadedChunks / totalChunks) * 100;
        
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = uploadedBytes / elapsed;
        
        updateProgress(fileId, progress, uploadedBytes, speed);
      }

      // Complete upload
      const response = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, fileName: file.name, fileSize: file.size }),
      });

      const result = await response.json();
      onSuccess?.({ fileId, result });
      return result;
    } catch (error) {
      if (error.name !== 'AbortError') {
        onError?.({ fileId, error: error.message });
      }
      throw error;
    } finally {
      abortControllers.current.delete(fileId);
    }
  };

  const uploadFiles = async (files) => {
    setIsUploading(true);
    const results = [];
    
    // Process files with concurrency limit
    const queue = [...files];
    const activeUploads = new Set();

    const processQueue = async () => {
      while (queue.length > 0 && activeUploads.size < maxConcurrent) {
        const file = queue.shift();
        const promise = uploadFile(file);
        activeUploads.add(promise);
        
        promise.finally(() => {
          activeUploads.delete(promise);
        });
        
        results.push(promise);
      }
      
      if (activeUploads.size > 0) {
        await Promise.race(activeUploads);
        await processQueue();
      }
    };

    await processQueue();
    await Promise.all(results);
    
    setIsUploading(false);
    return results;
  };

  const cancelUpload = (fileId) => {
    const controller = abortControllers.current.get(fileId);
    if (controller) {
      controller.abort();
      abortControllers.current.delete(fileId);
    }
  };

  const cancelAllUploads = () => {
    abortControllers.current.forEach(controller => controller.abort());
    abortControllers.current.clear();
    setIsUploading(false);
    setUploadProgress({});
  };

  const clearProgress = (fileId) => {
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileId];
      return newProgress;
    });
  };

  return {
    isUploading,
    uploadProgress,
    uploadFile,
    uploadFiles,
    cancelUpload,
    cancelAllUploads,
    clearProgress,
  };
};

export default useFileUpload;