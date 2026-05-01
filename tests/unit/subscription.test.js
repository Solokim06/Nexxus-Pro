const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');

describe('Subscription Unit Tests', () => {
  let testUser;
  let testToken;
  let testSubscription;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Subscription.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Subscription.deleteMany({});
    
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isEmailVerified: true,
      subscriptionPlan: 'basic',
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
    
    testSubscription = await Subscription.create({
      userId: testUser._id,
      planId: 'basic',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      features: ['10GB Storage', '50 Merges'],
      limits: { storage: 10737418240, merges: 50 },
    });
  });

  describe('Get Plans', () => {
    it('should get all subscription plans', async () => {
      const res = await request(app)
        .get('/api/subscriptions/plans');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Get User Subscription', () => {
    it('should get current user subscription', async () => {
      const res = await request(app)
        .get('/api/subscriptions/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('plan');
      expect(res.body.data.usage).toBeDefined();
    });
  });

  describe('Cancel Subscription', () => {
    it('should cancel active subscription', async () => {
      const res = await request(app)
        .post('/api/subscriptions/cancel')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ reason: 'Testing cancellation' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const cancelledSub = await Subscription.findById(testSubscription._id);
      expect(cancelledSub.status).toBe('cancelled');
    });
  });

  describe('Change Plan', () => {
    it('should change subscription plan', async () => {
      const res = await request(app)
        .put('/api/subscriptions/change-plan')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ newPlanId: 'pro' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscriptionPlan).toBe('pro');
    });
  });
});