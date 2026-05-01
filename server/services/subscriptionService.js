const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const { sendEmail } = require('./emailService');

class SubscriptionService {
  constructor() {
    this.plans = {
      free: {
        name: 'Free',
        price: 0,
        durationDays: 30,
        features: ['1 GB Storage', '5 Merges/month', 'Basic Support', '50 MB File Limit'],
        limits: { storage: 1073741824, merges: 5, fileSize: 52428800 },
      },
      basic: {
        name: 'Basic',
        price: 9.99,
        durationDays: 30,
        features: ['10 GB Storage', '50 Merges/month', 'Priority Support', '100 MB File Limit', 'File Sharing'],
        limits: { storage: 10737418240, merges: 50, fileSize: 104857600 },
      },
      pro: {
        name: 'Professional',
        price: 29.99,
        durationDays: 30,
        features: ['100 GB Storage', 'Unlimited Merges', '24/7 Support', '500 MB File Limit', 'API Access'],
        limits: { storage: 107374182400, merges: -1, fileSize: 524288000 },
      },
      enterprise: {
        name: 'Enterprise',
        price: 99.99,
        durationDays: 365,
        features: ['1 TB Storage', 'Unlimited Merges', 'Dedicated Support', '2 GB File Limit', 'SSO Integration'],
        limits: { storage: 1099511627776, merges: -1, fileSize: 2147483648 },
      },
    };
  }

  getPlan(planId) {
    return this.plans[planId] || null;
  }

  getAllPlans() {
    return Object.entries(this.plans).map(([id, plan]) => ({
      id,
      ...plan,
    }));
  }

  async createSubscription(userId, planId, paymentMethod, paymentDetails) {
    const plan = this.getPlan(planId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    // Deactivate existing subscriptions
    await Subscription.updateMany(
      { userId, status: 'active' },
      { status: 'expired', endedAt: Date.now() }
    );

    // Create new subscription
    const subscription = await Subscription.create({
      userId,
      planId,
      status: 'active',
      startDate: Date.now(),
      endDate: new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000),
      features: plan.features,
      limits: plan.limits,
      billingCycle: 'month',
      autoRenew: true,
    });

    // Update user
    await User.findByIdAndUpdate(userId, {
      subscriptionId: subscription._id,
      subscriptionPlan: planId,
    });

    // Create payment record if amount > 0
    if (plan.price > 0) {
      await Payment.create({
        userId,
        method: paymentMethod,
        amount: plan.price,
        currency: 'USD',
        planId,
        status: 'completed',
        completedAt: Date.now(),
        paymentDetails,
      });
    }

    // Send confirmation email
    const user = await User.findById(userId);
    await sendEmail({
      to: user.email,
      subject: 'Subscription Activated - Nexxus-Pro',
      template: 'subscription-activated',
      data: {
        name: user.name,
        planName: plan.name,
        amount: plan.price,
        nextBillingDate: subscription.endDate,
        features: plan.features,
      },
    });

    return subscription;
  }

  async cancelSubscription(subscriptionId, reason) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = Date.now();
    subscription.cancelReason = reason;
    subscription.autoRenew = false;
    await subscription.save();

    const user = await User.findById(subscription.userId);
    await sendEmail({
      to: user.email,
      subject: 'Subscription Cancelled - Nexxus-Pro',
      template: 'subscription-cancelled',
      data: {
        name: user.name,
        planId: subscription.planId,
        expiryDate: subscription.endDate,
      },
    });

    return subscription;
  }

  async changePlan(subscriptionId, newPlanId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const newPlan = this.getPlan(newPlanId);
    if (!newPlan) {
      throw new Error('Invalid plan');
    }

    const oldPlan = this.getPlan(subscription.planId);

    // Calculate prorated amount if downgrading
    let proratedAmount = 0;
    let isProrated = false;

    if (newPlan.price < oldPlan.price) {
      const daysLeft = Math.ceil((subscription.endDate - Date.now()) / (1000 * 60 * 60 * 24));
      const daysInMonth = 30;
      const unusedValue = (oldPlan.price / daysInMonth) * daysLeft;
      const newValue = (newPlan.price / daysInMonth) * daysLeft;
      proratedAmount = Math.max(0, unusedValue - newValue);
      isProrated = true;
    }

    subscription.planId = newPlanId;
    subscription.features = newPlan.features;
    subscription.limits = newPlan.limits;
    await subscription.save();

    await User.findByIdAndUpdate(subscription.userId, {
      subscriptionPlan: newPlanId,
    });

    const user = await User.findById(subscription.userId);
    await sendEmail({
      to: user.email,
      subject: 'Plan Changed - Nexxus-Pro',
      template: 'plan-changed',
      data: {
        name: user.name,
        oldPlan: oldPlan.name,
        newPlan: newPlan.name,
      },
    });

    return {
      subscription,
      prorated: isProrated,
      refundAmount: proratedAmount,
    };
  }

  async renewSubscription(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = this.getPlan(subscription.planId);
    const durationDays = subscription.billingCycle === 'year' ? 365 : 30;

    subscription.startDate = Date.now();
    subscription.endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    subscription.status = 'active';
    await subscription.save();

    const user = await User.findById(subscription.userId);
    await sendEmail({
      to: user.email,
      subject: 'Subscription Renewed - Nexxus-Pro',
      template: 'subscription-renewed',
      data: {
        name: user.name,
        planId: subscription.planId,
        nextBillingDate: subscription.endDate,
      },
    });

    return subscription;
  }

  async checkExpiringSubscriptions() {
    const expiringSoon = await Subscription.find({
      status: 'active',
      endDate: {
        $gte: Date.now(),
        $lte: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      autoRenew: true,
    }).populate('userId');

    for (const subscription of expiringSoon) {
      await sendEmail({
        to: subscription.userId.email,
        subject: 'Subscription Renewal Reminder - Nexxus-Pro',
        template: 'subscription-renewal',
        data: {
          name: subscription.userId.name,
          planId: subscription.planId,
          expiryDate: subscription.endDate,
        },
      });
    }

    return expiringSoon.length;
  }

  async checkExpiredSubscriptions() {
    const expired = await Subscription.find({
      status: 'active',
      endDate: { $lt: Date.now() },
    });

    for (const subscription of expired) {
      subscription.status = 'expired';
      await subscription.save();

      // Downgrade user to free plan
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionPlan: 'free',
      });

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Expired - Nexxus-Pro',
        template: 'subscription-expired',
        data: {
          name: user.name,
          planId: subscription.planId,
        },
      });
    }

    return expired.length;
  }

  async getUsage(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const File = require('../models/File');
    const MergeJob = require('../models/MergeJob');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const storageUsed = await File.aggregate([
      { $match: { userId: subscription.userId, isDeleted: false } },
      { $group: { _id: null, total: { $sum: '$size' } } },
    ]);

    const mergesUsed = await MergeJob.countDocuments({
      userId: subscription.userId,
      createdAt: { $gte: startOfMonth },
      status: 'completed',
    });

    return {
      storageUsed: storageUsed[0]?.total || 0,
      storageLimit: subscription.limits.storage,
      mergesUsed,
      mergesLimit: subscription.limits.merges,
      storagePercentage: ((storageUsed[0]?.total || 0) / subscription.limits.storage) * 100,
      mergesPercentage: subscription.limits.merges === -1 ? 0 : (mergesUsed / subscription.limits.merges) * 100,
    };
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleWebhook(event) {
    switch (event.event_type) {
      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        await this.handleSubscriptionActivated(event);
        break;
      case 'BILLING.SUBSCRIPTION.CANCELLED':
        await this.handleSubscriptionCancelled(event);
        break;
      case 'BILLING.SUBSCRIPTION.SUSPENDED':
        await this.handleSubscriptionSuspended(event);
        break;
      case 'BILLING.SUBSCRIPTION.EXPIRED':
        await this.handleSubscriptionExpired(event);
        break;
      case 'BILLING.SUBSCRIPTION.PAYMENT.FAILED':
        await this.handlePaymentFailed(event);
        break;
      case 'PAYMENT.CAPTURE.COMPLETED':
        await this.handlePaymentCompleted(event);
        break;
      case 'BILLING.SUBSCRIPTION.UPDATED':
        await this.handleSubscriptionUpdated(event);
        break;
      case 'BILLING.SUBSCRIPTION.REACTIVATED':
        await this.handleSubscriptionReactivated(event);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.event_type}`);
    }
  }

  async handleSubscriptionActivated(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'active';
      subscription.startDate = Date.now();
      await subscription.save();

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionPlan: subscription.planId,
      });

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Activated - Nexxus-Pro',
        template: 'subscription-activated',
        data: {
          name: user.name,
          planId: subscription.planId,
          nextBillingDate: subscription.endDate,
        },
      });
    }
  }

  async handleSubscriptionCancelled(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = Date.now();
      await subscription.save();

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Cancelled - Nexxus-Pro',
        template: 'subscription-cancelled',
        data: {
          name: user.name,
          planId: subscription.planId,
          expiryDate: subscription.endDate,
        },
      });
    }
  }

  async handleSubscriptionSuspended(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'past_due';
      await subscription.save();

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Suspended - Nexxus-Pro',
        template: 'subscription-suspended',
        data: {
          name: user.name,
          planId: subscription.planId,
        },
      });
    }
  }

  async handleSubscriptionExpired(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'expired';
      await subscription.save();

      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionPlan: 'free',
      });

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Expired - Nexxus-Pro',
        template: 'subscription-expired',
        data: {
          name: user.name,
          planId: subscription.planId,
        },
      });
    }
  }

  async handleSubscriptionUpdated(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      const planId = event.resource.plan_id;
      const newPlan = this.getPlan(planId);

      if (newPlan) {
        subscription.planId = planId;
        subscription.features = newPlan.features;
        subscription.limits = newPlan.limits;
        await subscription.save();

        await User.findByIdAndUpdate(subscription.userId, {
          subscriptionPlan: planId,
        });
      }
    }
  }

  async handleSubscriptionReactivated(event) {
    const subscriptionId = event.resource.id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'active';
      subscription.cancelledAt = null;
      await subscription.save();
    }
  }

  async handlePaymentFailed(event) {
    const subscriptionId = event.resource.billing_agreement_id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription) {
      subscription.status = 'past_due';
      await subscription.save();

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Failed - Nexxus-Pro',
        template: 'payment-failed',
        data: {
          name: user.name,
          planId: subscription.planId,
          amount: event.resource.amount?.value || 'unknown',
          retryUrl: `${process.env.CLIENT_URL}/billing`,
        },
      });
    }
  }

  async handlePaymentCompleted(event) {
    const subscriptionId = event.resource.billing_agreement_id;
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });

    if (subscription && subscription.status === 'past_due') {
      subscription.status = 'active';
      await subscription.save();

      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Recovered - Nexxus-Pro',
        template: 'payment-recovered',
        data: {
          name: user.name,
          planId: subscription.planId,
        },
      });
    }
  }

  // ==================== ADDITIONAL UTILITY METHODS ====================

  async getSubscriptionByUserId(userId) {
    const subscription = await Subscription.findOne({
      userId,
      status: 'active',
    });
    return subscription;
  }

  async getSubscriptionStats() {
    const stats = await Subscription.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const byPlan = await Subscription.aggregate([
      {
        $group: {
          _id: '$planId',
          count: { $sum: 1 },
        },
      },
    ]);

    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    return {
      byStatus: stats,
      byPlan,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }

  async processAutoRenewals() {
    const today = new Date();
    const subscriptions = await Subscription.find({
      status: 'active',
      autoRenew: true,
      endDate: { $lte: new Date(today.setDate(today.getDate() + 1)) },
    });

    for (const subscription of subscriptions) {
      try {
        await this.renewSubscription(subscription._id);
        
        // Process payment for renewal
        const plan = this.getPlan(subscription.planId);
        await Payment.create({
          userId: subscription.userId,
          method: 'auto_renew',
          amount: plan.price,
          currency: 'USD',
          planId: subscription.planId,
          status: 'pending',
          metadata: { autoRenew: true, subscriptionId: subscription._id },
        });
      } catch (error) {
        console.error(`Auto-renewal failed for subscription ${subscription._id}:`, error);
      }
    }

    return subscriptions.length;
  }

  async upgradeToYearly(subscriptionId) {
    const subscription = await Subscription.findById(subscriptionId);
    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const plan = this.getPlan(subscription.planId);
    const yearlyPrice = plan.price * 10; // 10 months for price of 12 (20% savings)
    const discount = (plan.price * 12) - yearlyPrice;

    subscription.billingCycle = 'year';
    subscription.endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    await subscription.save();

    return {
      subscription,
      yearlyPrice,
      discount,
      savings: `${Math.round((discount / (plan.price * 12)) * 100)}%`,
    };
  }
}

module.exports = new SubscriptionService();