import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const ResumeUpload = ({
  fileId,
  fileName,
  onUploadComplete,
  onUploadError,
  className = '',
}) => {
  const [uploadStatus, setUploadStatus] = useState({
    isResumable: false,
    uploadedSize: 0,
    totalSize: 0,
    progress: 0,
    uploadedChunks: [],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const chunkSize = 1024 * 1024; // 1MB
  
  useEffect(() => {
    checkUploadStatus();
  }, [fileId]);
  
  const checkUploadStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/upload/status/${fileId}`);
      const data = await response.json();
      
      setUploadStatus({
        isResumable: data.isResumable,
        uploadedSize: data.uploadedSize || 0,
        totalSize: data.totalSize || 0,
        progress: (data.uploadedSize / data.totalSize) * 100 || 0,
        uploadedChunks: data.uploadedChunks || [],
      });
    } catch (error) {
      console.error('Failed to check upload status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const resumeUpload = async () => {
    setIsUploading(true);
    const startTime = Date.now();
    let uploadedBytes = uploadStatus.uploadedSize;
    
    try {
      const file = await getFile();
      const totalChunks = Math.ceil(file.size / chunkSize);
      const uploadedChunksSet = new Set(uploadStatus.uploadedChunks);
      
      for (let i = 0; i < totalChunks; i++) {
        if (uploadedChunksSet.has(i)) continue;
        
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);
        
        await uploadChunk(chunk, i, totalChunks);
        
        uploadedBytes += chunk.size;
        const progress = (uploadedBytes / file.size) * 100;
        setUploadStatus(prev => ({ ...prev, progress }));
        
        // Update speed and time remaining
        const elapsed = (Date.now() - startTime) / 1000;
        const currentSpeed = uploadedBytes / elapsed;
        setSpeed(currentSpeed);
        
        const remainingBytes = file.size - uploadedBytes;
        const remainingTime = remainingBytes / currentSpeed;
        setTimeRemaining(remainingTime);
      }
      
      await completeUpload();
      onUploadComplete();
    } catch (error) {
      console.error('Upload failed:', error);
      onUploadError(error);
    } finally {
      setIsUploading(false);
    }
  };
  
  const getFile = async () => {
    // Get file from cache or prompt user to select
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.onchange = (e) => {
        resolve(e.target.files[0]);
      };
      input.click();
    });
  };
  
  const uploadChunk = async (chunk, chunkIndex, totalChunks) => {
    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', chunkIndex);
    formData.append('fileId', fileId);
    formData.append('fileName', fileName);
    formData.append('totalChunks', totalChunks);
    
    const response = await fetch('/api/upload/chunk', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Chunk upload failed');
    }
  };
  
  const completeUpload = async () => {
    const response = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileId,
        fileName,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to complete upload');
    }
  };
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
  
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Checking upload status...</p>
      </div>
    );
  }
  
  if (!uploadStatus.isResumable) {
    return null;
  }
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Resume Upload
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            You have an incomplete upload for "{fileName}"
          </p>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Uploaded</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatFileSize(uploadStatus.uploadedSize)} / {formatFileSize(uploadStatus.totalSize)}
              </span>
            </div>
            <ProgressBar progress={uploadStatus.progress} size="md" />
          </div>
          
          {isUploading && (
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                <span>Speed: {formatSpeed(speed)}</span>
                <span>Time remaining: {formatTime(timeRemaining)}</span>
              </div>
            </div>
          )}
          
          <div className="mt-4 flex space-x-3">
            <Button
              onClick={resumeUpload}
              variant="primary"
              isLoading={isUploading}
              disabled={isUploading}
            >
              {isUploading ? 'Resuming...' : 'Resume Upload'}
            </Button>
            
            <Button
              onClick={() => onUploadError(new Error('Upload cancelled'))}
              variant="secondary"
              disabled={isUploading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Resume Upload Manager
export const ResumeUploadManager = ({ userId, className = '' }) => {
  const [incompleteUploads, setIncompleteUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    fetchIncompleteUploads();
  }, [userId]);
  
  const fetchIncompleteUploads = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/upload/incomplete/${userId}`);
      const data = await response.json();
      setIncompleteUploads(data.uploads);
    } catch (error) {
      console.error('Failed to fetch incomplete uploads:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleUploadComplete = (fileId) => {
    setIncompleteUploads(prev => prev.filter(upload => upload.fileId !== fileId));
  };
  
  const handleRemoveUpload = async (fileId) => {
    try {
      await fetch(`/api/upload/cancel/${fileId}`, { method: 'DELETE' });
      setIncompleteUploads(prev => prev.filter(upload => upload.fileId !== fileId));
    } catch (error) {
      console.error('Failed to remove upload:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }
  
  if (incompleteUploads.length === 0) {
    return null;
  }
  
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-md font-semibold text-gray-900 dark:text-white">
        Incomplete Uploads ({incompleteUploads.length})
      </h3>
      
      {incompleteUploads.map((upload) => (
        <div key={upload.fileId} className="relative">
          <ResumeUpload
            fileId={upload.fileId}
            fileName={upload.fileName}
            onUploadComplete={() => handleUploadComplete(upload.fileId)}
            onUploadError={() => handleRemoveUpload(upload.fileId)}
          />
          <button
            onClick={() => handleRemoveUpload(upload.fileId)}
            className="absolute top-4 right-4 text-gray-400 hover:text-red-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};

export default ResumeUpload;