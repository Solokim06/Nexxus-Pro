const Payment = require('../models/Payment');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');
const crypto = require('crypto');

// Bank details (should be in environment variables)
const BANK_DETAILS = {
  bankName: process.env.BANK_NAME || 'KCB Bank Kenya',
  accountName: process.env.BANK_ACCOUNT_NAME || 'Nexxus-Pro Ltd',
  accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
  branch: process.env.BANK_BRANCH || 'Upper Hill, Nairobi',
  swiftCode: process.env.BANK_SWIFT_CODE || 'KCBLKENX',
};

// @desc    Initiate bank transfer
// @route   POST /api/payments/bank/initiate
// @access  Private
exports.initiateBankTransfer = async (req, res) => {
  try {
    const { amount, planId } = req.body;
    
    // Generate unique reference number
    const reference = `NXP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    
    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      method: 'bank_transfer',
      amount,
      currency: 'KES',
      planId,
      transactionId: reference,
      status: 'pending',
      paymentDetails: {
        reference,
        bankDetails: BANK_DETAILS,
      },
    });
    
    // Send bank details email
    await sendEmail({
      to: req.user.email,
      subject: 'Bank Transfer Instructions - Nexxus-Pro',
      template: 'bank-transfer-instructions',
      data: {
        name: req.user.name,
        reference,
        amount,
        bankDetails: BANK_DETAILS,
      },
    });
    
    res.status(201).json({
      success: true,
      message: 'Bank transfer initiated',
      data: {
        reference,
        paymentId: payment._id,
        bankDetails: BANK_DETAILS,
        instructions: [
          'Transfer the exact amount to the bank account above',
          'Use the reference number as the transaction description',
          'Upload your payment receipt for verification',
          'Payment will be confirmed within 24-48 hours',
        ],
      },
    });
  } catch (error) {
    console.error('Initiate bank transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate bank transfer',
    });
  }
};

// @desc    Confirm bank transfer (with receipt upload)
// @route   POST /api/payments/bank/confirm
// @access  Private
exports.confirmBankTransfer = async (req, res) => {
  try {
    const { reference } = req.body;
    const receiptFile = req.file;
    
    if (!receiptFile) {
      return res.status(400).json({
        success: false,
        message: 'Payment receipt is required',
      });
    }
    
    const payment = await Payment.findOne({
      transactionId: reference,
      userId: req.user.id,
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }
    
    if (payment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment already confirmed',
      });
    }
    
    // Save receipt
    payment.receiptUrl = receiptFile.path;
    payment.status = 'pending_verification';
    payment.submittedAt = Date.now();
    await payment.save();
    
    // Notify admin for verification
    await notifyAdminForVerification(payment);
    
    // Send confirmation email to user
    await sendEmail({
      to: req.user.email,
      subject: 'Payment Receipt Received - Nexxus-Pro',
      template: 'payment-receipt-received',
      data: {
        name: req.user.name,
        reference,
        amount: payment.amount,
      },
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'BANK_TRANSFER_CONFIRM',
      details: { reference, amount: payment.amount },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Payment receipt submitted for verification',
      data: {
        reference,
        status: 'pending_verification',
        estimatedTime: '24-48 hours',
      },
    });
  } catch (error) {
    console.error('Confirm bank transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm bank transfer',
    });
  }
};

// @desc    Get bank transfer status
// @route   GET /api/payments/bank/status/:reference
// @access  Private
exports.getTransferStatus = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const payment = await Payment.findOne({
      transactionId: reference,
      userId: req.user.id,
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }
    
    res.json({
      success: true,
      data: {
        reference: payment.transactionId,
        status: payment.status,
        amount: payment.amount,
        submittedAt: payment.submittedAt,
        completedAt: payment.completedAt,
        notes: payment.verificationNotes,
      },
    });
  } catch (error) {
    console.error('Get transfer status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get transfer status',
    });
  }
};

// @desc    Get bank details
// @route   GET /api/payments/bank/details
// @access  Private
exports.getBankDetails = async (req, res) => {
  try {
    res.json({
      success: true,
      data: BANK_DETAILS,
    });
  } catch (error) {
    console.error('Get bank details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bank details',
    });
  }
};

// @desc    Admin: Verify bank transfer
// @route   PUT /api/admin/bank/verify/:paymentId
// @access  Private/Admin
exports.verifyBankTransfer = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { status, notes } = req.body;
    
    const payment = await Payment.findById(paymentId);
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }
    
    if (status === 'completed') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      payment.verificationNotes = notes;
      await payment.save();
      
      // Activate subscription
      await activateSubscription(payment.userId, payment.planId);
      
      // Send success email
      await sendEmail({
        to: payment.userId.email,
        subject: 'Payment Verified - Nexxus-Pro',
        template: 'payment-verified',
        data: {
          name: payment.userId.name,
          amount: payment.amount,
          planId: payment.planId,
        },
      });
    } else if (status === 'failed') {
      payment.status = 'failed';
      payment.verificationNotes = notes;
      await payment.save();
      
      // Send failure email
      await sendEmail({
        to: payment.userId.email,
        subject: 'Payment Verification Failed - Nexxus-Pro',
        template: 'payment-verification-failed',
        data: {
          name: payment.userId.name,
          reason: notes,
        },
      });
    }
    
    res.json({
      success: true,
      message: `Payment ${status === 'completed' ? 'verified' : 'rejected'} successfully`,
    });
  } catch (error) {
    console.error('Verify bank transfer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment',
    });
  }
};

// @desc    Admin: Get pending bank transfers
// @route   GET /api/admin/bank/pending
// @access  Private/Admin
exports.getPendingTransfers = async (req, res) => {
  try {
    const payments = await Payment.find({
      method: 'bank_transfer',
      status: 'pending_verification',
    }).populate('userId', 'name email');
    
    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Get pending transfers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending transfers',
    });
  }
};

// Helper function to notify admin
async function notifyAdminForVerification(payment) {
  // Implementation depends on your notification system
  console.log(`Bank transfer verification needed: ${payment.transactionId}`);
  
  // Could send email to admin, create notification, etc.
  await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@nexxus-pro.com',
    subject: 'New Bank Transfer Verification Required',
    template: 'admin-bank-verification',
    data: {
      reference: payment.transactionId,
      amount: payment.amount,
      userId: payment.userId,
      receiptUrl: payment.receiptUrl,
    },
  });
}

// Helper function to activate subscription (reuse from paymentController)
async function activateSubscription(userId, planId) {
  const Subscription = require('../models/Subscription');
  const User = require('../models/User');
  
  // Deactivate old subscription
  await Subscription.updateMany(
    { userId, status: 'active' },
    { status: 'expired', endedAt: Date.now() }
  );
  
  // Get plan details
  const planDetails = getPlanDetails(planId);
  
  // Create new subscription
  const subscription = await Subscription.create({
    userId,
    planId,
    status: 'active',
    startDate: Date.now(),
    endDate: new Date(Date.now() + (planDetails.durationDays * 24 * 60 * 60 * 1000)),
    features: planDetails.features,
    limits: planDetails.limits,
  });
  
  // Update user
  await User.findByIdAndUpdate(userId, {
    subscriptionId: subscription._id,
    subscriptionPlan: planId,
  });
  
  return subscription;
}

function getPlanDetails(planId) {
  const plans = {
    basic: { durationDays: 30, features: ['10GB Storage', '50 Merges'], limits: { storage: 10737418240, merges: 50 } },
    pro: { durationDays: 30, features: ['100GB Storage', 'Unlimited Merges'], limits: { storage: 107374182400, merges: -1 } },
    enterprise: { durationDays: 365, features: ['1TB Storage', 'Unlimited Merges'], limits: { storage: 1099511627776, merges: -1 } },
  };
  return plans[planId] || plans.basic;
}