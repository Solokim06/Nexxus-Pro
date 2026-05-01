import React from 'react';
import ProgressBar from '../common/ProgressBar';

const UploadLimits = ({
  limits,
  currentUsage,
  showWarning = true,
  className = '',
}) => {
  const {
    maxFileSize = 10485760, // 10MB default
    maxTotalSize = 1073741824, // 1GB default
    maxFiles = 100,
    allowedTypes = [],
  } = limits;
  
  const {
    currentTotalSize = 0,
    currentFileCount = 0,
  } = currentUsage;
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getPercentage = (current, max) => {
    return (current / max) * 100;
  };
  
  const getStatusColor = (percentage) => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'primary';
  };
  
  const totalSizePercentage = getPercentage(currentTotalSize, maxTotalSize);
  const fileCountPercentage = getPercentage(currentFileCount, maxFiles);
  
  const isNearLimit = totalSizePercentage >= 80 || fileCountPercentage >= 80;
  const isOverLimit = totalSizePercentage >= 100 || fileCountPercentage >= 100;
  
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Upload Limits
        </h3>
        
        {/* Max File Size */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Max file size</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {formatFileSize(maxFileSize)}
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Individual files cannot exceed this limit
          </p>
        </div>
        
        {/* Total Storage Used */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Total storage used</span>
            <span className={`font-medium ${getStatusColor(totalSizePercentage)}`}>
              {formatFileSize(currentTotalSize)} / {formatFileSize(maxTotalSize)}
            </span>
          </div>
          <ProgressBar
            progress={Math.min(totalSizePercentage, 100)}
            size="sm"
            color={getProgressColor(totalSizePercentage)}
          />
          {showWarning && isNearLimit && !isOverLimit && (
            <p className="text-xs text-yellow-600 mt-1">
              ⚠️ You're approaching your storage limit
            </p>
          )}
          {showWarning && isOverLimit && (
            <p className="text-xs text-red-600 mt-1">
              ❌ You've exceeded your storage limit. Please upgrade your plan.
            </p>
          )}
        </div>
        
        {/* File Count */}
        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Files count</span>
            <span className={`font-medium ${getStatusColor(fileCountPercentage)}`}>
              {currentFileCount} / {maxFiles}
            </span>
          </div>
          <ProgressBar
            progress={Math.min(fileCountPercentage, 100)}
            size="sm"
            color={getProgressColor(fileCountPercentage)}
          />
        </div>
        
        {/* Allowed File Types */}
        {allowedTypes.length > 0 && (
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Allowed file types</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {allowedTypes.map((type, index) => (
                <span
                  key={index}
                  className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Warning Card */}
      {isNearLimit && !isOverLimit && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Approaching limit
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                You're running out of storage space. Consider upgrading your plan to continue uploading.
              </p>
              <button className="mt-2 text-sm font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900">
                Upgrade Plan →
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Over Limit Card */}
      {isOverLimit && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Storage limit exceeded
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                You've exceeded your storage limit. Please upgrade your plan or delete some files to continue uploading.
              </p>
              <div className="mt-2 space-x-3">
                <button className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900">
                  Upgrade Plan
                </button>
                <button className="text-sm font-medium text-red-800 dark:text-red-200 hover:text-red-900">
                  Manage Files
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadLimits;