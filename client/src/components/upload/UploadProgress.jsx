import React from 'react';
import ProgressBar, { CircularProgressBar } from '../common/ProgressBar';

const UploadProgress = ({
  uploads = [],
  showDetails = true,
  showCircular = false,
  className = '',
}) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading':
        return 'text-blue-500';
      case 'paused':
        return 'text-yellow-500';
      case 'completed':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'uploading':
        return 'Uploading...';
      case 'paused':
        return 'Paused';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };
  
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
    return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const formatTime = (seconds) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };
  
  if (uploads.length === 0) {
    return null;
  }
  
  const overallProgress = uploads.length > 0
    ? uploads.reduce((acc, upload) => acc + upload.progress, 0) / uploads.length
    : 0;
  
  const activeUploads = uploads.filter(u => u.status === 'uploading');
  const completedUploads = uploads.filter(u => u.status === 'completed');
  const failedUploads = uploads.filter(u => u.status === 'error');
  
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Overall Progress
          </h3>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {completedUploads.length} / {uploads.length} files
          </span>
        </div>
        
        {showCircular ? (
          <div className="flex justify-center">
            <CircularProgressBar progress={overallProgress} size={80} strokeWidth={6} />
          </div>
        ) : (
          <ProgressBar progress={overallProgress} size="lg" showPercentage />
        )}
        
        {showDetails && (
          <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
            <div>
              <p className="text-gray-500 dark:text-gray-400">Active</p>
              <p className="font-semibold text-gray-900 dark:text-white">{activeUploads.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Completed</p>
              <p className="font-semibold text-green-600">{completedUploads.length}</p>
            </div>
            <div>
              <p className="text-gray-500 dark:text-gray-400">Failed</p>
              <p className="font-semibold text-red-600">{failedUploads.length}</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Individual Upload Progress */}
      <div className="space-y-3">
        {uploads.map((upload, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {upload.fileName}
                  </p>
                  <span className={`text-xs ${getStatusColor(upload.status)}`}>
                    {getStatusText(upload.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {upload.fileSize}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                {upload.status === 'uploading' && (
                  <>
                    <button
                      onClick={upload.onPause}
                      className="p-1 text-gray-500 hover:text-yellow-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    <button
                      onClick={upload.onCancel}
                      className="p-1 text-gray-500 hover:text-red-600"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </>
                )}
                
                {upload.status === 'paused' && (
                  <button
                    onClick={upload.onResume}
                    className="p-1 text-gray-500 hover:text-green-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            
            <ProgressBar progress={upload.progress} size="sm" />
            
            {showDetails && upload.status === 'uploading' && (
              <div className="flex justify-between items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>{upload.speed ? formatSpeed(upload.speed) : '--'}</span>
                <span>{upload.uploaded} / {upload.fileSize}</span>
                <span>{upload.timeRemaining ? formatTime(upload.timeRemaining) : '--'}</span>
              </div>
            )}
            
            {upload.status === 'error' && upload.error && (
              <div className="mt-2 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {upload.error}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadProgress;