import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

const MpesaPayment = ({
  amount,
  phoneNumber: initialPhone,
  onSuccess,
  onError,
  className = '',
}) => {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [step, setStep] = useState('form'); // form, processing, confirmation

  const validatePhoneNumber = (phone) => {
    const phoneRegex = /^(254|\+254|0)?[7-9][0-9]{8}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone) => {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Format to 254XXXXXXXXX
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254')) {
      cleaned = '254' + cleaned;
    }
    
    return cleaned;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validatePhoneNumber(phoneNumber)) {
      onError?.('Please enter a valid M-Pesa phone number');
      return;
    }

    setIsProcessing(true);
    setStep('processing');

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
        throw new Error(data.message || 'Payment initiation failed');
      }

      setTransactionId(data.transactionId);
      setStep('confirmation');
      
      // Start polling for payment status
      pollPaymentStatus(data.transactionId);
    } catch (error) {
      console.error('M-Pesa payment error:', error);
      onError?.(error.message);
      setStep('form');
      setIsProcessing(false);
    }
  };

  const pollPaymentStatus = async (transactionId) => {
    const maxAttempts = 60; // 5 minutes (5 seconds * 60)
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await fetch(`/api/payments/mpesa/status/${transactionId}`);
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          onSuccess?.({
            transactionId,
            amount,
            paymentMethod: 'mpesa',
            status: 'completed',
          });
          setIsProcessing(false);
        } else if (data.status === 'failed' || attempts >= maxAttempts) {
          clearInterval(interval);
          onError?.('Payment failed or timed out');
          setStep('form');
          setIsProcessing(false);
        }
      } catch (error) {
        console.error('Status check error:', error);
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          onError?.('Payment status check failed');
          setStep('form');
          setIsProcessing(false);
        }
      }
    }, 5000); // Check every 5 seconds
  };

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-4">
        <img
          src="/assets/images/payments/mpesa.png"
          alt="M-Pesa"
          className="h-12 mx-auto mb-2"
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You will receive a prompt on your M-Pesa phone
        </p>
      </div>

      <Input
        label="M-Pesa Phone Number"
        type="tel"
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="0712345678"
        required
        icon={
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
        }
      />

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Instructions:</strong>
          <br />
          1. Enter your M-Pesa registered phone number
          <br />
          2. You'll receive an STK Push prompt on your phone
          <br />
          3. Enter your M-Pesa PIN to complete payment
        </p>
      </div>

      <Button type="submit" variant="primary" fullWidth>
        Pay {amount} KES via M-Pesa
      </Button>
    </form>
  );

  const renderProcessing = () => (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Processing Payment
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Please check your phone and enter your M-Pesa PIN
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
        Transaction ID: {transactionId}
      </p>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Payment Initiated!
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Waiting for confirmation from M-Pesa...
      </p>
    </div>
  );

  return (
    <div className={className}>
      {step === 'form' && renderForm()}
      {step === 'processing' && renderProcessing()}
      {step === 'confirmation' && renderConfirmation()}
    </div>
  );
};

export default MpesaPayment;