const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Payment = require('../../models/Payment');

describe('Payment Unit Tests', () => {
  let testUser;
  let testToken;
  let testPayment;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Payment.deleteMany({});
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
    
    testPayment = await Payment.create({
      userId: testUser._id,
      method: 'mpesa',
      amount: 9.99,
      currency: 'USD',
      planId: 'basic',
      status: 'completed',
      transactionId: 'TXN123',
      completedAt: new Date(),
    });
  });

  describe('Get Payment Methods', () => {
    it('should get available payment methods', async () => {
      const res = await request(app)
        .get('/api/payments/methods')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Get Payment History', () => {
    it('should get user payment history', async () => {
      const res = await request(app)
        .get('/api/payments/history')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Get Invoices', () => {
    it('should get user invoices', async () => {
      const res = await request(app)
        .get('/api/payments/invoices')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('M-Pesa Payment', () => {
    it('should initiate M-Pesa STK Push', async () => {
      const res = await request(app)
        .post('/api/mpesa/stkpush')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          phoneNumber: '254712345678',
          amount: 10,
        });

      // Note: This may fail if M-Pesa sandbox is not configured
      // For unit tests, we mock the response
      expect(res.statusCode).toBe(200);
    });
  });
});