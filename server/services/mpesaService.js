const axios = require('axios');
const crypto = require('crypto');
const Payment = require('../models/Payment');

class MpesaService {
  constructor() {
    this.environment = process.env.MPESA_ENVIRONMENT || 'sandbox';
    this.apiUrl = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.passkey = process.env.MPESA_PASSKEY;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    const url = `${this.apiUrl}/oauth/v1/generate?grant_type=client_credentials`;
    
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Basic ${auth}` },
      });
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('M-Pesa token error:', error.response?.data || error.message);
      throw new Error('Failed to get M-Pesa access token');
    }
  }
  
  async stkPush(phoneNumber, amount, accountReference = 'Nexxus-Pro') {
    const accessToken = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    
    const data = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: this.formatPhoneNumber(phoneNumber),
      PartyB: this.shortcode,
      PhoneNumber: this.formatPhoneNumber(phoneNumber),
      CallBackURL: `${process.env.API_URL}/api/webhooks/mpesa`,
      AccountReference: accountReference,
      TransactionDesc: 'Nexxus-Pro Payment',
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/stkpush/v1/processrequest`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (response.data.ResponseCode !== '0') {
      throw new Error(response.data.ResponseDescription);
    }
    
    return {
      checkoutRequestId: response.data.CheckoutRequestID,
      merchantRequestId: response.data.MerchantRequestID,
      responseCode: response.data.ResponseCode,
      responseDescription: response.data.ResponseDescription,
    };
  }
  
  async queryStatus(checkoutRequestId) {
    const accessToken = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
    
    const data = {
      BusinessShortCode: this.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/stkpushquery/v1/query`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return {
      resultCode: response.data.ResultCode,
      resultDesc: response.data.ResultDesc,
      resultData: response.data,
    };
  }
  
  async registerUrls(confirmationUrl, validationUrl) {
    const accessToken = await this.getAccessToken();
    
    const data = {
      ShortCode: this.shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl,
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/c2b/v1/registerurl`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
  
  async simulateC2B(phoneNumber, amount, shortcode) {
    const accessToken = await this.getAccessToken();
    
    const data = {
      ShortCode: shortcode || this.shortcode,
      CommandID: 'CustomerPayBillOnline',
      Amount: amount,
      Msisdn: this.formatPhoneNumber(phoneNumber),
      BillRefNumber: 'Nexxus-Pro Test',
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/c2b/v1/simulate`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
  
  async reverseTransaction(transactionId, amount) {
    const accessToken = await this.getAccessToken();
    
    const data = {
      CommandID: 'TransactionReversal',
      TransactionID: transactionId,
      Amount: amount,
      ReceiverParty: this.shortcode,
      RecieverIdentifierType: '11',
      Remarks: 'Payment reversal',
      Initiator: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      QueueTimeOutURL: `${process.env.API_URL}/api/webhooks/mpesa/timeout`,
      ResultURL: `${process.env.API_URL}/api/webhooks/mpesa/result`,
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/reversal/v1/request`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
  
  async accountBalance(shortcode) {
    const accessToken = await this.getAccessToken();
    const timestamp = this.getTimestamp();
    const password = Buffer.from(`${shortcode}${this.passkey}${timestamp}`).toString('base64');
    
    const data = {
      CommandID: 'AccountBalance',
      PartyA: shortcode,
      IdentifierType: '4',
      Remarks: 'Balance Check',
      Initiator: process.env.MPESA_INITIATOR_NAME,
      SecurityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
      QueueTimeOutURL: `${process.env.API_URL}/api/webhooks/mpesa/timeout`,
      ResultURL: `${process.env.API_URL}/api/webhooks/mpesa/result`,
    };
    
    const response = await axios.post(`${this.apiUrl}/mpesa/accountbalance/v1/query`, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
  
  formatPhoneNumber(phone) {
    let cleaned = phone.toString().replace(/\D/g, '');
    
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('+254')) {
      cleaned = cleaned.substring(1);
    } else if (!cleaned.startsWith('254') && cleaned.length === 9) {
      cleaned = '254' + cleaned;
    }
    
    if (!cleaned.match(/^254[7-9][0-9]{8}$/)) {
      throw new Error('Invalid phone number format');
    }
    
    return cleaned;
  }
  
  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    const second = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}${second}`;
  }
  
  processCallback(data) {
    const { Body } = data;
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
    }
    
    return result;
  }
}

module.exports = new MpesaService();