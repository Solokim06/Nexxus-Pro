import React, { useState, useCallback, useRef } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const ChunkUploader = ({
  file,
  onUploadComplete,
  onUploadError,
  onProgress,
  chunkSize = 1024 * 1024, // 1MB default
  maxConcurrent = 3,
  className = '',
}) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, uploading, paused, completed, error
  const [uploadedChunks, setUploadedChunks] = useState([]);
  const [speed, setSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const abortControllerRef = useRef(null);
  const startTimeRef = useRef(null);
  const uploadedBytesRef = useRef(0);
  
  const calculateChunks = useCallback(() => {
    const chunks = [];
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      chunks.push({
        index: i,
        start,
        end,
        blob: file.slice(start, end),
        uploaded: false,
      });
    }
    
    return chunks;
  }, [file, chunkSize]);
  
  const updateProgress = useCallback((chunks) => {
    const uploaded = chunks.filter(chunk => chunk.uploaded).length;
    const progress = (uploaded / chunks.length) * 100;
    setUploadProgress(progress);
    setUploadedChunks(chunks.filter(chunk => chunk.uploaded));
    
    if (onProgress) {
      onProgress(progress);
    }
    
    // Calculate speed and time remaining
    if (startTimeRef.current && uploadedBytesRef.current > 0) {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const currentSpeed = uploadedBytesRef.current / elapsed;
      setSpeed(currentSpeed);
      
      const remainingBytes = file.size - uploadedBytesRef.current;
      const remainingTime = remainingBytes / currentSpeed;
      setTimeRemaining(remainingTime);
    }
    
    return progress;
  }, [file.size, onProgress]);
  
  const uploadChunk = async (chunk, fileId, retryCount = 0) => {
    const formData = new FormData();
    formData.append('chunk', chunk.blob);
    formData.append('chunkIndex', chunk.index);
    formData.append('fileId', fileId);
    formData.append('fileName', file.name);
    formData.append('totalChunks', Math.ceil(file.size / chunkSize));
    
    try {
      const response = await fetch('/api/upload/chunk', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      
      uploadedBytesRef.current += chunk.blob.size;
      return { success: true, chunk };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      
      if (retryCount < 3) {
        // Retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        return uploadChunk(chunk, fileId, retryCount + 1);
      }
      
      throw error;
    }
  };
  
  const uploadChunks = async (chunks, fileId) => {
    const queue = [...chunks];
    const activeUploads = new Set();
    const results = [];
    
    const processQueue = async () => {
      while (queue.length > 0 && activeUploads.size < maxConcurrent && status === 'uploading') {
        const chunk = queue.shift();
        const promise = uploadChunk(chunk, fileId);
        
        activeUploads.add(promise);
        
        promise
          .then(result => {
            activeUploads.delete(promise);
            results.push(result);
            chunk.uploaded = true;
            updateProgress(chunks);
          })
          .catch(error => {
            if (error.name !== 'AbortError') {
              console.error('Chunk upload failed:', error);
              setStatus('error');
              if (onUploadError) {
                onUploadError(error);
              }
            }
          });
      }
      
      if (activeUploads.size > 0) {
        await Promise.race(activeUploads);
        await processQueue();
      }
    };
    
    await processQueue();
    
    if (results.length === chunks.length && status === 'uploading') {
      // All chunks uploaded, complete the upload
      await completeUpload(fileId);
    }
  };
  
  const completeUpload = async (fileId) => {
    try {
      const response = await fetch('/api/upload/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileId,
          fileName: file.name,
          fileSize: file.size,
          totalChunks: Math.ceil(file.size / chunkSize),
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to complete upload');
      }
      
      setStatus('completed');
      if (onUploadComplete) {
        onUploadComplete(await response.json());
      }
    } catch (error) {
      setStatus('error');
      if (onUploadError) {
        onUploadError(error);
      }
    }
  };
  
  const startUpload = async () => {
    if (!file) return;
    
    abortControllerRef.current = new AbortController();
    startTimeRef.current = Date.now();
    uploadedBytesRef.current = 0;
    setStatus('uploading');
    setUploadProgress(0);
    
    const chunks = calculateChunks();
    const fileId = `${Date.now()}_${file.name}`;
    
    try {
      await uploadChunks(chunks, fileId);
    } catch (error) {
      if (error.name !== 'AbortError') {
        setStatus('error');
        if (onUploadError) {
          onUploadError(error);
        }
      }
    }
  };
  
  const pauseUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setStatus('paused');
    }
  };
  
  const resumeUpload = () => {
    startUpload();
  };
  
  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStatus('idle');
    setUploadProgress(0);
    setUploadedChunks([]);
  };
  
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'uploading': return 'Uploading...';
      case 'paused': return 'Paused';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      default: return 'Ready to upload';
    }
  };
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* File Info */}
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">{file.name}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)} • {Math.ceil(file.size / chunkSize)} chunks
            </p>
          </div>
          <span className={`text-sm font-medium ${
            status === 'completed' ? 'text-green-600' :
            status === 'error' ? 'text-red-600' :
            status === 'uploading' ? 'text-blue-600' :
            'text-gray-600'
          }`}>
            {getStatusText()}
          </span>
        </div>
      </div>
      
      {/* Progress */}
      {status !== 'idle' && (
        <>
          <ProgressBar progress={uploadProgress} size="lg" showPercentage />
          
          {status === 'uploading' && (
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>Speed: {formatSpeed(speed)}</span>
              <span>Uploaded: {formatFileSize(uploadedBytesRef.current)} / {formatFileSize(file.size)}</span>
              <span>Time remaining: {formatTime(timeRemaining)}</span>
            </div>
          )}
          
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Chunks uploaded: {uploadedChunks.length} / {Math.ceil(file.size / chunkSize)}
          </div>
        </>
      )}
      
      {/* Actions */}
      <div className="flex space-x-3">
        {status === 'idle' && (
          <Button onClick={startUpload} variant="primary">
            Start Upload
          </Button>
        )}
        
        {status === 'uploading' && (
          <>
            <Button onClick={pauseUpload} variant="secondary">
              Pause
            </Button>
            <Button onClick={cancelUpload} variant="danger">
              Cancel
            </Button>
          </>
        )}
        
        {status === 'paused' && (
          <>
            <Button onClick={resumeUpload} variant="primary">
              Resume
            </Button>
            <Button onClick={cancelUpload} variant="danger">
              Cancel
            </Button>
          </>
        )}
        
        {status === 'completed' && (
          <Button onClick={cancelUpload} variant="secondary">
            Clear
          </Button>
        )}
        
        {status === 'error' && (
          <Button onClick={startUpload} variant="primary">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

// Multiple chunk uploads manager
export const ChunkUploadManager = ({ files, onAllComplete, className = '' }) => {
  const [uploads, setUploads] = useState(files.map(file => ({ file, status: 'pending' })));
  
  const handleUploadComplete = (index) => {
    setUploads(prev => {
      const newUploads = [...prev];
      newUploads[index].status = 'completed';
      return newUploads;
    });
  };
  
  const handleUploadError = (index) => {
    setUploads(prev => {
      const newUploads = [...prev];
      newUploads[index].status = 'error';
      return newUploads;
    });
  };
  
  return (
    <div className={`space-y-6 ${className}`}>
      {uploads.map((upload, index) => (
        <ChunkUploader
          key={index}
          file={upload.file}
          onUploadComplete={() => handleUploadComplete(index)}
          onUploadError={() => handleUploadError(index)}
        />
      ))}
    </div>
  );
};

export default ChunkUploader;