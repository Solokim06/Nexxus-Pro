import React, { useEffect } from 'react';
import Button from '../common/Button';
import Confetti from 'react-confetti';

const PaymentSuccess = ({
  transaction,
  onContinue,
  className = '',
}) => {
  useEffect(() => {
    // Track successful payment
    if (transaction) {
      console.log('Payment successful:', transaction);
    }
  }, [transaction]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <div className={`text-center ${className}`}>
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={200}
      />

      <div className="max-w-md mx-auto">
        {/* Success Icon */}
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Payment Successful!
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Thank you for your purchase. Your subscription is now active.
        </p>

        {/* Transaction Details */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 mb-8 text-left">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Transaction Details
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
              <span className="font-mono text-gray-900 dark:text-white">
                {transaction?.transactionId || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Amount:</span>
              <span className="font-semibold text-green-600">
                {formatCurrency(transaction?.amount, transaction?.currency)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Payment Method:</span>
              <span className="text-gray-900 dark:text-white capitalize">
                {transaction?.paymentMethod || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Date:</span>
              <span className="text-gray-900 dark:text-white">
                {formatDate(new Date())}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className="text-green-600 font-semibold">Completed</span>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            What's Next?
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Your subscription is now active
            </li>
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Check your email for confirmation
            </li>
            <li className="flex items-center justify-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Start using premium features
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button onClick={onContinue} variant="primary" fullWidth>
            Go to Dashboard
          </Button>
          <Button
            onClick={() => window.location.href = '/subscription'}
            variant="secondary"
            fullWidth
          >
            View Subscription
          </Button>
        </div>

        {/* Support Link */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          Need help? Contact our support team at{' '}
          <a href="mailto:support@nexxus-pro.com" className="text-primary-600">
            support@nexxus-pro.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default PaymentSuccess;