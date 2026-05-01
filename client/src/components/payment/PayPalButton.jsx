import React, { useState, useEffect } from 'react';
import Button from '../common/Button';

const PayPalButton = ({
  amount,
  currency = 'USD',
  plan,
  onSuccess,
  onError,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Load PayPal SDK
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.REACT_APP_PAYPAL_CLIENT_ID}&currency=${currency}`;
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.body.appendChild(script);

    return () => {
      // Cleanup if needed
      const scriptElement = document.querySelector('script[src*="paypal"]');
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [currency]);

  useEffect(() => {
    if (isScriptLoaded && window.paypal) {
      renderPayPalButton();
    }
  }, [isScriptLoaded]);

  const renderPayPalButton = () => {
    window.paypal.Buttons({
      createOrder: (data, actions) => {
        return actions.order.create({
          purchase_units: [{
            description: `${plan.name} Plan - Nexxus-Pro Subscription`,
            amount: {
              currency_code: currency,
              value: amount,
              breakdown: {
                item_total: {
                  currency_code: currency,
                  value: amount,
                },
              },
            },
            items: [{
              name: `${plan.name} Plan`,
              description: `${plan.period}ly subscription`,
              unit_amount: {
                currency_code: currency,
                value: amount,
              },
              quantity: '1',
            }],
          }],
          application_context: {
            shipping_preference: 'NO_SHIPPING',
          },
        });
      },
      onApprove: async (data, actions) => {
        setIsLoading(true);
        try {
          const order = await actions.order.capture();
          
          // Send to backend
          const response = await fetch('/api/payments/paypal/capture', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              orderId: order.id,
              planId: plan.id,
              amount,
              currency,
            }),
          });

          const result = await response.json();

          if (response.ok) {
            onSuccess?.({
              transactionId: order.id,
              amount,
              currency,
              paymentMethod: 'paypal',
              status: 'completed',
              orderDetails: order,
            });
          } else {
            throw new Error(result.message || 'Payment capture failed');
          }
        } catch (error) {
          console.error('PayPal error:', error);
          onError?.(error.message);
        } finally {
          setIsLoading(false);
        }
      },
      onError: (err) => {
        console.error('PayPal error:', err);
        onError?.('PayPal payment failed. Please try again.');
        setIsLoading(false);
      },
      onCancel: () => {
        onError?.('Payment was cancelled');
        setIsLoading(false);
      },
    }).render('#paypal-button-container');
  };

  return (
    <div className={className}>
      <div className="text-center mb-4">
        <img
          src="/assets/images/payments/paypal.png"
          alt="PayPal"
          className="h-12 mx-auto mb-2"
        />
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Secure payment via PayPal
        </p>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Processing your payment...
          </p>
        </div>
      )}

      <div id="paypal-button-container" style={{ minHeight: '150px' }}></div>

      {!isScriptLoaded && !isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Loading PayPal...
          </p>
        </div>
      )}

      <div className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
        <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Your payment is secure and encrypted
      </div>
    </div>
  );
};

export default PayPalButton;