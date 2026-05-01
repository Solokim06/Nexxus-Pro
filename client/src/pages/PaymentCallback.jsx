import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PaymentCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing your payment...');

  useEffect(() => {
    const transactionId = searchParams.get('transaction_id');
    const reference = searchParams.get('reference');
    const status = searchParams.get('status');

    if (status === 'success') {
      handleSuccess(transactionId, reference);
    } else if (status === 'failed') {
      handleFailure();
    } else {
      verifyPayment(transactionId, reference);
    }
  }, [searchParams]);

  const verifyPayment = async (transactionId, reference) => {
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, reference }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'completed') {
        handleSuccess(transactionId, reference);
      } else {
        handleFailure();
      }
    } catch (error) {
      console.error('Payment verification failed:', error);
      handleFailure();
    }
  };

  const handleSuccess = async (transactionId, reference) => {
    setStatus('success');
    setMessage('Payment successful! Redirecting to dashboard...');
    
    // Track successful payment
    try {
      await fetch('/api/analytics/payment-success', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, reference }),
      });
    } catch (error) {
      console.error('Analytics tracking failed:', error);
    }

    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  const handleFailure = () => {
    setStatus('failed');
    setMessage('Payment failed. Please try again or contact support.');
    
    setTimeout(() => {
      navigate('/pricing');
    }, 5000);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return (
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
        );
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto animate-bounce">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing': return 'text-primary-600';
      case 'success': return 'text-green-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {getStatusIcon()}
          
          <h2 className={`text-2xl font-bold mt-4 ${getStatusColor()}`}>
            {status === 'processing' && 'Processing Payment'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </h2>
          
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {message}
          </p>
          
          {status === 'processing' && (
            <div className="mt-6">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div className="bg-primary-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Please do not close this window
              </p>
            </div>
          )}
          
          {status === 'success' && (
            <button
              onClick={() => navigate('/dashboard')}
              className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Go to Dashboard
            </button>
          )}
          
          {status === 'failed' && (
            <div className="mt-6 space-y-3">
              <button
                onClick={() => navigate('/pricing')}
                className="w-full px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => navigate('/support')}
                className="w-full px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Contact Support
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback;