const File = require('../models/File');
const MergeJob = require('../models/MergeJob');

// Check storage limit
const checkStorageLimit = async (req, res, next) => {
  try {
    const userPlan = req.user.subscriptionPlan || 'free';
    const limits = getPlanLimits(userPlan);
    
    const currentStorage = await File.aggregate([
      { $match: { userId: req.user.id, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    
    const used = currentStorage[0]?.total || 0;
    
    if (used >= limits.storage) {
      return res.status(403).json({
        success: false,
        message: 'Storage limit exceeded. Please upgrade your plan.',
        limits: { used, limit: limits.storage, percentage: (used / limits.storage) * 100 },
      });
    }
    
    req.remainingStorage = limits.storage - used;
    next();
  } catch (error) {
    console.error('Storage limit check error:', error);
    next();
  }
};

// Check file size limit
const checkFileSizeLimit = async (req, res, next) => {
  try {
    const fileSize = parseInt(req.headers['content-length']) || req.file?.size || 0;
    const userPlan = req.user.subscriptionPlan || 'free';
    const limits = getPlanLimits(userPlan);
    
    if (fileSize > limits.fileSize) {
      return res.status(413).json({
        success: false,
        message: `File too large. Maximum file size is ${formatBytes(limits.fileSize)}`,
        limit: limits.fileSize,
      });
    }
    
    next();
  } catch (error) {
    console.error('File size check error:', error);
    next();
  }
};

// Check merge limit (monthly)
const checkMergeLimit = async (req, res, next) => {
  try {
    const userPlan = req.user.subscriptionPlan || 'free';
    const limits = getPlanLimits(userPlan);
    
    if (limits.merges === -1) {
      // Unlimited
      return next();
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const mergesThisMonth = await MergeJob.countDocuments({
      userId: req.user.id,
      createdAt: { $gte: startOfMonth },
      status: 'completed',
    });
    
    if (mergesThisMonth >= limits.merges) {
      return res.status(403).json({
        success: false,
        message: `Monthly merge limit reached (${limits.merges} merges). Please upgrade your plan.`,
        limit: limits.merges,
        used: mergesThisMonth,
      });
    }
    
    req.remainingMerges = limits.merges - mergesThisMonth;
    next();
  } catch (error) {
    console.error('Merge limit check error:', error);
    next();
  }
};

// Check team member limit
const checkTeamLimit = async (req, res, next) => {
  try {
    const userPlan = req.user.subscriptionPlan || 'free';
    const limits = getPlanLimits(userPlan);
    
    if (limits.teamMembers === -1) {
      return next();
    }
    
    const Invitation = require('../models/Invitation');
    const teamMembers = await Invitation.countDocuments({
      invitedBy: req.user.id,
      status: 'accepted',
    });
    
    if (teamMembers >= limits.teamMembers) {
      return res.status(403).json({
        success: false,
        message: `Team member limit reached (${limits.teamMembers} members). Please upgrade your plan.`,
      });
    }
    
    next();
  } catch (error) {
    console.error('Team limit check error:', error);
    next();
  }
};

// Check API call limit
const checkApiLimit = async (req, res, next) => {
  try {
    const userPlan = req.user.subscriptionPlan || 'free';
    const limits = getPlanLimits(userPlan);
    
    if (limits.apiCalls === -1) {
      return next();
    }
    
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const ApiKey = require('../models/ApiKey');
    const apiCallsThisMonth = await ApiKey.aggregate([
      { $match: { userId: req.user.id, lastUsed: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$requestsCount' } } },
    ]);
    
    const used = apiCallsThisMonth[0]?.total || 0;
    
    if (used >= limits.apiCalls) {
      return res.status(429).json({
        success: false,
        message: `API call limit reached (${limits.apiCalls} calls/month). Please upgrade your plan.`,
      });
    }
    
    next();
  } catch (error) {
    console.error('API limit check error:', error);
    next();
  }
};

function getPlanLimits(plan) {
  const limits = {
    free: {
      storage: 1073741824, // 1GB
      fileSize: 52428800, // 50MB
      merges: 5,
      teamMembers: 0,
      apiCalls: 1000,
    },
    basic: {
      storage: 10737418240, // 10GB
      fileSize: 104857600, // 100MB
      merges: 50,
      teamMembers: 3,
      apiCalls: 10000,
    },
    pro: {
      storage: 107374182400, // 100GB
      fileSize: 524288000, // 500MB
      merges: -1, // Unlimited
      teamMembers: 10,
      apiCalls: 50000,
    },
    enterprise: {
      storage: 1099511627776, // 1TB
      fileSize: 2147483648, // 2GB
      merges: -1,
      teamMembers: -1,
      apiCalls: -1,
    },
  };
  return limits[plan] || limits.free;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

module.exports = {
  checkStorageLimit,
  checkFileSizeLimit,
  checkMergeLimit,
  checkTeamLimit,
  checkApiLimit,
};