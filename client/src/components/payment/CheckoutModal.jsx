import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import MpesaPayment from './MpesaPayment';
import PayPalButton from './PayPalButton';
import BankTransfer from './BankTransfer';

const CheckoutModal = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
  onError,
  className = '',
}) => {
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // mpesa, paypal, bank
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaymentSuccess = (transaction) => {
    setIsProcessing(false);
    onSuccess?.(transaction);
    onClose();
  };

  const handlePaymentError = (error) => {
    setIsProcessing(false);
    onError?.(error);
  };

  const renderPaymentMethods = () => {
    switch (paymentMethod) {
      case 'mpesa':
        return (
          <MpesaPayment
            amount={plan.price}
            phoneNumber=""
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        );
      case 'paypal':
        return (
          <PayPalButton
            amount={plan.price}
            currency="USD"
            plan={plan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        );
      case 'bank':
        return (
          <BankTransfer
            amount={plan.price}
            plan={plan}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        );
      default:
        return null;
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Your Purchase"
      size="lg"
      showFooter={false}
      className={className}
    >
      <div className="space-y-6">
        {/* Order Summary */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Order Summary
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{plan.name} Plan</span>
              <span className="text-gray-900 dark:text-white">
                {formatCurrency(plan.price)}/{plan.period}
              </span>
            </div>
            {plan.discount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-green-600">Discount</span>
                <span className="text-green-600">-{formatCurrency(plan.discount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-primary-600">
                  {formatCurrency(plan.total || plan.price)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Payment Method
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setPaymentMethod('mpesa')}
              className={`
                p-3 border-2 rounded-lg text-center transition-all
                ${paymentMethod === 'mpesa'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <img
                src="/assets/images/payments/mpesa.png"
                alt="M-Pesa"
                className="h-8 mx-auto mb-1"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">M-Pesa</span>
            </button>

            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`
                p-3 border-2 rounded-lg text-center transition-all
                ${paymentMethod === 'paypal'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <img
                src="/assets/images/payments/paypal.png"
                alt="PayPal"
                className="h-8 mx-auto mb-1"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400">PayPal</span>
            </button>

            <button
              onClick={() => setPaymentMethod('bank')}
              className={`
                p-3 border-2 rounded-lg text-center transition-all
                ${paymentMethod === 'bank'
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }
              `}
            >
              <svg className="w-8 h-8 mx-auto mb-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <span className="text-xs text-gray-600 dark:text-gray-400">Bank Transfer</span>
            </button>
          </div>
        </div>

        {/* Payment Form */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          {renderPaymentMethods()}
        </div>

        {/* Security Note */}
        <div className="flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure payment powered by Nexxus-Pro
        </div>
      </div>
    </Modal>
  );
};

export default CheckoutModal;