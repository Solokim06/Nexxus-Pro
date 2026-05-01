import React, { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

const BankTransfer = ({
  amount,
  plan,
  onSuccess,
  onError,
  className = '',
}) => {
  const [step, setStep] = useState('details'); // details, upload, confirmation
  const [reference, setReference] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateReference = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `NXP-${timestamp}-${random}`;
  };

  const bankDetails = {
    bankName: 'KCB Bank Kenya',
    accountName: 'Nexxus-Pro Ltd',
    accountNumber: '1234567890',
    branch: 'Upper Hill, Nairobi',
    swiftCode: 'KCBLKENX',
    reference: generateReference(),
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setReceipt(file);
    } else {
      onError?.('Please upload a valid PDF receipt');
    }
  };

  const handleSubmit = async () => {
    if (!receipt) {
      onError?.('Please upload your payment receipt');
      return;
    }

    setIsSubmitting(true);
    
    const formData = new FormData();
    formData.append('receipt', receipt);
    formData.append('reference', reference);
    formData.append('amount', amount);
    formData.append('plan', plan.id);

    try {
      const response = await fetch('/api/payments/bank/confirm', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setStep('confirmation');
        onSuccess?.({
          reference,
          amount,
          paymentMethod: 'bank_transfer',
          status: 'pending',
          message: 'Your payment is pending confirmation',
        });
      } else {
        throw new Error(data.message || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Bank transfer error:', error);
      onError?.(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  const renderDetails = () => (
    <div className="space-y-4">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bank Transfer Details
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Use these details to complete your payment
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Bank Name:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {bankDetails.bankName}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Account Name:</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {bankDetails.accountName}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Account Number:</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-mono font-medium text-gray-900 dark:text-white">
              {bankDetails.accountNumber}
            </span>
            <button
              onClick={() => copyToClipboard(bankDetails.accountNumber)}
              className="text-primary-600 hover:text-primary-700"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">Branch:</span>
          <span className="text-sm text-gray-900 dark:text-white">{bankDetails.branch}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">SWIFT Code:</span>
          <span className="text-sm font-mono text-gray-900 dark:text-white">
            {bankDetails.swiftCode}
          </span>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Important:</strong> Please use the reference number below when making the transfer.
        </p>
      </div>

      <Input
        label="Payment Reference"
        value={bankDetails.reference}
        readOnly
        icon={
          <button
            onClick={() => copyToClipboard(bankDetails.reference)}
            className="text-primary-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
        }
      />

      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Amount to transfer: <strong className="text-primary-600">KES {amount}</strong>
        </p>
        <Button onClick={() => setStep('upload')} variant="primary" fullWidth>
          I've Made the Transfer
        </Button>
      </div>
    </div>
  );

  const renderUpload = () => (
    <div className="space-y-4">
      <div className="text-center">
        <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
        </svg>
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Upload Payment Receipt
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload your bank transfer receipt for verification
        </p>
      </div>

      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          className="hidden"
          id="receipt-upload"
        />
        <label
          htmlFor="receipt-upload"
          className="cursor-pointer block"
        >
          {receipt ? (
            <div className="text-green-600">
              <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{receipt.name}</p>
              <p className="text-xs text-gray-500">Click to change</p>
            </div>
          ) : (
            <div>
              <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Click to upload PDF receipt
              </p>
              <p className="text-xs text-gray-500 mt-1">PDF files only</p>
            </div>
          )}
        </label>
      </div>

      <div className="flex space-x-3">
        <Button variant="secondary" onClick={() => setStep('details')} fullWidth>
          Back
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={isSubmitting}
          fullWidth
        >
          Submit Payment
        </Button>
      </div>
    </div>
  );

  const renderConfirmation = () => (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-10 h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Payment Submitted
      </h4>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Your bank transfer has been submitted for verification.
        You'll receive an email once confirmed.
      </p>
      <p className="text-xs text-gray-500">
        Reference: {bankDetails.reference}
      </p>
      <div className="mt-6">
        <Button onClick={() => window.location.href = '/dashboard'} variant="primary">
          Go to Dashboard
        </Button>
      </div>
    </div>
  );

  return (
    <div className={className}>
      {step === 'details' && renderDetails()}
      {step === 'upload' && renderUpload()}
      {step === 'confirmation' && renderConfirmation()}
    </div>
  );
};

export default BankTransfer;