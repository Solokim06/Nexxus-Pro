import React from 'react';
import ProgressBar from '../common/ProgressBar';

const MergeStatus = ({
  status,
  progress = 0,
  currentOperation = '',
  estimatedTimeRemaining = 0,
  className = '',
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'pending':
        return (
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'processing':
        return (
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-8 h-8 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case 'completed':
        return (
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-bounce">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };
  
  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Preparing to merge...';
      case 'processing':
        return 'Merging in progress';
      case 'completed':
        return 'Merge completed successfully!';
      case 'failed':
        return 'Merge failed';
      default:
        return 'Unknown status';
    }
  };
  
  const getStatusColor = () => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'failed':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };
  
  const formatTime = (seconds) => {
    if (!seconds || !isFinite(seconds)) return '--';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    return `${Math.floor(seconds / 3600)} hours`;
  };
  
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-8 shadow-sm ${className}`}>
      <div className="flex flex-col items-center text-center">
        {/* Icon */}
        {getStatusIcon()}
        
        {/* Title */}
        <h3 className={`mt-4 text-xl font-semibold ${getStatusColor()}`}>
          {getStatusText()}
        </h3>
        
        {/* Current Operation */}
        {currentOperation && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {currentOperation}
          </p>
        )}
        
        {/* Progress Bar */}
        {status === 'processing' && (
          <div className="w-full max-w-md mt-6">
            <ProgressBar progress={progress} size="lg" showPercentage />
          </div>
        )}
        
        {/* Progress Details */}
        {status === 'processing' && (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            <p>Progress: {Math.round(progress)}% complete</p>
            {estimatedTimeRemaining > 0 && (
              <p className="mt-1">
                Estimated time remaining: {formatTime(estimatedTimeRemaining)}
              </p>
            )}
          </div>
        )}
        
        {/* Success Actions */}
        {status === 'completed' && (
          <div className="mt-6 flex space-x-4">
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Download File
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              Share
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              New Merge
            </button>
          </div>
        )}
        
        {/* Error Actions */}
        {status === 'failed' && (
          <div className="mt-6 flex space-x-4">
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Retry
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
              View Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-component: MergeStepIndicator
export const MergeStepIndicator = ({ currentStep, steps }) => {
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <React.Fragment key={step.name}>
          <div className="flex flex-col items-center flex-1">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center
              ${index < currentStep 
                ? 'bg-green-600 text-white' 
                : index === currentStep 
                  ? 'bg-blue-600 text-white animate-pulse' 
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-400'}
            `}>
              {index < currentStep ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {step.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {step.description}
            </p>
          </div>
          {index < steps.length - 1 && (
            <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default MergeStatus;