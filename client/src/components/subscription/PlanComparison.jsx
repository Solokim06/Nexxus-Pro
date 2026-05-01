import React, { useState } from 'react';
import Button from '../common/Button';

const PlanComparison = ({
  plans = [],
  currentPlanId,
  onSelectPlan,
  className = '',
}) => {
  const [billingCycle, setBillingCycle] = useState('month'); // 'month' or 'year'
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const getPrice = (plan) => {
    if (plan.price === 0) return 'Free';
    const price = billingCycle === 'month' ? plan.price : plan.annualPrice || plan.price * 10;
    return `$${price}/${billingCycle === 'month' ? 'mo' : 'yr'}`;
  };

  const getSavings = (plan) => {
    if (!plan.annualPrice) return null;
    const monthlyTotal = plan.price * 12;
    const savings = monthlyTotal - plan.annualPrice;
    const percentage = (savings / monthlyTotal) * 100;
    return `Save ${Math.round(percentage)}%`;
  };

  const formatLimit = (value) => {
    if (value >= 1073741824) return `${(value / 1073741824).toFixed(0)} GB`;
    if (value >= 1048576) return `${(value / 1048576).toFixed(0)} MB`;
    return `${value}`;
  };

  const allFeatures = () => {
    const featuresSet = new Set();
    plans.forEach(plan => {
      plan.features.forEach(feature => {
        const featureName = typeof feature === 'string' ? feature : feature.name;
        featuresSet.add(featureName);
      });
    });
    return Array.from(featuresSet);
  };

  const hasFeature = (plan, featureName) => {
    const feature = plan.features.find(f => {
      const name = typeof f === 'string' ? f : f.name;
      return name === featureName;
    });
    return !!feature;
  };

  const getFeatureDetail = (plan, featureName) => {
    const feature = plan.features.find(f => {
      const name = typeof f === 'string' ? f : f.name;
      return name === featureName;
    });
    
    if (!feature) return null;
    if (typeof feature === 'string') return true;
    if (feature.limit) return formatLimit(feature.limit);
    return true;
  };

  const features = allFeatures();

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg ${className}`}>
      {/* Billing Toggle */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-center">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('month')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                billingCycle === 'month'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('year')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                billingCycle === 'year'
                  ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
              }`}
            >
              Yearly
              <span className="ml-1 text-xs text-green-600">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="p-4 text-left text-sm font-semibold text-gray-900 dark:text-white">
                Features
              </th>
              {plans.map((plan) => (
                <th key={plan.id} className="p-4 text-center">
                  <div className="mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {plan.name}
                    </h3>
                    <p className="text-2xl font-bold text-primary-600 mt-2">
                      {getPrice(plan)}
                    </p>
                    {plan.price > 0 && billingCycle === 'year' && (
                      <p className="text-xs text-green-600 mt-1">
                        {getSavings(plan)}
                      </p>
                    )}
                  </div>
                  {plan.id !== currentPlanId && plan.price > 0 && (
                    <Button
                      size="sm"
                      onClick={() => onSelectPlan?.(plan)}
                      variant="primary"
                    >
                      {plan.price === 0 ? 'Get Started' : 'Upgrade'}
                    </Button>
                  )}
                  {plan.id === currentPlanId && (
                    <span className="inline-block px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                      Current Plan
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          
          <tbody>
            {features.map((feature, index) => (
              <tr 
                key={index}
                className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onMouseEnter={() => setHoveredFeature(feature)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <td className="p-4 text-sm text-gray-700 dark:text-gray-300">
                  {feature}
                </td>
                {plans.map((plan) => (
                  <td key={plan.id} className="p-4 text-center">
                    {hasFeature(plan, feature) ? (
                      <div className="inline-flex items-center justify-center">
                        {typeof getFeatureDetail(plan, feature) === 'string' ? (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getFeatureDetail(plan, feature)}
                          </span>
                        ) : (
                          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ) : (
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Note */}
      <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          * All plans include basic support. Enterprise plans include priority support and SLA.
          Prices are in USD and exclude applicable taxes.
        </p>
      </div>
    </div>
  );
};

export default PlanComparison;