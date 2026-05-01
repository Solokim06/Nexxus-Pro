const crypto = require('crypto');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const { sendEmail } = require('./emailService');

class WebhookService {
  constructor() {
    this.webhookSecret = process.env.WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex');
  }

  verifySignature(payload, signature, secret = this.webhookSecret) {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  async processWebhook(provider, payload, signature = null) {
    // Verify signature if provided
    if (signature && !this.verifySignature(payload, signature)) {
      throw new Error('Invalid webhook signature');
    }

    switch (provider) {
      case 'mpesa':
        return await this.processMpesaWebhook(payload);
      case 'paypal':
        return await this.processPaypalWebhook(payload);
      case 'stripe':
        return await this.processStripeWebhook(payload);
      default:
        throw new Error(`Unknown webhook provider: ${provider}`);
    }
  }

  async processMpesaWebhook(payload) {
    const { Body } = payload;
    const { stkCallback } = Body;

    const result = {
      resultCode: stkCallback.ResultCode,
      resultDesc: stkCallback.ResultDesc,
      merchantRequestId: stkCallback.MerchantRequestID,
      checkoutRequestId: stkCallback.CheckoutRequestID,
    };

    if (stkCallback.ResultCode === 0 && stkCallback.CallbackMetadata) {
      const metadata = {};
      stkCallback.CallbackMetadata.Item.forEach(item => {
        metadata[item.Name] = item.Value;
      });

      result.metadata = metadata;
      result.transactionId = metadata.MpesaReceiptNumber;
      result.amount = metadata.Amount;
      result.phoneNumber = metadata.PhoneNumber;

      // Update payment record
      const payment = await Payment.findOne({ transactionId: stkCallback.CheckoutRequestID });
      if (payment) {
        payment.status = 'completed';
        payment.completedAt = Date.now();
        payment.transactionId = metadata.MpesaReceiptNumber;
        payment.metadata = metadata;
        await payment.save();

        // Activate subscription
        const subscriptionService = require('./subscriptionService');
        await subscriptionService.createSubscription(
          payment.userId,
          payment.planId,
          'mpesa',
          { transactionId: metadata.MpesaReceiptNumber }
        );
      }
    } else if (stkCallback.ResultCode !== 0) {
      // Payment failed
      const payment = await Payment.findOne({ transactionId: stkCallback.CheckoutRequestID });
      if (payment) {
        payment.status = 'failed';
        payment.error = stkCallback.ResultDesc;
        await payment.save();
      }
    }

    return result;
  }

  async processPaypalWebhook(payload) {
    const eventType = payload.event_type;
    const result = { eventType, processed: true };

    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        const orderId = payload.resource.supplementary_data.related_ids.order_id;
        const payment = await Payment.findOne({ transactionId: orderId });
        
        if (payment) {
          payment.status = 'completed';
          payment.completedAt = Date.now();
          payment.transactionId = payload.resource.id;
          payment.metadata = payload.resource;
          await payment.save();

          const subscriptionService = require('./subscriptionService');
          await subscriptionService.createSubscription(
            payment.userId,
            payment.planId,
            'paypal',
            { transactionId: payload.resource.id }
          );
        }
        break;

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        const deniedOrderId = payload.resource.supplementary_data.related_ids.order_id;
        const deniedPayment = await Payment.findOne({ transactionId: deniedOrderId });
        
        if (deniedPayment) {
          deniedPayment.status = 'failed';
          deniedPayment.error = eventType;
          await deniedPayment.save();
        }
        break;

      case 'PAYMENT.CAPTURE.REFUNDED':
        const refundedCaptureId = payload.resource.id;
        const refundedPayment = await Payment.findOne({ 'metadata.id': refundedCaptureId });
        
        if (refundedPayment) {
          refundedPayment.status = 'refunded';
          refundedPayment.refundedAt = Date.now();
          await refundedPayment.save();
        }
        break;

      case 'BILLING.SUBSCRIPTION.CANCELLED':
        const subscriptionId = payload.resource.id;
        const subscription = await Subscription.findOne({ providerSubscriptionId: subscriptionId });
        
        if (subscription) {
          subscription.status = 'cancelled';
          subscription.cancelledAt = Date.now();
          await subscription.save();
        }
        break;

      case 'BILLING.SUBSCRIPTION.ACTIVATED':
        const activatedSubscriptionId = payload.resource.id;
        const activatedSubscription = await Subscription.findOne({ providerSubscriptionId: activatedSubscriptionId });
        
        if (activatedSubscription) {
          activatedSubscription.status = 'active';
          await activatedSubscription.save();
        }
        break;
    }

    return result;
  }

  async processStripeWebhook(payload) {
    const eventType = payload.type;
    const result = { eventType, processed: true };

    switch (eventType) {
      case 'checkout.session.completed':
        const session = payload.data.object;
        const payment = await Payment.findOne({ transactionId: session.id });
        
        if (payment) {
          payment.status = 'completed';
          payment.completedAt = Date.now();
          payment.transactionId = session.payment_intent;
          await payment.save();

          const subscriptionService = require('./subscriptionService');
          await subscriptionService.createSubscription(
            payment.userId,
            payment.planId,
            'stripe',
            { paymentIntent: session.payment_intent }
          );
        }
        break;

      case 'customer.subscription.deleted':
        const stripeSubscriptionId = payload.data.object.id;
        const stripeSubscription = await Subscription.findOne({ providerSubscriptionId: stripeSubscriptionId });
        
        if (stripeSubscription) {
          stripeSubscription.status = 'cancelled';
          stripeSubscription.cancelledAt = Date.now();
          await stripeSubscription.save();
        }
        break;

      case 'invoice.payment_failed':
        const invoice = payload.data.object;
        const failedSubscription = await Subscription.findOne({ providerSubscriptionId: invoice.subscription });
        
        if (failedSubscription) {
          failedSubscription.status = 'past_due';
          await failedSubscription.save();

          const user = await User.findById(failedSubscription.userId);
          await sendEmail({
            to: user.email,
            subject: 'Payment Failed - Nexxus-Pro',
            template: 'payment-failed',
            data: {
              name: user.name,
              planId: failedSubscription.planId,
            },
          });
        }
        break;
    }

    return result;
  }

  async sendWebhook(endpointUrl, payload, secret = null) {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Nexxus-Pro-Webhook/1.0',
    };

    if (secret) {
      const signature = crypto
        .createHmac('sha256', secret)
        .update(JSON.stringify(payload))
        .digest('hex');
      headers['X-Webhook-Signature'] = signature;
    }

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.statusText}`);
    }

    return await response.json();
  }

  async registerWebhookEndpoint(url, events, provider) {
    // Store webhook configuration in database
    const WebhookConfig = require('../models/WebhookConfig');
    
    const config = await WebhookConfig.findOneAndUpdate(
      { url, provider },
      { url, events, provider, isActive: true, createdAt: Date.now() },
      { upsert: true, new: true }
    );

    return config;
  }

  async getWebhookDeliveries(endpointId, limit = 50) {
    const WebhookDelivery = require('../models/WebhookDelivery');
    return await WebhookDelivery.find({ endpointId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async retryDelivery(deliveryId) {
    const WebhookDelivery = require('../models/WebhookDelivery');
    const delivery = await WebhookDelivery.findById(deliveryId);
    
    if (!delivery) {
      throw new Error('Delivery not found');
    }

    const result = await this.sendWebhook(delivery.url, delivery.payload, delivery.secret);
    
    delivery.retryCount += 1;
    delivery.lastAttemptAt = Date.now();
    delivery.status = result.success ? 'delivered' : 'failed';
    await delivery.save();

    return result;
  }
}

module.exports = new WebhookService();