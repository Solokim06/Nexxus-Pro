import React from 'react';
import Button from '../common/Button';
import ProgressBar from '../common/ProgressBar';

const CurrentPlan = ({
  subscription,
  onUpgrade,
  onCancel,
  className = '',
}) => {
  const {
    plan = {
      name: 'Free',
      price: 0,
      period: 'month',
    },
    status = 'active',
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd = false,
    usage = {
      storageUsed: 0,
      storageLimit: 1073741824, // 1GB
      filesCount: 0,
      filesLimit: 100,
      mergesUsed: 0,
      mergesLimit: 5,
    },
  } = subscription;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = () => {
    return (usage.storageUsed / usage.storageLimit) * 100;
  };

  const getFilesPercentage = () => {
    return (usage.filesCount / usage.filesLimit) * 100;
  };

  const getMergesPercentage = () => {
    return (usage.mergesUsed / usage.mergesLimit) * 100;
  };

  const getStatusBadge = () => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200', label: 'Active' },
      past_due: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200', label: 'Past Due' },
      canceled: { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200', label: 'Canceled' },
      trialing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200', label: 'Trial' },
    };
    return statusConfig[status] || statusConfig.active;
  };

  const statusBadge = getStatusBadge();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Current Plan
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your subscription details
          </p>
        </div>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusBadge.color}`}>
          {statusBadge.label}
          {cancelAtPeriodEnd && status === 'active' && ' (Canceling)'}
        </span>
      </div>

      {/* Plan Info */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 dark:text-gray-400">Plan Name</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {plan.name}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-600 dark:text-gray-400">Price</span>
          <span className="font-semibold text-gray-900 dark:text-white">
            {plan.price === 0 ? 'Free' : `$${plan.price}/${plan.period === 'month' ? 'month' : 'year'}`}
          </span>
        </div>
        {currentPeriodEnd && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600 dark:text-gray-400">Renews on</span>
            <span className="text-sm text-gray-900 dark:text-white">
              {formatDate(currentPeriodEnd)}
            </span>
          </div>
        )}
        {cancelAtPeriodEnd && (
          <div className="mt-2 text-sm text-yellow-600 dark:text-yellow-400">
            Your subscription will end on {formatDate(currentPeriodEnd)}
          </div>
        )}
      </div>

      {/* Usage Stats */}
      <div className="space-y-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          Usage this period
        </h4>

        {/* Storage Usage */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Storage</span>
            <span className="text-gray-900 dark:text-white">
              {formatFileSize(usage.storageUsed)} / {formatFileSize(usage.storageLimit)}
            </span>
          </div>
          <ProgressBar progress={getStoragePercentage()} size="sm" />
        </div>

        {/* Files Count */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Files</span>
            <span className="text-gray-900 dark:text-white">
              {usage.filesCount} / {usage.filesLimit}
            </span>
          </div>
          <ProgressBar progress={getFilesPercentage()} size="sm" />
        </div>

        {/* Merges Count */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-400">Merges</span>
            <span className="text-gray-900 dark:text-white">
              {usage.mergesUsed} / {usage.mergesLimit}
            </span>
          </div>
          <ProgressBar progress={getMergesPercentage()} size="sm" />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        {plan.price > 0 && status === 'active' && !cancelAtPeriodEnd && (
          <Button onClick={onCancel} variant="danger" fullWidth>
            Cancel Subscription
          </Button>
        )}
        {plan.price === 0 && (
          <Button onClick={onUpgrade} variant="primary" fullWidth>
            Upgrade Plan
          </Button>
        )}
        {cancelAtPeriodEnd && (
          <Button onClick={onUpgrade} variant="primary" fullWidth>
            Reactivate Subscription
          </Button>
        )}
      </div>
    </div>
  );
};

export default CurrentPlan;