import React, { useState, useEffect } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

const MpesaSTKPush = ({
  amount,
  onSuccess,
  onError,
  className = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle, processing, success, failed
  const [countdown, setCountdown] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(254|\+254|0)?[7-9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone) => {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    return cleaned;
  };

  const initiatePayment = async () => {
    if (!validatePhoneNumber(phoneNumber)) {
      onError?.('Please enter a valid M-Pesa phone number');
      return;
    }

    setIsProcessing(true);
    setStatus('processing');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const response = await fetch('/api/payments/mpesa/stkpush', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to initiate payment');
      }

      setTransactionId(data.transactionId);
      setCountdown(60); // 60 second timeout
      startPolling(data.transactionId);
    } catch (error) {
      console.error('STK Push error:', error);
      setStatus('failed');
      onError?.(error.message);
      setIsProcessing(false);
    }
  };

  const startPolling = (transactionId) => {
    let attempts = 0;
    const maxAttempts = 12; // 1 minute (5 seconds * 12)

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/payments/mpesa/status/${transactionId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatus('success');
          onSuccess?.({
            transactionId,
            amount,
            paymentMethod: 'mpesa',
            status: 'completed',
          });
          setIsProcessing(false);
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus('failed');
          onError?.('Payment failed or timed out');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Polling error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setStatus('failed');
          onError?.('Payment status check failed');
          setIsProcessing(false);
        }
      }
    }, 5000);
  };

  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    setStatus('idle');
    setTransactionId(null);
    setCountdown(0);
    initiatePayment();
  };

  const handleCancel = () => {
    setStatus('idle');
    setIsProcessing(false);
    onError?.('Payment cancelled by user');
  };

  const renderIdle = () => (
    <div className="space-y-4">
      <div className="text-center">
        <img
          src="/assets/images/payments/mpesa.png"
          alt="M-Pesa"
          className="h-16 mx-auto mb-3"
        />
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          M-Pesa Express
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Pay {amount} KES using M-Pesa
        </p>
      </div>

      <Input
        label="M-Pesa Phone Number"
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="0712345678"
        required
      />

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-yellow-800 dark:text-yellow-200">
            <p className="font-semibold mb-1">How it works:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your M-Pesa registered number</li>
              <li>You'll receive a prompt on your phone</li>
              <li>Enter your M-Pesa PIN to complete payment</li>
            </ol>
          </div>
        </div>
      </div>

      <Button onClick={initiatePayment} variant="primary" fullWidth>
        Pay with M-Pesa
      </Button>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-8">
      <div className="relative mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-4m0 0V8m0 6h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>

      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Check Your Phone
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        We've sent a payment request to {formatPhoneNumber(phoneNumber)}
      </p>

      {countdown > 0 && (
        <p className="text-sm text-gray-500 mb-4">
          Waiting for confirmation... {countdown}s
        </p>
      )}

      <div className="flex space-x-3">
        <Button variant="secondary" onClick={handleCancel} fullWidth>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleRetry} fullWidth>
          Resend Request
        </Button>
      </div>

      <p className="text-xs text-gray-500 mt-4">
        Transaction ID: {transactionId}
      </p>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
        <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Payment Successful!
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Your payment of {amount} KES has been received
      </p>
      <p className="text-xs text-gray-500 mt-2">
        Transaction ID: {transactionId}
      </p>
    </div>
  );

  const renderFailed = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Payment Failed
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Something went wrong. Please try again.
      </p>
      {retryCount < 3 ? (
        <Button onClick={handleRetry} variant="primary" fullWidth>
          Try Again
        </Button>
      ) : (
        <p className="text-sm text-red-600">
          Maximum retries exceeded. Please contact support.
        </p>
      )}
    </div>
  );

  return (
    <div className={className}>
      {status === 'idle' && renderIdle()}
      {status === 'processing' && renderProcessing()}
      {status === 'success' && renderSuccess()}
      {status === 'failed' && renderFailed()}
    </div>
  );
};

export default MpesaSTKPush;