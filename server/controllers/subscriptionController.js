const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');

// Plan definitions
const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    features: ['1 GB Storage', '5 Merges/month', 'Basic Support', '50 MB File Limit'],
    limits: { storage: 1073741824, merges: 5, fileSize: 52428800 },
    color: 'gray',
  },
  basic: {
    id: 'basic',
    name: 'Basic',
    price: 9.99,
    period: 'month',
    annualPrice: 99.99,
    features: ['10 GB Storage', '50 Merges/month', 'Priority Support', '100 MB File Limit', 'File Sharing'],
    limits: { storage: 10737418240, merges: 50, fileSize: 104857600 },
    popular: true,
    color: 'primary',
  },
  pro: {
    id: 'pro',
    name: 'Professional',
    price: 29.99,
    period: 'month',
    annualPrice: 299.99,
    features: ['100 GB Storage', 'Unlimited Merges', '24/7 Support', '500 MB File Limit', 'API Access', 'Advanced Analytics'],
    limits: { storage: 107374182400, merges: -1, fileSize: 524288000 },
    color: 'secondary',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    period: 'month',
    annualPrice: 999.99,
    features: ['1 TB Storage', 'Unlimited Merges', 'Dedicated Support', '2 GB File Limit', 'SSO Integration', 'SLA Guarantee', 'Custom Deployment'],
    limits: { storage: 1099511627776, merges: -1, fileSize: 2147483648 },
    color: 'purple',
  },
};

// @desc    Get all subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
exports.getPlans = async (req, res) => {
  try {
    res.json({
      success: true,
      data: Object.values(PLANS),
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plans',
    });
  }
};

// @desc    Get single plan
// @route   GET /api/subscriptions/plans/:planId
// @access  Public
exports.getPlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = PLANS[planId];
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Plan not found',
      });
    }
    
    res.json({
      success: true,
      data: plan,
    });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get plan',
    });
  }
};

// @desc    Get current user's subscription
// @route   GET /api/subscriptions/me
// @access  Private
exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'active',
    });
    
    const user = await User.findById(req.user.id);
    const currentPlan = PLANS[user.subscriptionPlan || 'free'];
    
    // Get usage statistics
    const storageUsed = await getStorageUsed(req.user.id);
    const mergesUsed = await getMergesUsed(req.user.id);
    
    res.json({
      success: true,
      data: {
        plan: currentPlan,
        subscription: subscription ? {
          id: subscription._id,
          status: subscription.status,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          autoRenew: subscription.autoRenew,
        } : null,
        usage: {
          storage: {
            used: storageUsed,
            limit: currentPlan.limits.storage,
            percentage: (storageUsed / currentPlan.limits.storage) * 100,
          },
          merges: {
            used: mergesUsed,
            limit: currentPlan.limits.merges,
            percentage: currentPlan.limits.merges === -1 ? 0 : (mergesUsed / currentPlan.limits.merges) * 100,
          },
        },
      },
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription',
    });
  }
};

// @desc    Create/Upgrade subscription
// @route   POST /api/subscriptions/create
// @access  Private
exports.createSubscription = async (req, res) => {
  try {
    const { planId, paymentMethod, paymentDetails, billingCycle = 'month' } = req.body;
    
    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected',
      });
    }
    
    const amount = billingCycle === 'year' ? plan.annualPrice : plan.price;
    
    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      method: paymentMethod,
      amount,
      currency: 'USD',
      planId,
      status: 'pending',
      paymentDetails,
      metadata: { billingCycle },
    });
    
    // Process payment based on method
    let paymentResult;
    switch (paymentMethod) {
      case 'mpesa':
        const mpesaController = require('./mpesaController');
        paymentResult = await mpesaController.initiateSTKPushInternal(req.user, amount, payment._id);
        break;
      case 'paypal':
        const paypalController = require('./paypalController');
        paymentResult = await paypalController.createOrderInternal(req.user, amount, planId, payment._id);
        break;
      case 'bank_transfer':
        const bankController = require('./bankController');
        paymentResult = await bankController.initiateTransferInternal(req.user, amount, planId, payment._id);
        break;
      default:
        throw new Error('Unsupported payment method');
    }
    
    res.status(201).json({
      success: true,
      message: 'Subscription initiated',
      data: {
        paymentId: payment._id,
        ...paymentResult,
      },
    });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create subscription',
    });
  }
};

// @desc    Cancel subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
exports.cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'active',
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }
    
    subscription.status = 'cancelled';
    subscription.cancelledAt = Date.now();
    subscription.cancelReason = reason;
    subscription.autoRenew = false;
    await subscription.save();
    
    // Send cancellation email
    await sendEmail({
      to: req.user.email,
      subject: 'Subscription Cancelled - Nexxus-Pro',
      template: 'subscription-cancelled',
      data: {
        name: req.user.name,
        planId: subscription.planId,
        expiryDate: subscription.endDate,
      },
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'CANCEL_SUBSCRIPTION',
      details: { planId: subscription.planId, reason },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
      data: {
        expiresAt: subscription.endDate,
      },
    });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel subscription',
    });
  }
};

// @desc    Reactivate cancelled subscription
// @route   POST /api/subscriptions/reactivate
// @access  Private
exports.reactivateSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'cancelled',
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No cancelled subscription found',
      });
    }
    
    if (subscription.endDate < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Subscription has already expired. Please create a new subscription.',
      });
    }
    
    subscription.status = 'active';
    subscription.cancelledAt = null;
    subscription.cancelReason = null;
    subscription.autoRenew = true;
    await subscription.save();
    
    await sendEmail({
      to: req.user.email,
      subject: 'Subscription Reactivated - Nexxus-Pro',
      template: 'subscription-reactivated',
      data: {
        name: req.user.name,
        planId: subscription.planId,
      },
    });
    
    res.json({
      success: true,
      message: 'Subscription reactivated successfully',
    });
  } catch (error) {
    console.error('Reactivate subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reactivate subscription',
    });
  }
};

// @desc    Change subscription plan
// @route   PUT /api/subscriptions/change-plan
// @access  Private
exports.changePlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;
    
    const newPlan = PLANS[newPlanId];
    if (!newPlan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan',
      });
    }
    
    const subscription = await Subscription.findOne({
      userId: req.user.id,
      status: 'active',
    });
    
    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: 'No active subscription found',
      });
    }
    
    // Calculate prorated amount if downgrading
    const currentPlan = PLANS[subscription.planId];
    let amount = newPlan.price;
    let isProrated = false;
    
    if (newPlan.price < currentPlan.price) {
      // Downgrade - calculate refund
      const daysLeft = Math.ceil((subscription.endDate - Date.now()) / (1000 * 60 * 60 * 24));
      const daysInMonth = 30;
      const unusedValue = (currentPlan.price / daysInMonth) * daysLeft;
      const newValue = (newPlan.price / daysInMonth) * daysLeft;
      amount = Math.max(0, unusedValue - newValue);
      isProrated = true;
    }
    
    // Create payment for upgrade if needed
    if (amount > 0) {
      const payment = await Payment.create({
        userId: req.user.id,
        method: 'upgrade',
        amount,
        currency: 'USD',
        planId: newPlanId,
        status: 'pending',
      });
      
      // Process upgrade payment
      // ... payment processing logic
    }
    
    // Update subscription
    subscription.planId = newPlanId;
    subscription.features = newPlan.features;
    subscription.limits = newPlan.limits;
    await subscription.save();
    
    await User.findByIdAndUpdate(req.user.id, {
      subscriptionPlan: newPlanId,
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'CHANGE_PLAN',
      details: { oldPlan: subscription.planId, newPlan: newPlanId, prorated: isProrated },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: `Plan changed to ${newPlan.name}`,
      data: {
        plan: newPlan,
        prorated: isProrated,
        amount: amount > 0 ? amount : null,
      },
    });
  } catch (error) {
    console.error('Change plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change plan',
    });
  }
};

// @desc    Get billing history
// @route   GET /api/subscriptions/billing
// @access  Private
exports.getBillingHistory = async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user.id,
      status: 'completed',
    }).sort({ createdAt: -1 });
    
    const billingHistory = payments.map(payment => ({
      id: payment._id,
      date: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency,
      planId: payment.planId,
      method: payment.method,
      invoiceUrl: `/api/subscriptions/invoices/${payment._id}`,
    }));
    
    res.json({
      success: true,
      data: billingHistory,
    });
  } catch (error) {
    console.error('Get billing history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get billing history',
    });
  }
};

// @desc    Download invoice
// @route   GET /api/subscriptions/invoices/:paymentId
// @access  Private
exports.downloadInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user.id,
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }
    
    // Generate PDF invoice
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment._id}.pdf`);
    
    doc.pipe(res);
    
    // Invoice header
    doc.fontSize(20).text('Nexxus-Pro', { align: 'center' });
    doc.fontSize(10).text('Invoice', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(12).text(`Invoice Number: INV-${payment._id.toString().slice(-8)}`);
    doc.text(`Date: ${payment.createdAt.toLocaleDateString()}`);
    doc.text(`Transaction ID: ${payment.transactionId || payment._id}`);
    doc.moveDown();
    
    // Billing details
    const user = await User.findById(req.user.id);
    doc.text('Bill To:');
    doc.text(user.name);
    doc.text(user.email);
    doc.moveDown();
    
    // Items
    doc.text('Description', { continued: true });
    doc.text('Amount', { align: 'right' });
    doc.moveDown();
    doc.text(`${payment.planId} Plan Subscription`, { continued: true });
    doc.text(`$${payment.amount} ${payment.currency}`, { align: 'right' });
    doc.moveDown();
    
    // Total
    doc.fontSize(14).text(`Total: $${payment.amount} ${payment.currency}`, { align: 'right' });
    
    doc.end();
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download invoice',
    });
  }
};

// Helper functions
async function getStorageUsed(userId) {
  const File = require('../models/File');
  const result = await File.aggregate([
    { $match: { userId, isDeleted: false } },
    { $group: { _id: null, total: { $sum: '$size' } } },
  ]);
  return result[0]?.total || 0;
}

async function getMergesUsed(userId) {
  const MergeJob = require('../models/MergeJob');
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  return await MergeJob.countDocuments({
    userId,
    createdAt: { $gte: startOfMonth },
    status: 'completed',
  });
}