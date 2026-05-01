const axios = require('axios');
const Payment = require('../models/Payment');
const { createAuditLog } = require('../services/auditService');
const { sendEmail } = require('../services/emailService');

// M-Pesa API endpoints
const MPESA_API = {
  sandbox: 'https://sandbox.safaricom.co.ke',
  production: 'https://api.safaricom.co.ke',
};

// Get OAuth token from Safaricom
const getAccessToken = async () => {
  try {
    const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/oauth/v1/generate?grant_type=client_credentials`;
    
    const response = await axios.get(url, {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Get M-Pesa token error:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token');
  }
};

// @desc    Initiate STK Push (Lipa Na M-Pesa Online)
// @route   POST /api/payments/mpesa/stkpush
// @access  Private
exports.stkPush = async (req, res) => {
  try {
    const { phoneNumber, amount, accountReference = 'Nexxus-Pro' } = req.body;
    
    // Validate phone number
    const formattedPhone = formatPhoneNumber(phoneNumber);
    if (!formattedPhone) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Use 07XXXXXXXX or 254XXXXXXXXX',
      });
    }
    
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/stkpush/v1/processrequest`;
    
    const data = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.API_URL}/api/webhooks/mpesa`,
      AccountReference: accountReference,
      TransactionDesc: 'Nexxus-Pro Payment',
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.data.ResponseCode !== '0') {
      throw new Error(response.data.ResponseDescription || 'STK Push failed');
    }
    
    // Save payment record
    const payment = await Payment.create({
      userId: req.user.id,
      method: 'mpesa',
      amount,
      currency: 'KES',
      planId: req.body.planId || 'basic',
      transactionId: response.data.CheckoutRequestID,
      status: 'pending',
      paymentDetails: {
        phoneNumber: formattedPhone,
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
      },
    });
    
    await createAuditLog({
      userId: req.user.id,
      action: 'MPESA_STK_PUSH',
      details: { amount, phoneNumber: formattedPhone, checkoutRequestId: response.data.CheckoutRequestID },
      ip: req.ip,
    });
    
    res.json({
      success: true,
      message: 'STK Push sent successfully. Please check your phone and enter PIN.',
      data: {
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
        paymentId: payment._id,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      },
    });
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: error.response?.data?.ResponseDescription || error.message || 'Failed to initiate M-Pesa payment',
    });
  }
};

// @desc    Query payment status
// @route   GET /api/payments/mpesa/status/:checkoutRequestId
// @access  Private
exports.queryStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/stkpushquery/v1/query`;
    
    const data = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Update payment status if needed
    const payment = await Payment.findOne({ transactionId: checkoutRequestId });
    if (payment && response.data.ResultCode === '0') {
      payment.status = 'completed';
      payment.completedAt = Date.now();
      await payment.save();
    }
    
    res.json({
      success: true,
      data: {
        resultCode: response.data.ResultCode,
        resultDesc: response.data.ResultDesc,
        status: payment?.status || 'pending',
      },
    });
  } catch (error) {
    console.error('Query status error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to query payment status',
    });
  }
};

// @desc    Simulate C2B payment (for testing)
// @route   POST /api/payments/mpesa/simulate
// @access  Private/Admin
exports.simulatePayment = async (req, res) => {
  try {
    const { phoneNumber, amount, shortCode } = req.body;
    
    const accessToken = await getAccessToken();
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/c2b/v1/simulate`;
    
    const data = {
      ShortCode: shortCode || process.env.MPESA_SHORTCODE,
      CommandID: 'CustomerPayBillOnline',
      Amount: amount,
      Msisdn: formatPhoneNumber(phoneNumber),
      BillRefNumber: 'Nexxus-Pro Test',
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Simulate payment error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to simulate payment',
    });
  }
};

// @desc    Register C2B URLs (for production)
// @route   POST /api/payments/mpesa/register-urls
// @access  Private/Admin
exports.registerUrls = async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/c2b/v1/registerurl`;
    
    const data = {
      ShortCode: process.env.MPESA_SHORTCODE,
      ResponseType: 'Completed',
      ConfirmationURL: `${process.env.API_URL}/api/webhooks/mpesa/confirmation`,
      ValidationURL: `${process.env.API_URL}/api/webhooks/mpesa/validation`,
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Register URLs error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to register URLs',
    });
  }
};

// @desc    Check account balance
// @route   GET /api/payments/mpesa/balance/:shortCode
// @access  Private/Admin
exports.checkBalance = async (req, res) => {
  try {
    const { shortCode } = req.params;
    
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${shortCode}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/accountbalance/v1/query`;
    
    const data = {
      CommandID: 'AccountBalance',
      PartyA: shortCode,
      IdentifierType: '4',
      Remarks: 'Balance Check',
      Initiator: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      QueueTimeOutURL: `${process.env.API_URL}/api/webhooks/mpesa/timeout`,
      ResultURL: `${process.env.API_URL}/api/webhooks/mpesa/result`,
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Check balance error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check balance',
    });
  }
};

// @desc    Reverse M-Pesa transaction
// @route   POST /api/payments/mpesa/reverse
// @access  Private/Admin
exports.reverseTransaction = async (req, res) => {
  try {
    const { transactionId, amount } = req.body;
    
    const accessToken = await getAccessToken();
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/reversal/v1/request`;
    
    const data = {
      CommandID: 'TransactionReversal',
      TransactionID: transactionId,
      Amount: amount,
      ReceiverParty: process.env.MPESA_SHORTCODE,
      RecieverIdentifierType: '11',
      Remarks: 'Payment reversal',
      Initiator: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      QueueTimeOutURL: `${process.env.API_URL}/api/webhooks/mpesa/timeout`,
      ResultURL: `${process.env.API_URL}/api/webhooks/mpesa/result`,
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    // Update payment record
    const payment = await Payment.findOne({ transactionId });
    if (payment) {
      payment.status = 'refunded';
      payment.refundedAt = Date.now();
      await payment.save();
    }
    
    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    console.error('Reverse transaction error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reverse transaction',
    });
  }
};

// Helper functions
function formatPhoneNumber(phone) {
  // Remove any non-digit characters
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Format to 254XXXXXXXXX
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1);
  } else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1);
  } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
    cleaned = '254' + cleaned;
  }
  
  // Validate Kenyan phone number
  if (!cleaned.match(/^254[7-9][0-9]{8}$/)) {
    return null;
  }
  
  return cleaned;
}

function getTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}${hour}${minute}${second}`;
}

// Internal function for subscription creation
exports.initiateSTKPushInternal = async (user, amount, paymentId) => {
  try {
    const phoneNumber = user.phone;
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      throw new Error('User has no valid phone number');
    }
    
    const accessToken = await getAccessToken();
    const timestamp = getTimestamp();
    const password = Buffer.from(
      `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');
    
    const url = `${MPESA_API[process.env.MPESA_ENVIRONMENT || 'sandbox']}/mpesa/stkpush/v1/processrequest`;
    
    const data = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.API_URL}/api/webhooks/mpesa`,
      AccountReference: 'Nexxus-Pro',
      TransactionDesc: 'Subscription Payment',
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (response.data.ResponseCode !== '0') {
      throw new Error(response.data.ResponseDescription);
    }
    
    await Payment.findByIdAndUpdate(paymentId, {
      transactionId: response.data.CheckoutRequestID,
      paymentDetails: {
        checkoutRequestId: response.data.CheckoutRequestID,
        merchantRequestId: response.data.MerchantRequestID,
      },
    });
    
    return {
      checkoutRequestId: response.data.CheckoutRequestID,
      message: 'STK Push sent to your phone',
    };
  } catch (error) {
    console.error('Internal STK push error:', error);
    throw error;
  }
};