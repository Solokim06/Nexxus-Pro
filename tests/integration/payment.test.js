const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Payment = require('../../models/Payment');
const Subscription = require('../../models/Subscription');

describe('Payment Integration Tests', () => {
  let testUser;
  let testToken;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Payment.deleteMany({});
    await Subscription.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Payment.deleteMany({});
    
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isEmailVerified: true,
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  describe('Payment Methods', () => {
    it('should get available payment methods', async () => {
      const res = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toContainEqual(
        expect.objectContaining({ id: 'mpesa' })
      );
      expect(res.body.data).toContainEqual(
        expect.objectContaining({ id: 'paypal' })
      );
    });
  });

  describe('Payment Processing', () => {
    it('should process M-Pesa payment', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          method: 'mpesa',
          amount: 9.99,
          currency: 'KES',
          planId: 'basic',
          paymentDetails: {
            phoneNumber: '254712345678',
          },
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('paymentId');
      expect(res.body.data).toHaveProperty('checkoutRequestId');
    });

    it('should process PayPal payment', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          method: 'paypal',
          amount: 9.99,
          currency: 'USD',
          planId: 'basic',
          paymentDetails: {
            returnUrl: 'http://localhost:3000/success',
            cancelUrl: 'http://localhost:3000/cancel',
          },
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('orderId');
      expect(res.body.data).toHaveProperty('approvalUrl');
    });

    it('should process bank transfer', async () => {
      const res = await request(app)
        .post('/api/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          method: 'bank_transfer',
          amount: 9.99,
          currency: 'USD',
          planId: 'basic',
          paymentDetails: {
            reference: 'TEST-REF-123',
          },
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty('reference');
    });
  });

  describe('Payment Verification', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        userId: testUser._id,
        method: 'mpesa',
        amount: 9.99,
        currency: 'KES',
        planId: 'basic',
        status: 'pending',
        transactionId: 'TEST_CHECKOUT_ID',
      });
    });

    it('should verify payment status', async () => {
      const res = await request(app)
        .post('/api/payments/verify')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          paymentId: testPayment._id,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('status');
    });
  });

  describe('Payment History', () => {
    beforeEach(async () => {
      await Payment.create([
        {
          userId: testUser._id,
          method: 'mpesa',
          amount: 9.99,
          currency: 'KES',
          planId: 'basic',
          status: 'completed',
          completedAt: new Date(),
        },
        {
          userId: testUser._id,
          method: 'paypal',
          amount: 29.99,
          currency: 'USD',
          planId: 'pro',
          status: 'completed',
          completedAt: new Date(),
        },
      ]);
    });

    it('should get payment history', async () => {
      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(2);
    });

    it('should filter by status', async () => {
      const res = await request(app)
        .get('/api/payments/history?status=completed')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(p => p.status === 'completed')).toBe(true);
    });
  });

  describe('Invoices', () => {
    let testPayment;

    beforeEach(async () => {
      testPayment = await Payment.create({
        userId: testUser._id,
        method: 'mpesa',
        amount: 9.99,
        currency: 'KES',
        planId: 'basic',
        status: 'completed',
        completedAt: new Date(),
      });
    });

    it('should get invoices', async () => {
      const res = await request(app)
        .get('/api/payments/invoices')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should download invoice', async () => {
      const res = await request(app)
        .get(`/api/payments/invoices/${testPayment._id}/download`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/pdf');
    });
  });
});