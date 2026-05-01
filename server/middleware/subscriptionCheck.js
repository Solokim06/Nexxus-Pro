const Subscription = require('../models/Subscription');

// Check if user has active subscription
const requireActiveSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'active',
      endDate: { $gt: Date.now() },
    });
    
    if (!subscription && req.user.subscriptionPlan === 'free') {
      // Free plan - allow basic features only
      req.subscription = { planId: 'free', limits: getFreeLimits() };
      return next();
    }
    
    if (!subscription) {
      return res.status(403).json({
        success: false,
        message: 'Active subscription required for this feature',
        upgradeRequired: true,
      });
    }
    
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error('Subscription check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify subscription',
    });
  }
};

// Check if user has specific plan or higher
const requirePlan = (...plans) => {
  const planLevels = { free: 0, basic: 1, pro: 2, enterprise: 3 };
  
  return async (req, res, next) => {
    try {
      const userPlan = req.user.subscriptionPlan || 'free';
      const requiredLevel = Math.max(...plans.map(p => planLevels[p]));
      const userLevel = planLevels[userPlan];
      
      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `This feature requires ${plans.join(' or ')} plan or higher`,
          requiredPlan: plans,
          currentPlan: userPlan,
          upgradeRequired: true,
        });
      }
      
      next();
    } catch (error) {
      console.error('Plan check error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify plan',
      });
    }
  };
};

// Check trial availability
const checkTrial = async (req, res, next) => {
  try {
    const hasUsedTrial = req.user.metadata?.usedTrial || false;
    
    if (hasUsedTrial && req.user.subscriptionPlan === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Trial already used. Please subscribe to continue.',
        trialUsed: true,
      });
    }
    
    next();
  } catch (error) {
    console.error('Trial check error:', error);
    next();
  }
};

function getFreeLimits() {
  return {
    storage: 1073741824, // 1GB
    fileSize: 52428800, // 50MB
    merges: 5,
  };
}

module.exports = {
  requireActiveSubscription,
  requirePlan,
  checkTrial,
};