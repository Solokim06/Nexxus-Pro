const axios = require('axios');

class PaypalService {
  constructor() {
    this.environment = process.env.PAYPAL_ENVIRONMENT || 'sandbox';
    this.apiUrl = this.environment === 'production'
      ? 'https://api.paypal.com'
      : 'https://api.sandbox.paypal.com';
    this.clientId = process.env.PAYPAL_CLIENT_ID;
    this.clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    this.accessToken = null;
    this.tokenExpiry = null;
  }
  
  async getAccessToken() {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now()) {
      return this.accessToken;
    }
    
    const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const url = `${this.apiUrl}/v1/oauth2/token`;
    
    try {
      const response = await axios.post(url, 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (error) {
      console.error('PayPal token error:', error.response?.data || error.message);
      throw new Error('Failed to get PayPal access token');
    }
  }
  
  async createOrder(amount, currency = 'USD', returnUrl, cancelUrl, metadata = {}) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v2/checkout/orders`;
    
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: currency,
          value: amount.toString(),
        },
        description: 'Nexxus-Pro Subscription',
        custom_id: JSON.stringify(metadata),
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
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
    
    const approvalUrl = response.data.links.find(link => link.rel === 'approve')?.href;
    
    return {
      orderId: response.data.id,
      status: response.data.status,
      approvalUrl,
      links: response.data.links,
    };
  }
  
  async captureOrder(orderId) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v2/checkout/orders/${orderId}/capture`;
    
    const response = await axios.post(url, {}, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const capture = response.data.purchase_units[0]?.payments?.captures[0];
    
    return {
      orderId: response.data.id,
      status: response.data.status,
      captureId: capture?.id,
      amount: capture?.amount?.value,
      currency: capture?.amount?.currency_code,
      payerEmail: response.data.payer?.email_address,
      payerId: response.data.payer?.payer_id,
      createTime: response.data.create_time,
      updateTime: response.data.update_time,
    };
  }
  
  async getOrderDetails(orderId) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v2/checkout/orders/${orderId}`;
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
  
  async refundPayment(captureId, amount = null) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v2/payments/captures/${captureId}/refund`;
    
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
    
    return {
      refundId: response.data.id,
      status: response.data.status,
      amount: response.data.amount?.value,
      createTime: response.data.create_time,
    };
  }
  
  async verifyWebhookSignature(headers, body) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v1/notifications/verify-webhook-signature`;
    
    const data = {
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: body,
    };
    
    const response = await axios.post(url, data, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data.verification_status === 'SUCCESS';
  }
  
  async listTransactions(startDate, endDate) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v1/reporting/transactions`;
    
    const params = {
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      fields: 'all',
    };
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params,
    });
    
    return response.data.transaction_details || [];
  }
  
  async createSubscription(planId, returnUrl) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v1/billing/subscriptions`;
    
    const data = {
      plan_id: planId,
      start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      subscriber: {
        name: {
          given_name: 'Nexxus',
          surname: 'User',
        },
      },
      application_context: {
        brand_name: 'Nexxus-Pro',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        return_url: returnUrl,
      },
    };
    
    const response = await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const approvalUrl = response.data.links.find(link => link.rel === 'approve')?.href;
    
    return {
      subscriptionId: response.data.id,
      status: response.data.status,
      approvalUrl,
    };
  }
  
  async cancelSubscription(subscriptionId) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v1/billing/subscriptions/${subscriptionId}/cancel`;
    
    const data = { reason: 'Cancelled by user' };
    
    await axios.post(url, data, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    return { success: true };
  }
  
  async getSubscriptionDetails(subscriptionId) {
    const accessToken = await this.getAccessToken();
    const url = `${this.apiUrl}/v1/billing/subscriptions/${subscriptionId}`;
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    return response.data;
  }
}

module.exports = new PaypalService();