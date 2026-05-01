const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');
const crypto = require('crypto');

// @desc    Get available payment methods
// @route   GET /api/payments/methods
// @access  Private
exports.getPaymentMethods = async (req, res) => {
  try {
    const methods = [
      {
        id: 'mpesa',
        name: 'M-Pesa',
        icon: '/assets/images/payments/mpesa.png',
        description: 'Pay with M-Pesa mobile money',
        enabled: process.env.ENABLE_MPESA === 'true',
        countries: ['KE', 'TZ', 'UG'],
        currencies: ['KES'],
      },
      {
        id: 'paypal',
        name: 'PayPal',
        icon: '/assets/images/payments/paypal.png',
        description: 'Pay with PayPal or credit card',
        enabled: process.env.ENABLE_PAYPAL === 'true',
        countries: ['WW'],
        currencies: ['USD', 'EUR', 'GBP'],
      },
      {
        id: 'bank_transfer',
        name: 'Bank Transfer',
        icon: '/assets/images/payments/bank.png',
        description: 'Direct bank transfer',
        enabled: process.env.ENABLE_BANK_TRANSFER === 'true',
        countries: ['KE'],
        currencies: ['KES', 'USD'],
      },
    ];
    
    res.json({
      success: true,
      data: methods.filter(m => m.enabled),
    });
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment methods',
    });
  }
};

// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private
exports.processPayment = async (req, res) => {
  try {
    const { method, amount, currency, planId, paymentDetails, billingCycle = 'month' } = req.body;
    
    // Validate payment method
    const validMethods = ['mpesa', 'paypal', 'bank_transfer'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method',
      });
    }
    
    // Get plan details
    const plan = getPlanDetails(planId, billingCycle);
    if (!plan) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan selected',
      });
    }
    
    // Create payment record
    const payment = await Payment.create({
      userId: req.user.id,
      method,
      amount: plan.price,
      currency: currency || 'USD',
      planId,
      status: 'pending',
      paymentDetails: {
        ...paymentDetails,
        billingCycle,
        planName: plan.name,
      },
      metadata: {
        userEmail: req.user.email,
        userName: req.user.name,
      },
    });
    
    // Process based on payment method
    let result;
    switch (method) {
      case 'mpesa':
        result = await processMpesaPayment(payment, paymentDetails);
        break;
      case 'paypal':
        result = await processPayPalPayment(payment, paymentDetails);
        break;
      case 'bank_transfer':
        result = await processBankTransfer(payment, paymentDetails);
        break;
      default:
        throw new Error('Unsupported payment method');
    }
    
    await createAuditLog({
      userId: req.user.id,
      action: 'PAYMENT_INITIATED',
      details: { method, amount: plan.price, planId },
      ip: req.ip,
    });
    
    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: {
        paymentId: payment._id,
        status: payment.status,
        ...result,
      },
    });
  } catch (error) {
    console.error('Process payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Payment processing failed',
    });
  }
};

// @desc    Verify payment
// @route   POST /api/payments/verify
// @access  Private
exports.verifyPayment = async (req, res) => {
  try {
    const { paymentId, transactionId } = req.body;
    
    const payment = await Payment.findOne({
      $or: [{ _id: paymentId }, { transactionId }],
      userId: req.user.id,
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }
    
    // If already completed
    if (payment.status === 'completed') {
      return res.json({
        success: true,
        data: {
          status: 'completed',
          transactionId: payment.transactionId,
          amount: payment.amount,
          completedAt: payment.completedAt,
        },
      });
    }
    
    // Verify with payment provider
    let verificationResult;
    switch (payment.method) {
      case 'mpesa':
        verificationResult = await verifyMpesaPayment(payment);
        break;
      case 'paypal':
        verificationResult = await verifyPayPalPayment(payment);
        break;
      case 'bank_transfer':
        verificationResult = await verifyBankTransfer(payment);
        break;
      default:
        verificationResult = { verified: false };
    }
    
    if (verificationResult.verified && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      if (verificationResult.transactionId) {
        payment.transactionId = verificationResult.transactionId;
      }
      await payment.save();
      
      // Activate subscription
      await activateSubscription(payment.userId, payment.planId, payment.metadata?.billingCycle);
      
      // Send confirmation email
      await sendPaymentConfirmationEmail(payment);
      
      await createAuditLog({
        userId: req.user.id,
        action: 'PAYMENT_VERIFIED',
        details: { paymentId: payment._id, amount: payment.amount },
        ip: req.ip,
      });
    }
    
    res.json({
      success: true,
      data: {
        status: payment.status,
        transactionId: payment.transactionId,
        amount: payment.amount,
        completedAt: payment.completedAt,
        error: payment.error,
      },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
    });
  }
};

// @desc    Get payment by ID
// @route   GET /api/payments/:paymentId
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user.id,
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }
    
    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment',
    });
  }
};

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
exports.getPaymentHistory = async (req, res) => {
  try {
    const { limit = 20, page = 1, status, method, startDate, endDate } = req.query;
    
    const query = { userId: req.user.id };
    if (status && status !== 'all') query.status = status;
    if (method && method !== 'all') query.method = method;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Payment.countDocuments(query);
    
    // Calculate summary
    const summary = await Payment.aggregate([
      { $match: { userId: req.user.id, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalSpent: { $sum: '$amount' },
          totalPayments: { $sum: 1 },
          averageAmount: { $avg: '$amount' },
        },
      },
    ]);
    
    res.json({
      success: true,
      data: payments,
      summary: summary[0] || {
        totalSpent: 0,
        totalPayments: 0,
        averageAmount: 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment history',
    });
  }
};

// @desc    Get invoices
// @route   GET /api/payments/invoices
// @access  Private
exports.getInvoices = async (req, res) => {
  try {
    const payments = await Payment.find({
      userId: req.user.id,
      status: 'completed',
    }).sort({ createdAt: -1 });
    
    const invoices = payments.map(payment => ({
      id: payment._id,
      number: `INV-${payment._id.toString().slice(-8).toUpperCase()}`,
      date: payment.createdAt,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      description: `${payment.planId} Plan Subscription`,
      method: payment.method,
      downloadUrl: `/api/payments/invoices/${payment._id}/download`,
    }));
    
    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoices',
    });
  }
};

// @desc    Download invoice PDF
// @route   GET /api/payments/invoices/:paymentId/download
// @access  Private
exports.downloadInvoice = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user.id,
    });
    
    if (!payment || payment.status !== 'completed') {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }
    
    const user = await User.findById(req.user.id);
    
    // Generate PDF invoice
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ margin: 50 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${payment._id}.pdf`);
    
    doc.pipe(res);
    
    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('Nexxus-Pro', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Enterprise File Management Platform', { align: 'center' });
    doc.moveDown();
    
    // Invoice title
    doc.fontSize(16).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(10).font('Helvetica');
    const invoiceNumber = `INV-${payment._id.toString().slice(-8).toUpperCase()}`;
    doc.text(`Invoice Number: ${invoiceNumber}`, { align: 'right' });
    doc.text(`Date: ${payment.createdAt.toLocaleDateString()}`, { align: 'right' });
    doc.text(`Transaction ID: ${payment.transactionId || payment._id}`, { align: 'right' });
    doc.moveDown();
    
    // Bill To
    doc.font('Helvetica-Bold').text('Bill To:');
    doc.font('Helvetica');
    doc.text(user.name);
    doc.text(user.email);
    if (user.company) doc.text(user.company);
    if (user.phone) doc.text(`Phone: ${user.phone}`);
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Quantity', 350, tableTop);
    doc.text('Amount', 450, tableTop);
    
    doc.moveDown();
    const lineY = doc.y;
    doc.moveTo(50, lineY).lineTo(550, lineY).stroke();
    
    // Table row
    doc.font('Helvetica');
    const planName = `${payment.planId.charAt(0).toUpperCase() + payment.planId.slice(1)} Plan`;
    const period = payment.metadata?.billingCycle === 'year' ? 'Annual' : 'Monthly';
    doc.text(`${planName} Subscription (${period})`, 50);
    doc.text('1', 350);
    doc.text(`$${payment.amount} ${payment.currency}`, 450);
    
    doc.moveDown();
    doc.moveDown();
    
    // Total
    const totalY = doc.y;
    doc.moveTo(350, totalY).lineTo(550, totalY).stroke();
    doc.font('Helvetica-Bold');
    doc.text('Total:', 350);
    doc.text(`$${payment.amount} ${payment.currency}`, 450);
    
    doc.moveDown();
    doc.moveDown();
    
    // Payment info
    doc.font('Helvetica-Bold').text('Payment Information:');
    doc.font('Helvetica');
    doc.text(`Payment Method: ${payment.method.toUpperCase()}`);
    doc.text(`Payment Status: ${payment.status.toUpperCase()}`);
    doc.text(`Payment Date: ${payment.completedAt?.toLocaleDateString() || payment.createdAt.toLocaleDateString()}`);
    
    doc.moveDown();
    
    // Footer
    const pageHeight = doc.page.height;
    doc.fontSize(8);
    doc.text('Thank you for your business!', 50, pageHeight - 50, { align: 'center' });
    doc.text('For questions regarding this invoice, please contact support@nexxus-pro.com', 50, pageHeight - 40, { align: 'center' });
    
    doc.end();
  } catch (error) {
    console.error('Download invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice',
    });
  }
};

// @desc    Request refund
// @route   POST /api/payments/:paymentId/refund
// @access  Private
exports.requestRefund = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { reason } = req.body;
    
    const payment = await Payment.findOne({
      _id: paymentId,
      userId: req.user.id,
      status: 'completed',
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found or not eligible for refund',
      });
    }
    
    // Check if within refund period (30 days)
    const daysSincePayment = (Date.now() - payment.completedAt) / (1000 * 60 * 60 * 24);
    if (daysSincePayment > 30) {
      return res.status(400).json({
        success: false,
        message: 'Refund period has expired (30 days)',
      });
    }
    
    payment.refundRequested = true;
    payment.refundReason = reason;
    payment.refundRequestedAt = Date.now();
    await payment.save();
    
    // Notify admin
    await notifyAdminRefundRequest(payment);
    
    await createAuditLog({
      userId: req.user.id,
      action: 'REFUND_REQUESTED',
      details: { paymentId, amount: payment.amount, reason },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'Refund request submitted successfully',
      data: {
        paymentId: payment._id,
        status: 'pending_review',
        estimatedTime: '3-5 business days',
      },
    });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process refund request',
    });
  }
};

// @desc    Get saved payment methods
// @route   GET /api/payments/saved-methods
// @access  Private
exports.getSavedPaymentMethods = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    res.json({
      success: true,
      data: user.savedPaymentMethods || [],
    });
  } catch (error) {
    console.error('Get saved payment methods error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get saved payment methods',
    });
  }
};

// @desc    Save payment method
// @route   POST /api/payments/save-method
// @access  Private
exports.savePaymentMethod = async (req, res) => {
  try {
    const { method, details, setAsDefault = false } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (!user.savedPaymentMethods) {
      user.savedPaymentMethods = [];
    }
    
    const newMethod = {
      id: crypto.randomBytes(16).toString('hex'),
      method,
      details,
      isDefault: setAsDefault && user.savedPaymentMethods.length === 0,
      createdAt: Date.now(),
    };
    
    if (setAsDefault) {
      user.savedPaymentMethods.forEach(m => {
        m.isDefault = false;
      });
    }
    
    user.savedPaymentMethods.push(newMethod);
    await user.save();
    
    res.json({
      success: true,
      message: 'Payment method saved successfully',
      data: newMethod,
    });
  } catch (error) {
    console.error('Save payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save payment method',
    });
  }
};

// @desc    Delete saved payment method
// @route   DELETE /api/payments/saved-methods/:methodId
// @access  Private
exports.deletePaymentMethod = async (req, res) => {
  try {
    const { methodId } = req.params;
    
    const user = await User.findById(req.user.id);
    
    user.savedPaymentMethods = user.savedPaymentMethods.filter(
      m => m.id !== methodId
    );
    await user.save();
    
    res.json({
      success: true,
      message: 'Payment method deleted successfully',
    });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment method',
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function getPlanDetails(planId, billingCycle = 'month') {
  const plans = {
    basic: {
      name: 'Basic',
      monthlyPrice: 9.99,
      annualPrice: 99.99,
      features: ['10GB Storage', '50 Merges/month'],
      limits: { storage: 10737418240, merges: 50 },
    },
    pro: {
      name: 'Professional',
      monthlyPrice: 29.99,
      annualPrice: 299.99,
      features: ['100GB Storage', 'Unlimited Merges'],
      limits: { storage: 107374182400, merges: -1 },
    },
    enterprise: {
      name: 'Enterprise',
      monthlyPrice: 99.99,
      annualPrice: 999.99,
      features: ['1TB Storage', 'Unlimited Merges'],
      limits: { storage: 1099511627776, merges: -1 },
    },
  };
  
  const plan = plans[planId];
  if (!plan) return null;
  
  return {
    name: plan.name,
    price: billingCycle === 'year' ? plan.annualPrice : plan.monthlyPrice,
    billingCycle,
    features: plan.features,
    limits: plan.limits,
  };
}

async function processMpesaPayment(payment, details) {
  const mpesaService = require('./mpesaController');
  const result = await mpesaService.initiateSTKPushInternal(
    { id: payment.userId, phone: details.phoneNumber },
    payment.amount,
    payment._id
  );
  return { checkoutRequestId: result.checkoutRequestId };
}

async function processPayPalPayment(payment, details) {
  const paypalService = require('./paypalController');
  const result = await paypalService.createOrderInternal(
    { id: payment.userId },
    payment.amount,
    payment.planId,
    payment._id
  );
  return { orderId: result.orderId, approvalUrl: result.approvalUrl };
}

async function processBankTransfer(payment, details) {
  const bankService = require('./bankController');
  const result = await bankService.initiateTransferInternal(
    { id: payment.userId, email: payment.metadata.userEmail, name: payment.metadata.userName },
    payment.amount,
    payment.planId,
    payment._id
  );
  return { reference: result.reference, bankDetails: result.bankDetails };
}

async function verifyMpesaPayment(payment) {
  // Implementation would check with Safaricom API
  return { verified: payment.status === 'completed' };
}

async function verifyPayPalPayment(payment) {
  // Implementation would check with PayPal API
  return { verified: payment.status === 'completed' };
}

async function verifyBankTransfer(payment) {
  // Implementation would check with bank API or admin verification
  return { verified: payment.status === 'completed' };
}

async function activateSubscription(userId, planId, billingCycle = 'month') {
  // Deactivate old subscription
  await Subscription.updateMany(
    { userId, status: 'active' },
    { status: 'expired', endedAt: Date.now() }
  );
  
  const plan = getPlanDetails(planId, billingCycle);
  const durationDays = billingCycle === 'year' ? 365 : 30;
  
  const subscription = await Subscription.create({
    userId,
    planId,
    status: 'active',
    startDate: Date.now(),
    endDate: new Date(Date.now() + (durationDays * 24 * 60 * 60 * 1000)),
    features: plan.features,
    limits: plan.limits,
    billingCycle,
    autoRenew: true,
  });
  
  await User.findByIdAndUpdate(userId, {
    subscriptionId: subscription._id,
    subscriptionPlan: planId,
  });
  
  return subscription;
}

async function sendPaymentConfirmationEmail(payment) {
  const user = await User.findById(payment.userId);
  const plan = getPlanDetails(payment.planId, payment.metadata?.billingCycle);
  
  await sendEmail({
    to: user.email,
    subject: 'Payment Confirmation - Nexxus-Pro',
    template: 'payment-success',
    data: {
      name: user.name,
      amount: payment.amount,
      currency: payment.currency,
      planName: plan.name,
      planId: payment.planId,
      transactionId: payment.transactionId,
      date: payment.completedAt,
      nextBillingDate: new Date(Date.now() + (plan.billingCycle === 'year' ? 365 : 30) * 24 * 60 * 60 * 1000),
    },
  });
}

async function notifyAdminRefundRequest(payment) {
  const user = await User.findById(payment.userId);
  
  await sendEmail({
    to: process.env.ADMIN_EMAIL || 'admin@nexxus-pro.com',
    subject: 'Refund Request Submitted',
    template: 'admin-refund-request',
    data: {
      userName: user.name,
      userEmail: user.email,
      amount: payment.amount,
      paymentId: payment._id,
      reason: payment.refundReason,
      requestedAt: payment.refundRequestedAt,
    },
  });
}