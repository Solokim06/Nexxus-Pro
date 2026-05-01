const crypto = require('crypto');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { sendEmail } = require('../services/emailService');
const { createNotification } = require('../services/notificationService');
const { logger } = require('../utils/logger');

class MpesaWebhook {
  constructor() {
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
  }

  async handleSTKPush(req, res) {
    try {
      const { Body } = req.body;
      const { stkCallback } = Body;
      
      logger.info('M-Pesa STK Push callback received:', {
        resultCode: stkCallback.ResultCode,
        checkoutRequestId: stkCallback.CheckoutRequestID,
        merchantRequestId: stkCallback.MerchantRequestID
      });

      const payment = await Payment.findOne({ 
        transactionId: stkCallback.CheckoutRequestID 
      });

      if (!payment) {
        logger.error(`Payment not found for transaction: ${stkCallback.CheckoutRequestID}`);
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
        payment.transactionId = metadata.MpesaReceiptNumber;
        payment.metadata = {
          ...payment.metadata,
          mpesaReceiptNumber: metadata.MpesaReceiptNumber,
          transactionDate: metadata.TransactionDate,
          phoneNumber: metadata.PhoneNumber,
          amount: metadata.Amount
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
            currency: 'KES',
            planName: payment.planId,
            transactionId: metadata.MpesaReceiptNumber,
            date: new Date().toLocaleDateString()
          }
        });

        // Create notification
        await createNotification(
          payment.userId,
          'Payment Successful',
          `Your payment of KES ${payment.amount} was successful. Your ${payment.planId} plan is now active.`,
          'payment_success',
          { amount: payment.amount, planId: payment.planId }
        );

        logger.info(`Payment completed for user ${payment.userId}: ${metadata.MpesaReceiptNumber}`);
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
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
            currency: 'KES',
            reason: stkCallback.ResultDesc,
            retryUrl: `${process.env.CLIENT_URL}/pricing`
          }
        });

        await createNotification(
          payment.userId,
          'Payment Failed',
          `Your payment of KES ${payment.amount} failed. Please try again.`,
          'payment_failed',
          { amount: payment.amount, error: stkCallback.ResultDesc }
        );

        logger.warn(`Payment failed for user ${payment.userId}: ${stkCallback.ResultDesc}`);
        
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
      }
    } catch (error) {
      logger.error('M-Pesa webhook error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
    }
  }

  async handleC2BConfirmation(req, res) {
    try {
      const { TransactionType, TransID, TransTime, TransAmount, BusinessShortCode, BillRefNumber, MSISDN } = req.body;
      
      logger.info('M-Pesa C2B confirmation received:', { TransID, TransAmount, MSISDN });

      // Find or create payment record for C2B payment
      let payment = await Payment.findOne({ transactionId: TransID });
      
      if (!payment) {
        payment = await Payment.create({
          transactionId: TransID,
          method: 'mpesa',
          amount: TransAmount,
          currency: 'KES',
          status: 'completed',
          completedAt: new Date(TransTime),
          paymentDetails: {
            phoneNumber: MSISDN,
            transactionType: TransactionType,
            businessShortCode: BusinessShortCode,
            billRefNumber: BillRefNumber
          }
        });
      }

      // Find user by BillRefNumber (reference)
      if (BillRefNumber) {
        const user = await User.findOne({ 'metadata.reference': BillRefNumber });
        if (user && !payment.userId) {
          payment.userId = user._id;
          await payment.save();
          
          // Activate subscription if applicable
          if (payment.planId) {
            await this.activateSubscription(user._id, payment.planId);
          }
        }
      }

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa C2B confirmation error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
    }
  }

  async handleC2BValidation(req, res) {
    try {
      const { BillRefNumber, TransAmount } = req.body;
      
      logger.info('M-Pesa C2B validation received:', { BillRefNumber, TransAmount });

      // Validate the transaction
      // Check if BillRefNumber is valid
      // Check if amount is within limits
      
      // For now, accept all transactions
      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa C2B validation error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Validation failed' });
    }
  }

  async handleB2CResult(req, res) {
    try {
      const { Result, TransactionID, ResultCode, ResultDesc } = req.body;
      
      logger.info('M-Pesa B2C result received:', { TransactionID, ResultCode, ResultDesc });

      // Update payment record for B2C transaction
      const payment = await Payment.findOne({ transactionId: TransactionID });
      
      if (payment) {
        if (ResultCode === 0) {
          payment.status = 'completed';
          payment.completedAt = Date.now();
        } else {
          payment.status = 'failed';
          payment.error = ResultDesc;
        }
        await payment.save();
      }

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa B2C result error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
    }
  }

  async handleTransactionStatus(req, res) {
    try {
      const { Result, TransactionID, ResultCode, ResultDesc } = req.body;
      
      logger.info('M-Pesa transaction status received:', { TransactionID, ResultCode });

      const payment = await Payment.findOne({ transactionId: TransactionID });
      
      if (payment && ResultCode === 0) {
        payment.status = 'completed';
        payment.completedAt = Date.now();
        await payment.save();
      }

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa transaction status error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
    }
  }

  async handleReversal(req, res) {
    try {
      const { TransactionID, ResultCode, ResultDesc } = req.body;
      
      logger.info('M-Pesa reversal received:', { TransactionID, ResultCode });

      const payment = await Payment.findOne({ transactionId: TransactionID });
      
      if (payment && ResultCode === 0) {
        payment.status = 'refunded';
        payment.refundedAt = Date.now();
        await payment.save();
        
        // Downgrade subscription if needed
        const subscription = await Subscription.findOne({ userId: payment.userId, status: 'active' });
        if (subscription) {
          subscription.status = 'cancelled';
          await subscription.save();
          
          await User.findByIdAndUpdate(payment.userId, { subscriptionPlan: 'free' });
        }
      }

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa reversal error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
    }
  }

  async handleTimeout(req, res) {
    try {
      const { CheckoutRequestID, ResultCode, ResultDesc } = req.body;
      
      logger.warn('M-Pesa timeout received:', { CheckoutRequestID, ResultDesc });

      const payment = await Payment.findOne({ transactionId: CheckoutRequestID });
      
      if (payment && payment.status === 'pending') {
        payment.status = 'failed';
        payment.error = 'Transaction timeout';
        await payment.save();
      }

      res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error) {
      logger.error('M-Pesa timeout error:', error);
      res.json({ ResultCode: 1, ResultDesc: 'Internal error' });
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

module.exports = new MpesaWebhook();