import React from 'react';
import Button from '../common/Button';

const SubscriptionCard = ({
  plan,
  isCurrentPlan = false,
  onSelectPlan,
  className = '',
}) => {
  const {
    name,
    price,
    period = 'month',
    features = [],
    limits = {},
    popular = false,
    color = 'primary',
  } = plan;

  const getPriceDisplay = () => {
    if (price === 0) return 'Free';
    return `$${price}/${period === 'month' ? 'mo' : 'yr'}`;
  };

  const getColorStyles = () => {
    const colors = {
      primary: {
        bg: 'from-primary-500 to-primary-600',
        badge: 'bg-primary-500',
        button: 'bg-primary-600 hover:bg-primary-700',
        border: 'border-primary-200 dark:border-primary-800',
      },
      secondary: {
        bg: 'from-secondary-500 to-secondary-600',
        badge: 'bg-secondary-500',
        button: 'bg-secondary-600 hover:bg-secondary-700',
        border: 'border-secondary-200 dark:border-secondary-800',
      },
      purple: {
        bg: 'from-purple-500 to-purple-600',
        badge: 'bg-purple-500',
        button: 'bg-purple-600 hover:bg-purple-700',
        border: 'border-purple-200 dark:border-purple-800',
      },
    };
    return colors[color] || colors.primary;
  };

  const colors = getColorStyles();

  const formatLimit = (value) => {
    if (value >= 1073741824) return `${(value / 1073741824).toFixed(0)} GB`;
    if (value >= 1048576) return `${(value / 1048576).toFixed(0)} MB`;
    return `${value} bytes`;
  };

  const formatFeature = (feature) => {
    if (typeof feature === 'string') return feature;
    if (feature.limit) {
      return `${feature.name}: ${formatLimit(feature.limit)}`;
    }
    return feature.name;
  };

  return (
    <div className={`
      relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden
      transition-all duration-300 hover:shadow-xl hover:scale-105
      ${isCurrentPlan ? 'ring-2 ring-primary-500' : ''}
      ${className}
    `}>
      {/* Popular Badge */}
      {popular && !isCurrentPlan && (
        <div className="absolute top-0 right-0">
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            POPULAR
          </div>
        </div>
      )}

      {/* Current Plan Badge */}
      {isCurrentPlan && (
        <div className="absolute top-0 right-0">
          <div className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            CURRENT PLAN
          </div>
        </div>
      )}

      {/* Plan Header */}
      <div className={`bg-gradient-to-r ${colors.bg} p-6 text-white`}>
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <div className="mb-2">
          <span className="text-4xl font-bold">{getPriceDisplay()}</span>
        </div>
        <p className="text-sm opacity-90">
          {period === 'month' ? 'Billed monthly' : 'Billed annually (save 20%)'}
        </p>
      </div>

      {/* Plan Features */}
      <div className="p-6">
        <ul className="space-y-3 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {formatFeature(feature)}
              </span>
            </li>
          ))}
        </ul>

        {/* Storage Limit */}
        {limits.storage && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">Storage</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {formatLimit(limits.storage)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className={`bg-gradient-to-r ${colors.bg} h-2 rounded-full`}
                style={{ width: '0%' }}
              />
            </div>
          </div>
        )}

        {/* Action Button */}
        {!isCurrentPlan && (
          <Button
            onClick={() => onSelectPlan?.(plan)}
            variant="primary"
            fullWidth
            className={`${colors.button} text-white`}
          >
            {price === 0 ? 'Get Started' : 'Upgrade Now'}
          </Button>
        )}

        {isCurrentPlan && (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Your current subscription
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionCard;