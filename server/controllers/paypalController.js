const axios = require('axios');
const Payment = require('../models/Payment');
const { createAuditLog } = require('../services/auditService');

// PayPal API URLs
const PAYPAL_API = {
  sandbox: 'https://api.sandbox.paypal.com',
  production: 'https://api.paypal.com',
};

// Get PayPal access token
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v1/oauth2/token`;
    
    const response = await axios.post(url, 'grant_type=client_credentials', {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Get PayPal token error:', error.response?.data || error.message);
    throw new Error('Failed to get PayPal access token');
  }
};

// @desc    Create PayPal order
// @route   POST /api/payments/paypal/create-order
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { amount, currency = 'USD', planId, returnUrl, cancelUrl } = req.body;
    
    const accessToken = await getAccessToken();
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v2/checkout/orders`;
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
        description: `${planId} Plan Subscription - Nexxus-Pro`,
        custom_id: req.user.id,
      }],
      application_context: {
        return_url: returnUrl || `${process.env.CLIENT_URL}/payment/callback?status=success`,
        cancel_url: cancelUrl || `${process.env.CLIENT_URL}/payment/callback?status=cancelled`,
        brand_name: 'Nexxus-Pro',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    };
    
    const response = await axios.post(url, orderData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Save payment record
    const payment = await Payment.create({
      userId: req.user.id,
      method: 'paypal',
      amount,
      currency,
      planId,
      transactionId: response.data.id,
      status: 'pending',
      paymentDetails: {
        orderId: response.data.id,
        status: response.data.status,
      },
    });
    
    // Find approval URL
    const approvalUrl = response.data.links.find(link => link.rel === 'approve')?.href;
    
    await createAuditLog({
      userId: req.user.id,
      action: 'PAYPAL_ORDER_CREATED',
      details: { orderId: response.data.id, amount, planId },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      data: {
        orderId: response.data.id,
        paymentId: payment._id,
        approvalUrl,
        status: response.data.status,
      },
    });
  } catch (error) {
    console.error('Create PayPal order error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create PayPal order',
      error: error.response?.data?.message || error.message,
    });
  }
};

// @desc    Capture PayPal order (after user approval)
// @route   POST /api/payments/paypal/capture
// @access  Private
exports.captureOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const accessToken = await getAccessToken();
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v2/checkout/orders/${orderId}/capture`;
    
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Find and update payment
    const payment = await Payment.findOne({ transactionId: orderId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found',
      });
    }
    
    if (response.data.status === 'COMPLETED') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      payment.transactionId = response.data.purchase_units[0].payments.captures[0].id;
      payment.metadata = {
        captureId: response.data.purchase_units[0].payments.captures[0].id,
        payerId: response.data.payer.payer_id,
        email: response.data.payer.email_address,
      };
      await payment.save();
      
      // Activate subscription
      const { activateSubscription } = require('./subscriptionController');
      await activateSubscription(payment.userId, payment.planId);
      
      await createAuditLog({
        userId: payment.userId,
        action: 'PAYPAL_PAYMENT_SUCCESS',
        details: { orderId, amount: payment.amount, captureId: payment.transactionId },
      });
    }
    
    res.json({
      success: true,
      data: {
        status: response.data.status,
        captureId: response.data.purchase_units[0]?.payments?.captures[0]?.id,
        paymentId: payment._id,
      },
    });
  } catch (error) {
    console.error('Capture PayPal order error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to capture PayPal order',
      error: error.response?.data?.message || error.message,
    });
  }
};

// @desc    Get order details
// @route   GET /api/payments/paypal/order/:orderId
// @access  Private
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const accessToken = await getAccessToken();
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v2/checkout/orders/${orderId}`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Get order details error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get order details',
    });
  }
};

// @desc    Refund PayPal payment
// @route   POST /api/payments/paypal/refund
// @access  Private/Admin
exports.refundPayment = async (req, res) => {
  try {
    const { captureId, amount, reason } = req.body;
    
    const accessToken = await getAccessToken();
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v2/payments/captures/${captureId}/refund`;
    
    const refundData = {};
    if (amount) {
      refundData.amount = {
        value: amount.toString(),
        currency_code: 'USD',
      };
    }
    
    const response = await axios.post(url, refundData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Update payment record
    const payment = await Payment.findOne({ transactionId: captureId });
    if (payment) {
      payment.status = 'refunded';
      payment.refundedAt = Date.now();
      payment.refundReason = reason;
      payment.metadata = {
        ...payment.metadata,
        refundId: response.data.id,
        refundAmount: amount || payment.amount,
      };
      await payment.save();
    }
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Refund payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to refund payment',
    });
  }
};

// Internal function for subscription creation
exports.createOrderInternal = async (user, amount, planId, paymentId) => {
  try {
    const accessToken = await getAccessToken();
    const url = `${PAYPAL_API[process.env.PAYPAL_ENVIRONMENT || 'sandbox']}/v2/checkout/orders`;
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'USD',
          value: amount.toString(),
        },
        description: `${planId} Plan Subscription - Nexxus-Pro`,
        custom_id: user.id,
      }],
      application_context: {
        brand_name: 'Nexxus-Pro',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        shipping_preference: 'NO_SHIPPING',
      },
    };
    
    const response = await axios.post(url, orderData, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Update payment with order ID
    await Payment.findByIdAndUpdate(paymentId, {
      transactionId: response.data.id,
      paymentDetails: { orderId: response.data.id },
    });
    
    const approvalUrl = response.data.links.find(link => link.rel === 'approve')?.href;
    
    return {
      orderId: response.data.id,
      approvalUrl,
      redirectUrl: approvalUrl,
    };
  } catch (error) {
    console.error('Internal create order error:', error);
    throw error;
  }
};