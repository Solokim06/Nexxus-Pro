// ==================== SUBSCRIPTION PLANS DEFINITION ====================

const PLANS = {
  FREE: {
    id: 'free',
    name: 'Free',
    price: 0,
    annualPrice: 0,
    currency: 'USD',
    period: 'month',
    description: 'Perfect for getting started',
    features: [
      '1 GB Storage',
      '5 Merges per month',
      'Basic Support',
      '50 MB File Size Limit',
      'Standard Security',
      'File Sharing',
    ],
    limits: {
      storage: 1 * 1024 * 1024 * 1024,      // 1 GB
      fileSize: 50 * 1024 * 1024,           // 50 MB
      mergesPerMonth: 5,
      teamMembers: 0,
      apiCallsPerMonth: 1000,
      bandwidth: 1 * 1024 * 1024 * 1024,    // 1 GB
    },
    color: '#6B7280',
    badge: null,
    popular: false,
  },
  
  BASIC: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    annualPrice: 99.99,
    currency: 'USD',
    period: 'month',
    description: 'For individuals and small teams',
    features: [
      '10 GB Storage',
      '50 Merges per month',
      'Priority Support',
      '100 MB File Size Limit',
      'Advanced Security',
      'File Sharing',
      'Version History (30 days)',
    ],
    limits: {
      storage: 10 * 1024 * 1024 * 1024,     // 10 GB
      fileSize: 100 * 1024 * 1024,          // 100 MB
      mergesPerMonth: 50,
      teamMembers: 3,
      apiCallsPerMonth: 10000,
      bandwidth: 10 * 1024 * 1024 * 1024,   // 10 GB
    },
    color: '#3B82F6',
    badge: null,
    popular: true,
  },
  
  PRO: {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    annualPrice: 299.99,
    currency: 'USD',
    period: 'month',
    description: 'For professionals and growing businesses',
    features: [
      '100 GB Storage',
      'Unlimited Merges',
      '24/7 Premium Support',
      '500 MB File Size Limit',
      'Bank-level Security',
      'Advanced File Sharing',
      'API Access',
      'Team Collaboration',
      'Version History (90 days)',
      'Advanced Analytics',
    ],
    limits: {
      storage: 100 * 1024 * 1024 * 1024,    // 100 GB
      fileSize: 500 * 1024 * 1024,          // 500 MB
      mergesPerMonth: -1,                   // Unlimited
      teamMembers: 10,
      apiCallsPerMonth: 50000,
      bandwidth: 100 * 1024 * 1024 * 1024,  // 100 GB
    },
    color: '#8B5CF6',
    badge: 'BEST VALUE',
    popular: true,
  },
  
  ENTERPRISE: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    annualPrice: 999.99,
    currency: 'USD',
    period: 'month',
    description: 'For large organizations',
    features: [
      '1 TB Storage',
      'Unlimited Merges',
      'Dedicated Support',
      '2 GB File Size Limit',
      'Custom Security Policies',
      'Advanced Analytics',
      'SSO Integration',
      'SLA Guarantee (99.9%)',
      'Custom Integrations',
      'Audit Logs',
      'Version History (1 year)',
      'Data Export',
    ],
    limits: {
      storage: 1024 * 1024 * 1024 * 1024,   // 1 TB
      fileSize: 2 * 1024 * 1024 * 1024,     // 2 GB
      mergesPerMonth: -1,                   // Unlimited
      teamMembers: -1,                      // Unlimited
      apiCallsPerMonth: -1,                 // Unlimited
      bandwidth: 1024 * 1024 * 1024 * 1024, // 1 TB
    },
    color: '#10B981',
    badge: 'CUSTOM',
    popular: false,
  },
};

// ==================== PLAN COMPARISON ====================

const getPlanComparison = () => {
  const plans = Object.values(PLANS);
  const features = [
    'Storage',
    'File Size Limit',
    'Merges per month',
    'Team Members',
    'API Calls',
    'Priority Support',
    '24/7 Support',
    'File Sharing',
    'Version History',
    'Advanced Analytics',
    'API Access',
    'SSO Integration',
    'Audit Logs',
  ];
  
  const comparison = features.map(feature => {
    const row = { feature };
    plans.forEach(plan => {
      row[plan.id] = getFeatureValue(plan, feature);
    });
    return row;
  });
  
  return { plans, comparison };
};

const getFeatureValue = (plan, feature) => {
  const featureMap = {
    'Storage': () => formatBytes(plan.limits.storage),
    'File Size Limit': () => formatBytes(plan.limits.fileSize),
    'Merges per month': () => plan.limits.mergesPerMonth === -1 ? 'Unlimited' : plan.limits.mergesPerMonth,
    'Team Members': () => plan.limits.teamMembers === -1 ? 'Unlimited' : plan.limits.teamMembers,
    'API Calls': () => plan.limits.apiCallsPerMonth === -1 ? 'Unlimited' : plan.limits.apiCallsPerMonth.toLocaleString(),
    'Priority Support': () => plan.id !== 'free',
    '24/7 Support': () => ['pro', 'enterprise'].includes(plan.id),
    'File Sharing': () => plan.id !== 'free',
    'Version History': () => {
      if (plan.id === 'free') return 'None';
      if (plan.id === 'basic') return '30 days';
      if (plan.id === 'pro') return '90 days';
      return '1 year';
    },
    'Advanced Analytics': () => ['pro', 'enterprise'].includes(plan.id),
    'API Access': () => ['pro', 'enterprise'].includes(plan.id),
    'SSO Integration': () => plan.id === 'enterprise',
    'Audit Logs': () => plan.id === 'enterprise',
  };
  
  return featureMap[feature] ? featureMap[feature]() : '✓';
};

// ==================== PLAN UTILITIES ====================

const getPlanById = (planId) => {
  return PLANS[planId.toUpperCase()] || null;
};

const getPlanByPrice = (price) => {
  return Object.values(PLANS).find(plan => plan.price === price) || null;
};

const getPlanByFeature = (feature) => {
  return Object.values(PLANS).filter(plan => plan.features.includes(feature));
};

const getPlansByPriceRange = (min, max) => {
  return Object.values(PLANS).filter(plan => plan.price >= min && plan.price <= max);
};

const getRecommendedPlan = (storageNeeded, mergesNeeded, teamSize) => {
  const plans = Object.values(PLANS);
  
  for (const plan of plans) {
    if (plan.limits.storage >= storageNeeded &&
        (plan.limits.mergesPerMonth === -1 || plan.limits.mergesPerMonth >= mergesNeeded) &&
        (plan.limits.teamMembers === -1 || plan.limits.teamMembers >= teamSize)) {
      return plan;
    }
  }
  
  return PLANS.ENTERPRISE;
};

const getUpgradePath = (currentPlanId) => {
  const order = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = order.indexOf(currentPlanId);
  
  if (currentIndex === -1 || currentIndex === order.length - 1) {
    return [];
  }
  
  return order.slice(currentIndex + 1).map(id => PLANS[id.toUpperCase()]);
};

const getDowngradePath = (currentPlanId) => {
  const order = ['free', 'basic', 'pro', 'enterprise'];
  const currentIndex = order.indexOf(currentPlanId);
  
  if (currentIndex <= 0) {
    return [];
  }
  
  return order.slice(0, currentIndex).reverse().map(id => PLANS[id.toUpperCase()]);
};

// ==================== PRICE CALCULATIONS ====================

const calculateProratedPrice = (currentPlan, newPlan, daysLeftInCycle) => {
  const daysInCycle = 30;
  const currentDailyPrice = currentPlan.price / daysInCycle;
  const newDailyPrice = newPlan.price / daysInCycle;
  
  const currentRemainingValue = currentDailyPrice * daysLeftInCycle;
  const newRemainingValue = newDailyPrice * daysLeftInCycle;
  
  if (newPlan.price > currentPlan.price) {
    // Upgrade - pay difference
    return {
      amount: newRemainingValue - currentRemainingValue,
      type: 'payment',
    };
  } else {
    // Downgrade - get refund
    return {
      amount: currentRemainingValue - newRemainingValue,
      type: 'refund',
    };
  }
};

const calculateAnnualSavings = (planId) => {
  const plan = getPlanById(planId);
  if (!plan || plan.annualPrice === 0) return { savings: 0, percentage: 0 };
  
  const monthlyTotal = plan.price * 12;
  const savings = monthlyTotal - plan.annualPrice;
  const percentage = (savings / monthlyTotal) * 100;
  
  return { savings, percentage };
};

// ==================== HELPER FUNCTIONS ====================

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

// ==================== EXPORTS ====================

module.exports = {
  PLANS,
  getPlanById,
  getPlanByPrice,
  getPlanByFeature,
  getPlansByPriceRange,
  getPlanComparison,
  getRecommendedPlan,
  getUpgradePath,
  getDowngradePath,
  calculateProratedPrice,
  calculateAnnualSavings,
  formatBytes,
  formatCurrency,
};