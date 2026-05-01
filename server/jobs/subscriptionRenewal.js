const cron = require('node-cron');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { sendEmail } = require('../services/emailService');
const { logger } = require('../utils/logger');

class SubscriptionRenewalJob {
  constructor() {
    this.isRunning = false;
  }

  start() {
    // Run daily at 9 AM
    cron.schedule('0 9 * * *', async () => {
      await this.processRenewals();
    });
    
    // Check expiring subscriptions daily at 10 AM
    cron.schedule('0 10 * * *', async () => {
      await this.checkExpiringSubscriptions();
    });
    
    // Process failed renewals every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.processFailedRenewals();
    });
    
    logger.info('Subscription renewal jobs scheduled');
  }

  async processRenewals() {
    if (this.isRunning) {
      logger.warn('Renewal job already running, skipping...');
      return;
    }

    this.isRunning = true;
    logger.info('Starting subscription renewals...');

    try {
      const today = new Date();
      const subscriptions = await Subscription.find({
        status: 'active',
        autoRenew: true,
        endDate: { $lte: new Date(today.setDate(today.getDate() + 1)) }
      }).populate('userId');

      let renewed = 0;
      let failed = 0;

      for (const subscription of subscriptions) {
        try {
          const result = await this.renewSubscription(subscription);
          if (result.success) {
            renewed++;
          } else {
            failed++;
          }
        } catch (error) {
          logger.error(`Renewal failed for subscription ${subscription._id}:`, error);
          failed++;
        }
      }

      logger.info(`Subscription renewals completed: ${renewed} renewed, ${failed} failed`);
    } catch (error) {
      logger.error('Subscription renewals failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async renewSubscription(subscription) {
    const plan = this.getPlanDetails(subscription.planId);
    const amount = subscription.billingCycle === 'year' ? plan.annualPrice : plan.price;
    
    // Create payment record
    const payment = await Payment.create({
      userId: subscription.userId._id,
      method: 'auto_renew',
      amount,
      currency: 'USD',
      planId: subscription.planId,
      status: 'pending',
      metadata: { subscriptionId: subscription._id, autoRenew: true }
    });

    // Process payment (would integrate with payment gateway)
    const paymentSuccess = await this.processAutoPayment(subscription.userId, amount);
    
    if (paymentSuccess) {
      // Update subscription
      const duration = subscription.billingCycle === 'year' ? 365 : 30;
      subscription.startDate = Date.now();
      subscription.endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      subscription.status = 'active';
      await subscription.save();
      
      payment.status = 'completed';
      payment.completedAt = Date.now();
      await payment.save();
      
      // Send renewal confirmation
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Renewed - Nexxus-Pro',
        template: 'subscription-renewed',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId,
          amount,
          nextBillingDate: subscription.endDate
        }
      });
      
      return { success: true };
    } else {
      payment.status = 'failed';
      payment.error = 'Auto-renewal payment failed';
      await payment.save();
      
      subscription.status = 'past_due';
      await subscription.save();
      
      // Send payment failure notification
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Payment Failed - Nexxus-Pro',
        template: 'payment-failed',
        data: {
          name: subscription.userId.name,
          amount,
          planId: subscription.planId,
          retryUrl: `${process.env.CLIENT_URL}/billing`
        }
      });
      
      return { success: false };
    }
  }

  async processAutoPayment(user, amount) {
    // In production, integrate with payment gateway
    // For now, simulate success
    return true;
  }

  async checkExpiringSubscriptions() {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    
    // Subscriptions expiring in 7 days
    const expiringIn7Days = await Subscription.find({
      status: 'active',
      autoRenew: true,
      endDate: { $lte: sevenDaysFromNow, $gt: threeDaysFromNow }
    }).populate('userId');
    
    for (const subscription of expiringIn7Days) {
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Expiring Soon - Nexxus-Pro',
        template: 'subscription-expiring',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId,
          expiryDate: subscription.endDate,
          daysLeft: 7
        }
      });
    }
    
    // Subscriptions expiring in 3 days
    const expiringIn3Days = await Subscription.find({
      status: 'active',
      autoRenew: true,
      endDate: { $lte: threeDaysFromNow, $gt: Date.now() }
    }).populate('userId');
    
    for (const subscription of expiringIn3Days) {
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Expiring Soon - Nexxus-Pro',
        template: 'subscription-expiring',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId,
          expiryDate: subscription.endDate,
          daysLeft: 3
        }
      });
    }
    
    logger.info(`Expiring subscriptions: ${expiringIn7Days.length} in 7 days, ${expiringIn3Days.length} in 3 days`);
  }

  async processFailedRenewals() {
    const pastDueSubscriptions = await Subscription.find({
      status: 'past_due',
      endDate: { $gt: Date.now() }
    }).populate('userId');
    
    for (const subscription of pastDueSubscriptions) {
      // Attempt to retry payment
      const plan = this.getPlanDetails(subscription.planId);
      const amount = subscription.billingCycle === 'year' ? plan.annualPrice : plan.price;
      
      const paymentSuccess = await this.processAutoPayment(subscription.userId, amount);
      
      if (paymentSuccess) {
        subscription.status = 'active';
        await subscription.save();
        
        await sendEmail({
          to: subscription.userId.email,
          subject: 'Payment Recovered - Nexxus-Pro',
          template: 'payment-recovered',
          data: {
            name: subscription.userId.name,
            planId: subscription.planId
          }
        });
      }
    }
    
    // Handle expired subscriptions
    const expiredSubscriptions = await Subscription.find({
      status: { $in: ['past_due', 'active'] },
      endDate: { $lt: Date.now() }
    }).populate('userId');
    
    for (const subscription of expiredSubscriptions) {
      subscription.status = 'expired';
      await subscription.save();
      
      // Downgrade user to free plan
      await User.findByIdAndUpdate(subscription.userId._id, {
        subscriptionPlan: 'free'
      });
      
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Expired - Nexxus-Pro',
        template: 'subscription-expired',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId
        }
      });
    }
    
    logger.info(`Processed ${pastDueSubscriptions.length} past-due, ${expiredSubscriptions.length} expired subscriptions`);
  }

  getPlanDetails(planId) {
    const plans = {
      basic: { price: 9.99, annualPrice: 99.99 },
      pro: { price: 29.99, annualPrice: 299.99 },
      enterprise: { price: 99.99, annualPrice: 999.99 }
    };
    return plans[planId] || plans.basic;
  }
}

module.exports = new SubscriptionRenewalJob();