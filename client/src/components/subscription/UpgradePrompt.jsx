import React from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const UpgradePrompt = ({
  isOpen,
  onClose,
  onUpgrade,
  currentPlan,
  requiredFeature,
  className = '',
}) => {
  const getMessage = () => {
    if (requiredFeature) {
      return `The "${requiredFeature}" feature is only available on paid plans.`;
    }
    return `You've reached the limits of your ${currentPlan || 'Free'} plan.`;
  };

  const getRecommendation = () => {
    if (requiredFeature === 'unlimited storage') {
      return 'Pro Plan';
    }
    if (requiredFeature === 'merge large files') {
      return 'Professional Plan';
    }
    return 'Basic or Pro Plan';
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upgrade Required"
      size="md"
      showFooter={false}
      className={className}
    >
      <div className="text-center">
        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Unlock More Features
        </h3>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {getMessage()}
        </p>

        {/* Benefits List */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Upgrade to {getRecommendation()} to get:
          </p>
          <ul className="space-y-2">
            <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Increased storage limits
            </li>
            <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor"viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Priority customer support
            </li>
            <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Advanced merge options
            </li>
            <li className="flex items-center text-sm text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              No file size limits
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onUpgrade} variant="primary" fullWidth>
            View Plans & Upgrade
          </Button>
          <Button onClick={onClose} variant="secondary" fullWidth>
            Maybe Later
          </Button>
        </div>

        {/* Cancel Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          You can cancel anytime. No long-term contracts.
        </p>
      </div>
    </Modal>
  );
};

// Inline upgrade prompt (banner style)
export const UpgradeBanner = ({ onUpgrade, className = '' }) => {
  return (
    <div className={`bg-gradient-to-r from-primary-500 to-secondary-500 rounded-lg p-4 ${className}`}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h4 className="text-white font-semibold">Upgrade to Pro</h4>
            <p className="text-white/90 text-sm">Get unlimited storage and advanced features</p>
          </div>
        </div>
        <Button onClick={onUpgrade} variant="white" size="sm">
          Upgrade Now
        </Button>
      </div>
    </div>
  );
};

export default UpgradePrompt;