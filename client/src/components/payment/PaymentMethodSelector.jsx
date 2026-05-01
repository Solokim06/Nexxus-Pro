import React, { useState } from 'react';
import Button from '../common/Button';

const PaymentMethodSelector = ({
  selectedMethod,
  onSelect,
  className = '',
}) => {
  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      icon: '/assets/images/payments/mpesa.png',
      description: 'Pay with M-Pesa mobile money',
      countries: ['Kenya', 'Tanzania', 'Uganda'],
    },
    {
      id: 'paypal',
      name: 'PayPal',
      icon: '/assets/images/payments/paypal.png',
      description: 'Pay with PayPal account or credit card',
      countries: ['Worldwide'],
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer',
      icon: '🏦',
      description: 'Direct bank transfer',
      countries: ['Kenya', 'International'],
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      icon: '💳',
      description: 'Visa, Mastercard, American Express',
      countries: ['Worldwide'],
    },
  ];

  const [selectedId, setSelectedId] = useState(selectedMethod?.id || 'mpesa');

  const handleSelect = (method) => {
    setSelectedId(method.id);
    onSelect?.(method);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <button
            key={method.id}
            onClick={() => handleSelect(method)}
            className={`
              p-4 border-2 rounded-xl text-left transition-all
              ${selectedId === method.id
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }
            `}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {method.icon.startsWith('/') ? (
                  <img
                    src={method.icon}
                    alt={method.name}
                    className="h-10 w-auto object-contain"
                  />
                ) : (
                  <div className="text-3xl">{method.icon}</div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {method.name}
                  </h4>
                  {selectedId === method.id && (
                    <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {method.description}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {method.countries.map((country) => (
                    <span
                      key={country}
                      className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-400"
                    >
                      {country}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Additional Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-xs text-blue-800 dark:text-blue-200">
            <p>All payments are processed securely. Your financial information is never stored on our servers.</p>
          </div>
        </div>
      </div>

      {/* Saved Payment Methods (if any) */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Saved Payment Methods
        </h4>
        <div className="space-y-2">
          {/* This would be populated from user's saved payment methods */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">💳</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Visa ending in 4242
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Expires 12/2025
                </p>
              </div>
            </div>
            <button className="text-sm text-primary-600 hover:text-primary-700">
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;