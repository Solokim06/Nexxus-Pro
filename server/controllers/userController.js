const User = require('../models/User');
const File = require('../models/File');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const MergeJob = require('../models/MergeJob');
const ActivityLog = require('../models/ActivityLog');
const Notification = require('../models/Notification');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('subscriptionId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, company, website, bio, timezone, language } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (company) user.company = company;
    if (website) user.website = website;
    if (bio) user.bio = bio;
    if (timezone) user.timezone = timezone;
    if (language) user.language = language;
    
    await user.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_PROFILE',
      details: { updatedFields: Object.keys(req.body) },
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
    
    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        company: user.company,
        website: user.website,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language,
      },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
};

// @desc    Upload/Update avatar
// @route   POST /api/users/avatar
// @access  Private
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Delete old avatar if exists
    if (user.avatar && user.avatar !== 'default') {
      // Delete from storage
      const { deleteFromStorage } = require('../services/storageService');
      await deleteFromStorage(user.avatar);
    }
    
    user.avatar = req.file.path;
    await user.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE_AVATAR',
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Avatar updated successfully',
      data: { avatar: user.avatar },
    });
  } catch (error) {
    console.error('Update avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update avatar',
    });
  }
};

// @desc    Delete avatar
// @route   DELETE /api/users/avatar
// @access  Private
exports.deleteAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (user.avatar && user.avatar !== 'default') {
      const { deleteFromStorage } = require('../services/storageService');
      await deleteFromStorage(user.avatar);
    }
    
    user.avatar = null;
    await user.save();
    
    res.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error) {
    console.error('Delete avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete avatar',
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/stats
// @access  Private
exports.getUserStats = async (req, res) => {
  try {
    // File statistics
    const fileCount = await File.countDocuments({ userId: req.user.id, isDeleted: false });
    const totalSize = await File.aggregate([
      { $match: { userId: req.user.id, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    
    // Folder statistics
    const Folder = require('../models/Folder');
    const folderCount = await Folder.countDocuments({ userId: req.user.id, isDeleted: false });
    
    // Merge statistics
    const mergeCount = await MergeJob.countDocuments({ userId: req.user.id });
    const successfulMerges = await MergeJob.countDocuments({ userId: req.user.id, status: 'completed' });
    
    // Payment statistics
    const totalSpent = await Payment.aggregate([
      { $match: { userId: req.user.id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    
    // Subscription info
    const subscription = await Subscription.findOne({ userId: req.user.id, status: 'active' });
    
    // Account age
    const accountAge = Math.floor((Date.now() - req.user.createdAt) / (1000 * 60 * 60 * 24));
    
    res.json({
      success: true,
      data: {
        files: {
          total: fileCount,
          totalSize: totalSize[0]?.total || 0,
        },
        folders: folderCount,
        merges: {
          total: mergeCount,
          successful: successfulMerges,
        },
        payments: {
          totalSpent: totalSpent[0]?.total || 0,
        },
        subscription: subscription ? {
          plan: subscription.planId,
          expiresAt: subscription.endDate,
        } : {
          plan: 'free',
        },
        account: {
          createdAt: req.user.createdAt,
          accountAgeDays: accountAge,
          lastLogin: req.user.lastLogin,
        },
      },
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user statistics',
    });
  }
};

// @desc    Get user activity log
// @route   GET /api/users/activity
// @access  Private
exports.getActivityLog = async (req, res) => {
  try {
    const { limit = 50, page = 1, action } = req.query;
    
    const query = { userId: req.user.id };
    if (action) query.action = action;
    
    const activities = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      success: true,
      data: activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity log',
    });
  }
};

// @desc    Get user preferences
// @route   GET /api/users/preferences
// @access  Private
exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    
    res.json({
      success: true,
      data: user.preferences || {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          desktop: false,
        },
        privacy: {
          profileVisibility: 'public',
          showEmail: false,
        },
      },
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences',
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
exports.updatePreferences = async (req, res) => {
  try {
    const { theme, notifications, privacy } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user.preferences) user.preferences = {};
    if (theme) user.preferences.theme = theme;
    if (notifications) user.preferences.notifications = notifications;
    if (privacy) user.preferences.privacy = privacy;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: user.preferences,
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
    });
  }
};

// @desc    Delete user account
// @route   DELETE /api/users/account
// @access  Private
exports.deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id).select('+password');
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password',
      });
    }
    
    // Soft delete user
    user.isDeleted = true;
    user.deletedAt = Date.now();
    user.deletedReason = req.body.reason || 'User requested deletion';
    await user.save();
    
    // Schedule permanent deletion after 30 days
    // This would be handled by a cron job
    
    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Request - Nexxus-Pro',
      template: 'account-deleted',
      data: {
        name: user.name,
        deletionDate: new Date(),
      },
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'DELETE_ACCOUNT',
      details: { reason: req.body.reason },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Account scheduled for deletion. You have 30 days to reactivate.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
    });
  }
};

// @desc    Reactivate account
// @route   POST /api/users/reactivate
// @access  Private
exports.reactivateAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Account is not deleted',
      });
    }
    
    user.isDeleted = false;
    user.deletedAt = null;
    user.deletedReason = null;
    await user.save();
    
    res.json({
      success: true,
      message: 'Account reactivated successfully',
    });
  } catch (error) {
    console.error('Reactivate account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate account',
    });
  }
};