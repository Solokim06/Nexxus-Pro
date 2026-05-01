import React from 'react';
import Button from '../common/Button';

const PaymentFailed = ({
  error,
  onRetry,
  onCancel,
  className = '',
}) => {
  const commonErrors = {
    'insufficient_funds': 'Insufficient funds in your account',
    'invalid_card': 'Invalid card details provided',
    'expired_card': 'Your card has expired',
    'payment_timeout': 'Payment took too long to complete',
    'network_error': 'Network connection error',
    'cancelled': 'Payment was cancelled',
  };

  const getErrorMessage = () => {
    if (error?.message) return error.message;
    if (error?.code && commonErrors[error.code]) return commonErrors[error.code];
    return 'An unexpected error occurred. Please try again.';
  };

  const getErrorIcon = () => {
    if (error?.code === 'insufficient_funds') {
      return (
        <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  return (
    <div className={`text-center ${className}`}>
      <div className="max-w-md mx-auto">
        {/* Error Icon */}
        <div className="w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="text-red-600">
            {getErrorIcon()}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Failed
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          {getErrorMessage()}
        </p>

        {/* Error Details */}
        {error?.details && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-red-800 dark:text-red-200">
              {error.details}
            </p>
          </div>
        )}

        {/* Suggestions */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Suggestions:
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
            <li>• Check your payment method details</li>
            <li>• Ensure you have sufficient funds</li>
            <li>• Try a different payment method</li>
            <li>• Contact your bank for any issues</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onRetry} variant="primary" fullWidth>
            Try Again
          </Button>
          <Button onClick={onCancel} variant="secondary" fullWidth>
            Choose Different Method
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Still having issues?{' '}
          <a href="/support" className="text-primary-600 hover:underline">
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentFailed;