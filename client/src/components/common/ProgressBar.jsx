import React from 'react';

const ProgressBar = ({
  progress = 0,
  showPercentage = true,
  showLabel = false,
  label = '',
  size = 'md',
  color = 'primary',
  animated = true,
  className = '',
}) => {
  const sizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
    xl: 'h-4',
  };
  
  const colors = {
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-yellow-600',
    danger: 'bg-red-600',
    info: 'bg-blue-600',
  };
  
  const validProgress = Math.min(100, Math.max(0, progress));
  
  return (
    <div className={`w-full ${className}`}>
      {(showLabel || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {showLabel && <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>}
          {showPercentage && (
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {Math.round(validProgress)}%
            </span>
          )}
        </div>
      )}
      
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${colors[color]} ${sizes[size]} rounded-full transition-all duration-300 ${
            animated ? 'transition-all' : ''
          }`}
          style={{ width: `${validProgress}%` }}
        >
          {size === 'xl' && validProgress > 10 && (
            <span className="text-xs text-white px-2 leading-6">{Math.round(validProgress)}%</span>
          )}
        </div>
      </div>
    </div>
  );
};

// Circular Progress Bar Component
export const CircularProgressBar = ({
  progress = 0,
  size = 100,
  strokeWidth = 8,
  color = 'primary',
  showPercentage = true,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  
  const colors = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
  };
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          className="dark:stroke-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors[color]}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage ? (
          <span className="text-lg font-semibold text-gray-900 dark:text-white">
            {Math.round(progress)}%
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export default ProgressBar;