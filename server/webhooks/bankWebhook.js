const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { logger } = require('../utils/logger');

class BankWebhook {
  constructor() {
    this.webhookSecret = process.env.BANK_WEBHOOK_SECRET || 'your-bank-webhook-secret';
  }

  verifySignature(req) {
    const signature = req.headers['x-webhook-signature'];
    const timestamp = req.headers['x-webhook-timestamp'];
    const body = JSON.stringify(req.body);
    
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature || ''),
      Buffer.from(expectedSignature)
    );
  }

  async handlePaymentConfirmation(req, res) {
    try {
      // Verify signature
      if (!this.verifySignature(req)) {
        logger.error('Invalid bank webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const { reference, transactionId, amount, status, paymentDate, bankReference, notes } = req.body;
      
      logger.info('Bank webhook received:', { reference, transactionId, status });
      
      const payment = await Payment.findOne({ transactionId: reference });
      
      if (!payment) {
        logger.error(`Payment not found for reference: ${reference}`);
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      if (status === 'completed') {
        payment.status = 'completed';
        payment.completedAt = new Date(paymentDate || Date.now());
        payment.transactionId = transactionId;
        payment.metadata = {
          ...payment.metadata,
          bankReference,
          paymentDate,
          notes
        };
        await payment.save();
        
        // Activate subscription
        await this.activateSubscription(payment.userId, payment.planId);
        
        // Send confirmation email
        const user = await User.findById(payment.userId);
        await sendEmail({
          to: user.email,
          subject: 'Payment Confirmed - Nexxus-Pro',
          template: 'payment-success',
          data: {
            name: user.name,
            amount: payment.amount,
            currency: payment.currency,
            planName: payment.planId,
            transactionId: transactionId,
            date: new Date().toLocaleDateString()
          }
        });
        
        await createNotification(
          payment.userId,
          'Payment Confirmed',
          `Your bank transfer of ${payment.currency} ${payment.amount} has been confirmed. Your ${payment.planId} plan is now active.`,
          'payment_success',
          { amount: payment.amount, planId: payment.planId }
        );
        
        logger.info(`Bank payment confirmed for user ${payment.userId}: ${transactionId}`);
      } else if (status === 'failed') {
        payment.status = 'failed';
        payment.error = notes || 'Bank transfer verification failed';
        await payment.save();
        
        const user = await User.findById(payment.userId);
        await sendEmail({
          to: user.email,
          subject: 'Payment Failed - Nexxus-Pro',
          template: 'payment-failed',
          data: {
            name: user.name,
            amount: payment.amount,
            currency: payment.currency,
            reason: notes || 'Bank transfer verification failed',
            retryUrl: `${process.env.CLIENT_URL}/pricing`
          }
        });
        
        logger.warn(`Bank payment failed for user ${payment.userId}: ${notes}`);
      } else if (status === 'refunded') {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
        payment.refundAmount = amount;
        payment.refundReason = notes;
        await payment.save();
        
        // Downgrade subscription
        const subscription = await Subscription.findOne({ userId: payment.userId, status: 'active' });
        if (subscription) {
          subscription.status = 'cancelled';
          await subscription.save();
          await User.findByIdAndUpdate(payment.userId, { subscriptionPlan: 'free' });
        }
        
        logger.info(`Bank payment refunded for user ${payment.userId}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Bank webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async handleAccountStatement(req, res) {
    try {
      const { accountNumber, statement, fromDate, toDate } = req.body;
      
      logger.info('Bank statement webhook received:', { accountNumber, fromDate, toDate });
      
      // Process statement to match pending payments
      const pendingPayments = await Payment.find({
        status: 'pending',
        method: 'bank_transfer'
      });
      
      for (const payment of pendingPayments) {
        // Check if statement contains matching transaction
        const matchingTransaction = statement.find(tx => 
          tx.reference === payment.transactionId || 
          tx.amount === payment.amount
        );
        
        if (matchingTransaction) {
          payment.status = 'completed';
          payment.completedAt = new Date(matchingTransaction.date);
          payment.transactionId = matchingTransaction.transactionId;
          payment.metadata = {
            ...payment.metadata,
            bankReference: matchingTransaction.reference,
            statementDate: matchingTransaction.date
          };
          await payment.save();
          
          await this.activateSubscription(payment.userId, payment.planId);
          
          logger.info(`Matched bank transaction for payment ${payment._id}`);
        }
      }
      
      res.json({ received: true, processed: pendingPayments.length });
    } catch (error) {
      logger.error('Bank statement webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async handleReversal(req, res) {
    try {
      const { transactionId, reference, amount, reason } = req.body;
      
      logger.info('Bank reversal webhook received:', { transactionId, reference, reason });
      
      const payment = await Payment.findOne({ 
        $or: [{ transactionId }, { 'metadata.bankReference': reference }]
      });
      
      if (payment) {
        payment.status = 'refunded';
        payment.refundedAt = Date.now();
        payment.refundAmount = amount;
        payment.refundReason = reason;
        await payment.save();
        
        // Downgrade subscription
        const subscription = await Subscription.findOne({ userId: payment.userId, status: 'active' });
        if (subscription) {
          subscription.status = 'cancelled';
          await subscription.save();
          await User.findByIdAndUpdate(payment.userId, { subscriptionPlan: 'free' });
        }
        
        const user = await User.findById(payment.userId);
        await sendEmail({
          to: user.email,
          subject: 'Payment Reversed - Nexxus-Pro',
          template: 'payment-reversed',
          data: {
            name: user.name,
            amount: payment.amount,
            currency: payment.currency,
            reason: reason
          }
        });
        
        logger.info(`Bank payment reversed for user ${payment.userId}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('Bank reversal webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async activateSubscription(userId, planId) {
    // Deactivate old subscription
    await Subscription.updateMany(
      { userId, status: 'active' },
      { status: 'expired', endedAt: Date.now() }
    );
    
    const planDetails = this.getPlanDetails(planId);
    const durationDays = planId === 'enterprise' ? 365 : 30;
    
    const subscription = await Subscription.create({
      userId,
      planId,
      status: 'active',
      startDate: Date.now(),
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
      features: planDetails.features,
      limits: planDetails.limits,
      billingCycle: 'month',
      autoRenew: true
    });
    
    await User.findByIdAndUpdate(userId, {
      subscriptionId: subscription._id,
      subscriptionPlan: planId
    });
    
    return subscription;
  }

  getPlanDetails(planId) {
    const plans = {
      basic: {
        features: ['10GB Storage', '50 Merges/month', 'Priority Support'],
        limits: { storage: 10737418240, merges: 50 }
      },
      pro: {
        features: ['100GB Storage', 'Unlimited Merges', '24/7 Support', 'API Access'],
        limits: { storage: 107374182400, merges: -1 }
      },
      enterprise: {
        features: ['1TB Storage', 'Unlimited Merges', 'Dedicated Support', 'SSO Integration'],
        limits: { storage: 1099511627776, merges: -1 }
      }
    };
    return plans[planId] || plans.basic;
  }
}

module.exports = new BankWebhook();