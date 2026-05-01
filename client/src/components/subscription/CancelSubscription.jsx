import React, { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';

const CancelSubscription = ({
  isOpen,
  onClose,
  onConfirm,
  subscription,
  className = '',
}) => {
  const [reason, setReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(1); // 1: reason, 2: confirm

  const reasons = [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'not_using', label: 'Not using enough' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'customer_support', label: 'Poor customer support' },
    { value: 'switching', label: 'Switching to another service' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async () => {
    setIsProcessing(true);
    try {
      await onConfirm?.({ reason, feedback });
      setStep(3);
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Cancel Subscription
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          We're sorry to see you go. Please tell us why you're canceling.
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Reason for canceling
        </label>
        <select
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
        >
          <option value="">Select a reason...</option>
          {reasons.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Additional feedback (optional)
        </label>
        <textarea
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          placeholder="Tell us how we can improve..."
        />
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ Warning: You will lose access to premium features immediately after cancellation.
          Your data will be retained for 30 days.
        </p>
      </div>

      <div className="flex space-x-3">
        <Button variant="secondary" onClick={onClose} fullWidth>
          Keep Subscription
        </Button>
        <Button
          variant="danger"
          onClick={() => setStep(2)}
          disabled={!reason}
          fullWidth
        >
          Continue to Cancel
        </Button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Confirm Cancellation
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Are you sure you want to cancel your subscription?
        </p>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Your subscription will end on <strong>{subscription?.currentPeriodEnd}</strong>
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          You will lose access to:
        </p>
        <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside">
          <li>Premium features and tools</li>
          <li>Extended storage limits</li>
          <li>Priority support</li>
        </ul>
      </div>

      <div className="flex space-x-3">
        <Button variant="secondary" onClick={() => setStep(1)} fullWidth>
          Go Back
        </Button>
        <Button
          variant="danger"
          onClick={handleSubmit}
          isLoading={isProcessing}
          fullWidth
        >
          Yes, Cancel Subscription
        </Button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="text-center space-y-4">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
        Subscription Canceled
      </h3>
      <p className="text-gray-600 dark:text-gray-400">
        Your subscription has been canceled successfully. You will have access
        to premium features until {subscription?.currentPeriodEnd}.
      </p>
      <Button onClick={onClose} variant="primary" fullWidth>
        Close
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="md"
      showCloseButton={step !== 3}
      showFooter={false}
      className={className}
    >
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </Modal>
  );
};

export default CancelSubscription;