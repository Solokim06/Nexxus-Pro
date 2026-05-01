const User = require('../models/User');
const File = require('../models/File');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const MergeJob = require('../models/MergeJob');
const ActivityLog = require('../models/ActivityLog');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');

// @desc    Get all users with pagination and filters
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      role, 
      subscriptionPlan,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc' 
    } = req.query;
    
    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) query.role = role;
    if (subscriptionPlan) query.subscriptionPlan = subscriptionPlan;
    if (isVerified !== undefined) query.isEmailVerified = isVerified === 'true';
    
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    
    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('subscriptionId');
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users',
    });
  }
};

// @desc    Get single user by ID
// @route   GET /api/admin/users/:id
// @access  Private/Admin
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('subscriptionId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Get user statistics
    const fileCount = await File.countDocuments({ userId: user._id, isDeleted: false });
    const totalSize = await File.aggregate([
      { $match: { userId: user._id, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    const paymentCount = await Payment.countDocuments({ userId: user._id });
    const totalRevenue = await Payment.aggregate([
      { $match: { userId: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const mergeCount = await MergeJob.countDocuments({ userId: user._id });
    
    res.json({
      success: true,
      data: {
        user,
        stats: {
          fileCount,
          totalStorage: totalSize[0]?.total || 0,
          paymentCount,
          totalRevenue: totalRevenue[0]?.total || 0,
          mergeCount,
        },
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user',
    });
  }
};

// @desc    Update user (admin)
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUser = async (req, res) => {
  try {
    const { name, email, phone, role, subscriptionPlan, isLocked, isEmailVerified } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (subscriptionPlan) user.subscriptionPlan = subscriptionPlan;
    if (isLocked !== undefined) user.isLocked = isLocked;
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    
    await user.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'ADMIN_UPDATE_USER',
      details: { targetUserId: user._id, updates: req.body },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
};

// @desc    Delete user (admin)
// @route   DELETE /api/admin/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    // Soft delete user
    user.isDeleted = true;
    user.deletedAt = Date.now();
    user.deletedBy = req.user.id;
    await user.save();
    
    await createAuditLog({
      userId: req.user.id,
      action: 'ADMIN_DELETE_USER',
      details: { targetUserId: user._id, targetEmail: user.email },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
};

// @desc    Get system statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getSystemStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    
    // User statistics
    const totalUsers = await User.countDocuments();
    const newUsersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfMonth } });
    const activeUsers = await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    
    // File statistics
    const totalFiles = await File.countDocuments();
    const totalStorage = await File.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);
    const newFilesThisMonth = await File.countDocuments({ createdAt: { $gte: startOfMonth } });
    
    // Payment statistics
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const revenueThisMonth = await Payment.aggregate([
      { $match: { status: 'completed', completedAt: { $gte: startOfMonth } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    const pendingPayments = await Payment.countDocuments({ status: 'pending' });
    
    // Subscription statistics
    const subscriptionsByPlan = await Subscription.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$planId', count: { $sum: 1 } } },
    ]);
    
    // Merge statistics
    const totalMerges = await MergeJob.countDocuments();
    const mergesThisMonth = await MergeJob.countDocuments({ createdAt: { $gte: startOfMonth } });
    
    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          active: activeUsers,
        },
        files: {
          total: totalFiles,
          totalStorage: totalStorage[0]?.total || 0,
          newThisMonth: newFilesThisMonth,
        },
        payments: {
          totalRevenue: totalRevenue[0]?.total || 0,
          revenueThisMonth: revenueThisMonth[0]?.total || 0,
          pending: pendingPayments,
        },
        subscriptions: subscriptionsByPlan,
        merges: {
          total: totalMerges,
          thisMonth: mergesThisMonth,
        },
      },
    });
  } catch (error) {
    console.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics',
    });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private/Admin
exports.getSystemLogs = async (req, res) => {
  try {
    const { limit = 100, page = 1, action, userId, startDate, endDate } = req.query;
    
    const query = {};
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('userId', 'name email');
    
    const total = await ActivityLog.countDocuments(query);
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get system logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system logs',
    });
  }
};

// @desc    Send broadcast notification
// @route   POST /api/admin/broadcast
// @access  Private/Admin
exports.broadcastNotification = async (req, res) => {
  try {
    const { title, message, type, targetUsers = 'all' } = req.body;
    
    let userQuery = {};
    if (targetUsers === 'active') {
      userQuery = { lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } };
    } else if (targetUsers === 'premium') {
      userQuery = { subscriptionPlan: { $ne: 'free' } };
    }
    
    const users = await User.find(userQuery).select('_id email name');
    
    // Create notifications for all users
    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type,
      createdBy: req.user.id,
    }));
    
    await Notification.insertMany(notifications);
    
    // Send emails to all users
    for (const user of users) {
      await sendEmail({
        to: user.email,
        subject: title,
        template: 'broadcast',
        data: { name: user.name, message },
      });
    }
    
    await createAuditLog({
      userId: req.user.id,
      action: 'ADMIN_BROADCAST',
      details: { title, targetUsers, recipientCount: users.length },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: `Broadcast sent to ${users.length} users`,
    });
  } catch (error) {
    console.error('Broadcast notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast',
    });
  }
};