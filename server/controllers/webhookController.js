const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');
const crypto = require('crypto');

// @desc    Handle M-Pesa webhook
// @route   POST /api/webhooks/mpesa
// @access  Public
exports.handleMpesaWebhook = async (req, res) => {
  try {
    const { Body } = req.body;
    const { stkCallback } = Body;
    
    console.log('M-Pesa webhook received:', stkCallback);
    
    const payment = await Payment.findOne({ transactionId: stkCallback.CheckoutRequestID });
    
    if (!payment) {
      console.error('Payment not found for transaction:', stkCallback.CheckoutRequestID);
      return res.json({ ResultCode: 1, ResultDesc: 'Payment not found' });
    }
    
    if (stkCallback.ResultCode === 0) {
      // Payment successful
      const { CallbackMetadata } = stkCallback;
      const metadata = {};
      CallbackMetadata.Item.forEach(item => {
        metadata[item.Name] = item.Value;
      });
      
      payment.status = 'completed';
      payment.completedAt = Date.now();
      payment.metadata = metadata;
      payment.transactionId = metadata.MpesaReceiptNumber || payment.transactionId;
      await payment.save();
      
      // Activate subscription
      await activateSubscription(payment.userId, payment.planId);
      
      // Send confirmation email
      const user = await User.findById(payment.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Successful - Nexxus-Pro',
        template: 'payment-success',
        data: {
          name: user.name,
          amount: payment.amount,
          transactionId: payment.transactionId,
          planId: payment.planId,
        },
      });
      
      // Create notification
      const { createNotification } = require('./notificationController');
      await createNotification(
        payment.userId,
        'Payment Successful',
        `Your payment of KES ${payment.amount} was successful. Your ${payment.planId} plan is now active.`,
        'payment_success'
      );
      
      await createAuditLog({
        userId: payment.userId,
        action: 'MPESA_PAYMENT_SUCCESS',
        details: { amount: payment.amount, transactionId: payment.transactionId },
      });
    } else {
      // Payment failed
      payment.status = 'failed';
      payment.error = stkCallback.ResultDesc;
      await payment.save();
      
      // Send failure notification
      const user = await User.findById(payment.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Failed - Nexxus-Pro',
        template: 'payment-failed',
        data: {
          name: user.name,
          amount: payment.amount,
          reason: stkCallback.ResultDesc,
        },
      });
      
      const { createNotification } = require('./notificationController');
      await createNotification(
        payment.userId,
        'Payment Failed',
        `Your payment of KES ${payment.amount} failed. Please try again.`,
        'payment_failed'
      );
    }
    
    res.json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
  }
};

// @desc    Handle PayPal webhook
// @route   POST /api/webhooks/paypal
// @access  Public
exports.handlePaypalWebhook = async (req, res) => {
  try {
    const event = req.body;
    
    console.log('PayPal webhook received:', event.event_type);
    
    // Verify webhook signature
    const isValid = await verifyPaypalWebhook(req);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }
    
    switch (event.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaypalPaymentCompleted(event);
        break;
      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaypalPaymentDenied(event);
        break;
      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaypalPaymentRefunded(event);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await handlePaypalSubscriptionCancelled(event);
        break;
      default:
        console.log('Unhandled PayPal event:', event.event_type);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('PayPal webhook error:', error);
    res.status(500).json({ success: false });
  }
};

async function handlePaypalPaymentCompleted(event) {
  const orderId = event.resource.supplementary_data.related_ids.order_id;
  const payment = await Payment.findOne({ transactionId: orderId });
  
  if (payment && payment.status !== 'completed') {
    payment.status = 'completed';
    payment.completedAt = Date.now();
    payment.metadata = event.resource;
    await payment.save();
    
    await activateSubscription(payment.userId, payment.planId);
    
    const user = await User.findById(payment.userId);
    await sendEmail({
      to: user.email,
      subject: 'Payment Successful - Nexxus-Pro',
      template: 'payment-success',
      data: {
        name: user.name,
        amount: payment.amount,
        transactionId: payment.transactionId,
        planId: payment.planId,
      },
    });
  }
}

async function handlePaypalPaymentDenied(event) {
  const orderId = event.resource.supplementary_data.related_ids.order_id;
  const payment = await Payment.findOne({ transactionId: orderId });
  
  if (payment) {
    payment.status = 'failed';
    payment.error = 'Payment denied by PayPal';
    await payment.save();
  }
}

async function handlePaypalPaymentRefunded(event) {
  const captureId = event.resource.id;
  const payment = await Payment.findOne({ 'metadata.id': captureId });
  
  if (payment) {
    payment.status = 'refunded';
    payment.refundedAt = Date.now();
    await payment.save();
  }
}

async function handlePaypalSubscriptionCancelled(event) {
  const subscriptionId = event.resource.id;
  const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
  
  if (subscription) {
    subscription.status = 'cancelled';
    subscription.cancelledAt = Date.now();
    await subscription.save();
  }
}

async function verifyPaypalWebhook(req) {
  // Implement PayPal webhook signature verification
  // This should verify the webhook signature using PayPal's API
  return true;
}

// @desc    Handle bank transfer webhook (from bank API)
// @route   POST /api/webhooks/bank
// @access  Public
exports.handleBankWebhook = async (req, res) => {
  try {
    const { reference, status, amount, transactionId } = req.body;
    
    const payment = await Payment.findOne({ transactionId: reference });
    
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    if (status === 'completed') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      payment.metadata = { bankTransactionId: transactionId };
      await payment.save();
      
      await activateSubscription(payment.userId, payment.planId);
      
      const user = await User.findById(payment.userId);
      await sendEmail({
        to: user.email,
        subject: 'Bank Transfer Confirmed - Nexxus-Pro',
        template: 'payment-success',
        data: {
          name: user.name,
          amount: payment.amount,
          transactionId: reference,
          planId: payment.planId,
        },
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Bank webhook error:', error);
    res.status(500).json({ success: false });
  }
};

// Helper function
async function activateSubscription(userId, planId) {
  // Deactivate old subscription
  await Subscription.updateMany(
    { userId, status: 'active' },
    { status: 'expired', endedAt: Date.now() }
  );
  
  const planDetails = {
    basic: { durationDays: 30, features: ['10GB Storage', '50 Merges'], limits: { storage: 10737418240, merges: 50 } },
    pro: { durationDays: 30, features: ['100GB Storage', 'Unlimited Merges'], limits: { storage: 107374182400, merges: -1 } },
    enterprise: { durationDays: 365, features: ['1TB Storage', 'Unlimited Merges'], limits: { storage: 1099511627776, merges: -1 } },
  };
  
  const plan = planDetails[planId] || planDetails.basic;
  
  const subscription = await Subscription.create({
    userId,
    planId,
    status: 'active',
    startDate: Date.now(),
    endDate: new Date(Date.now() + (plan.durationDays * 24 * 60 * 60 * 1000)),
    features: plan.features,
    limits: plan.limits,
  });
  
  await User.findByIdAndUpdate(userId, {
    subscriptionId: subscription._id,
    subscriptionPlan: planId,
  });
  
  return subscription;
}