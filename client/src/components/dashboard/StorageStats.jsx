import React from 'react';
import ProgressBar from '../common/ProgressBar';

const StorageStats = ({
  stats,
  onUpgradeClick,
  className = '',
}) => {
  const {
    total = 10737418240, // 10GB default
    used = 0,
    files = 0,
    folders = 0,
    plan = 'Free',
  } = stats;
  
  const usedPercentage = (used / total) * 100;
  const free = total - used;
  
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  const getStatusColor = () => {
    if (usedPercentage >= 90) return 'text-red-600';
    if (usedPercentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };
  
  const getProgressColor = () => {
    if (usedPercentage >= 90) return 'danger';
    if (usedPercentage >= 70) return 'warning';
    return 'primary';
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Storage Usage
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {plan} Plan
          </p>
        </div>
        {onUpgradeClick && usedPercentage > 80 && (
          <button
            onClick={onUpgradeClick}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Upgrade
          </button>
        )}
      </div>
      
      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">Used Space</span>
          <span className={`font-semibold ${getStatusColor()}`}>
            {usedPercentage.toFixed(1)}%
          </span>
        </div>
        <ProgressBar progress={usedPercentage} size="lg" color={getProgressColor()} />
        <div className="flex justify-between text-sm mt-1">
          <span className="text-gray-600 dark:text-gray-400">
            {formatFileSize(used)}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {formatFileSize(total)}
          </span>
        </div>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatFileSize(used)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Used</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {formatFileSize(free)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Free</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {files}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">Files</p>
        </div>
      </div>
      
      {/* Warning Message */}
      {usedPercentage >= 90 && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-800 dark:text-red-200">
            ⚠️ You're running out of storage space. Please upgrade your plan to continue uploading files.
          </p>
        </div>
      )}
      
      {usedPercentage >= 70 && usedPercentage < 90 && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            💡 Tip: You're approaching your storage limit. Consider upgrading or cleaning up old files.
          </p>
        </div>
      )}
    </div>
  );
};

export default StorageStats;