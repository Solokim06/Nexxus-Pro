import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import SubscriptionCard from '../components/subscription/SubscriptionCard';
import PlanComparison from '../components/subscription/PlanComparison';
import CheckoutModal from '../components/payment/CheckoutModal';
import Button from '../components/common/Button';

const Pricing = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [billingCycle, setBillingCycle] = useState('month');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'month',
      features: [
        '1 GB Storage',
        '5 Merges per month',
        'Basic Support',
        '50 MB File Size Limit',
        'Standard Security',
      ],
      limits: {
        storage: 1073741824,
        merges: 5,
        fileSize: 52428800,
      },
      color: 'gray',
    },
    {
      id: 'basic',
      name: 'Basic',
      price: 9.99,
      period: 'month',
      annualPrice: 99.99,
      features: [
        '10 GB Storage',
        '50 Merges per month',
        'Priority Support',
        '100 MB File Size Limit',
        'Advanced Security',
        'File Sharing',
      ],
      limits: {
        storage: 10737418240,
        merges: 50,
        fileSize: 104857600,
      },
      popular: true,
      color: 'primary',
    },
    {
      id: 'pro',
      name: 'Professional',
      price: 29.99,
      period: 'month',
      annualPrice: 299.99,
      features: [
        '100 GB Storage',
        'Unlimited Merges',
        '24/7 Premium Support',
        '500 MB File Size Limit',
        'Bank-level Security',
        'Advanced File Sharing',
        'API Access',
        'Team Collaboration',
      ],
      limits: {
        storage: 107374182400,
        merges: -1,
        fileSize: 524288000,
      },
      color: 'secondary',
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99.99,
      period: 'month',
      annualPrice: 999.99,
      features: [
        '1 TB Storage',
        'Unlimited Merges',
        'Dedicated Support',
        '2 GB File Size Limit',
        'Custom Security',
        'Advanced Analytics',
        'SSO Integration',
        'SLA Guarantee',
      ],
      limits: {
        storage: 1099511627776,
        merges: -1,
        fileSize: 2147483648,
      },
      color: 'purple',
    },
  ];

  const handleSelectPlan = (plan) => {
    if (plan.price === 0) {
      // Handle free plan activation
      activateFreePlan();
    } else {
      setSelectedPlan(plan);
      setShowCheckout(true);
    }
  };

  const activateFreePlan = async () => {
    try {
      const response = await fetch('/api/subscriptions/activate-free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
      
      if (response.ok) {
        // Show success message
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Failed to activate free plan:', error);
    }
  };

  const handlePaymentSuccess = (transaction) => {
    console.log('Payment successful:', transaction);
    setShowCheckout(false);
    // Redirect to dashboard or success page
    window.location.href = '/dashboard';
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    // Show error toast
  };

  const getCurrentPlanId = () => {
    return user?.subscription?.plan || 'free';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Choose the plan that best fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('month')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'month'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('year')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                billingCycle === 'year'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                  : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {plans.map((plan) => (
            <SubscriptionCard
              key={plan.id}
              plan={{
                ...plan,
                price: billingCycle === 'year' && plan.annualPrice ? plan.annualPrice : plan.price,
                period: billingCycle,
              }}
              isCurrentPlan={getCurrentPlanId() === plan.id}
              onSelectPlan={handleSelectPlan}
            />
          ))}
        </div>

        {/* Plan Comparison Table */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Compare All Features
          </h2>
          <PlanComparison
            plans={plans}
            currentPlanId={getCurrentPlanId()}
            onSelectPlan={handleSelectPlan}
          />
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                All paid plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept M-Pesa, PayPal, and bank transfers. All major credit cards are accepted via PayPal.
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, you can cancel your subscription at any time. No hidden fees or long-term contracts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && selectedPlan && (
        <CheckoutModal
          isOpen={showCheckout}
          onClose={() => setShowCheckout(false)}
          plan={selectedPlan}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
        />
      )}
    </div>
  );
};

export default Pricing;