const crypto = require('crypto');
const axios = require('axios');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { logger } = require('../utils/logger');

class PayPalWebhook {
  constructor() {
    this.webhookId = process.env.PAYPAL_WEBHOOK_ID;
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    this.apiUrl = this.environment === 'production' 
      ? 'https://api.paypal.com' 
      : 'https://api.sandbox.paypal.com';
  }

  async verifyWebhookSignature(req) {
    try {
      const transmissionId = req.headers['paypal-transmission-id'];
      const transmissionTime = req.headers['paypal-transmission-time'];
      const webhookId = this.webhookId;
      const certUrl = req.headers['paypal-cert-url'];
      const actualSig = req.headers['paypal-transmission-sig'];
      const authAlgo = req.headers['paypal-auth-algo'];
      
      const body = JSON.stringify(req.body);
      
      const accessToken = await this.getAccessToken();
      
      const response = await axios.post(
        `${this.apiUrl}/v1/notifications/verify-webhook-signature`,
        {
          transmission_id: transmissionId,
          transmission_time: transmissionTime,
          webhook_id: webhookId,
          webhook_event: req.body,
          cert_url: certUrl,
          actual_signature: actualSig,
          auth_algo: authAlgo
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.verification_status === 'SUCCESS';
    } catch (error) {
      logger.error('PayPal webhook verification error:', error);
      return false;
    }
  }

  async getAccessToken() {
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    
    const response = await axios.post(
      `${this.apiUrl}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    return response.data.access_token;
  }

  async handleWebhook(req, res) {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(req);
      
      if (!isValid) {
        logger.error('Invalid PayPal webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      
      const event = req.body;
      const eventType = event.event_type;
      
      logger.info('PayPal webhook received:', { eventType, eventId: event.id });
      
      switch (eventType) {
        case 'PAYMENT.CAPTURE.COMPLETED':
          await this.handlePaymentCaptureCompleted(event);
          break;
        case 'PAYMENT.CAPTURE.DENIED':
          await this.handlePaymentCaptureDenied(event);
          break;
        case 'PAYMENT.CAPTURE.REFUNDED':
          await this.handlePaymentCaptureRefunded(event);
          break;
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
          await this.handleSubscriptionPaymentFailed(event);
          break;
        case 'BILLING.SUBSCRIPTION.RENEWED':
          await this.handleSubscriptionRenewed(event);
          break;
        case 'CHECKOUT.ORDER.APPROVED':
          await this.handleOrderApproved(event);
          break;
        default:
          logger.info(`Unhandled PayPal event type: ${eventType}`);
      }
      
      res.json({ received: true });
    } catch (error) {
      logger.error('PayPal webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }

  async handlePaymentCaptureCompleted(event) {
    const { resource } = event;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    
    const payment = await Payment.findOne({ transactionId: orderId });
    
    if (payment && payment.status !== 'completed') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      payment.transactionId = resource.id;
      payment.metadata = {
        captureId: resource.id,
        amount: resource.amount.value,
        currency: resource.amount.currency_code,
        payerEmail: resource.payer_email,
        payerId: resource.payer_id
      };
      await payment.save();
      
      // Activate subscription
      await this.activateSubscription(payment.userId, payment.planId);
      
      // Send confirmation email
      const user = await User.findById(payment.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Successful - Nexxus-Pro',
        template: 'payment-success',
        data: {
          name: user.name,
          amount: payment.amount,
          currency: 'USD',
          planName: payment.planId,
          transactionId: resource.id,
          date: new Date().toLocaleDateString()
        }
      });
      
      await createNotification(
        payment.userId,
        'Payment Successful',
        `Your payment of $${payment.amount} was successful. Your ${payment.planId} plan is now active.`,
        'payment_success',
        { amount: payment.amount, planId: payment.planId }
      );
      
      logger.info(`PayPal payment completed for user ${payment.userId}: ${resource.id}`);
    }
  }

  async handlePaymentCaptureDenied(event) {
    const { resource } = event;
    const orderId = resource.supplementary_data?.related_ids?.order_id;
    
    const payment = await Payment.findOne({ transactionId: orderId });
    
    if (payment) {
      payment.status = 'failed';
      payment.error = 'Payment denied by PayPal';
      await payment.save();
      
      const user = await User.findById(payment.userId);
      await sendEmail({
        to: user.email,
        subject: 'Payment Failed - Nexxus-Pro',
        template: 'payment-failed',
        data: {
          name: user.name,
          amount: payment.amount,
          currency: 'USD',
          reason: 'Payment denied by PayPal',
          retryUrl: `${process.env.CLIENT_URL}/pricing`
        }
      });
      
      logger.warn(`PayPal payment denied for user ${payment.userId}`);
    }
  }

  async handlePaymentCaptureRefunded(event) {
    const { resource } = event;
    const captureId = resource.id;
    
    const payment = await Payment.findOne({ 'metadata.captureId': captureId });
    
    if (payment) {
      payment.status = 'refunded';
      payment.refundedAt = Date.now();
      payment.refundAmount = resource.amount.value;
      await payment.save();
      
      // Downgrade subscription
      const subscription = await Subscription.findOne({ userId: payment.userId, status: 'active' });
      if (subscription) {
        subscription.status = 'cancelled';
        await subscription.save();
        await User.findByIdAndUpdate(payment.userId, { subscriptionPlan: 'free' });
      }
      
      logger.info(`PayPal payment refunded for user ${payment.userId}: ${captureId}`);
    }
  }

  async handleSubscriptionActivated(event) {
    const { resource } = event;
    const subscriptionId = resource.id;
    
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
    
    if (subscription) {
      subscription.status = 'active';
      subscription.startDate = new Date(resource.start_time);
      subscription.endDate = new Date(resource.billing_info?.next_billing_time);
      await subscription.save();
      
      await User.findByIdAndUpdate(subscription.userId, {
        subscriptionPlan: subscription.planId
      });
      
      logger.info(`PayPal subscription activated for user ${subscription.userId}`);
    }
  }

  async handleSubscriptionCancelled(event) {
    const { resource } = event;
    const subscriptionId = resource.id;
    
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
    
    if (subscription) {
      subscription.status = 'cancelled';
      subscription.cancelledAt = new Date();
      await subscription.save();
      
      const user = await User.findById(subscription.userId);
      await sendEmail({
        to: user.email,
        subject: 'Subscription Cancelled - Nexxus-Pro',
        template: 'subscription-cancelled',
        data: {
          name: user.name,
          planId: subscription.planId,
          expiryDate: subscription.endDate
        }
      });
      
      logger.info(`PayPal subscription cancelled for user ${subscription.userId}`);
    }
  }

  async handleSubscriptionSuspended(event) {
    const { resource } = event;
    const subscriptionId = resource.id;
    
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
          planId: subscription.planId
        }
      });
      
      logger.warn(`PayPal subscription suspended for user ${subscription.userId}`);
    }
  }

  async handleSubscriptionExpired(event) {
    const { resource } = event;
    const subscriptionId = resource.id;
    
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
    
    if (subscription) {
      subscription.status = 'expired';
      await subscription.save();
      
      await User.findByIdAndUpdate(subscription.userId, { subscriptionPlan: 'free' });
      
      logger.info(`PayPal subscription expired for user ${subscription.userId}`);
    }
  }

  async handleSubscriptionPaymentFailed(event) {
    const { resource } = event;
    const subscriptionId = resource.subscription_id;
    
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
          amount: resource.amount?.value || 'unknown',
          currency: 'USD',
          reason: resource.status_details?.reason || 'Payment failed',
          retryUrl: `${process.env.CLIENT_URL}/billing`
        }
      });
      
      logger.warn(`PayPal subscription payment failed for user ${subscription.userId}`);
    }
  }

  async handleSubscriptionRenewed(event) {
    const { resource } = event;
    const subscriptionId = resource.id;
    
    const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
    
    if (subscription) {
      subscription.endDate = new Date(resource.billing_info?.next_billing_time);
      await subscription.save();
      
      logger.info(`PayPal subscription renewed for user ${subscription.userId}`);
    }
  }

  async handleOrderApproved(event) {
    const { resource } = event;
    const orderId = resource.id;
    
    const payment = await Payment.findOne({ transactionId: orderId });
    
    if (payment && payment.status === 'pending') {
      payment.status = 'processing';
      await payment.save();
      logger.info(`PayPal order approved: ${orderId}`);
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

module.exports = new PayPalWebhook();