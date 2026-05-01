const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const app = require('../../app');
const User = require('../../models/User');

describe('Authentication Integration Tests', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('User Registration Flow', () => {
    it('should complete full registration flow', async () => {
      // Step 1: Register
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'Password123!',
          phone: '+254712345678',
        });

      expect(registerRes.statusCode).toBe(201);
      expect(registerRes.body.data.user.email).toBe('newuser@example.com');

      // Step 2: Verify email (simulate with token)
      const user = await User.findOne({ email: 'newuser@example.com' });
      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: user.emailVerificationToken });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.success).toBe(true);

      // Step 3: Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
        });

      expect(loginRes.statusCode).toBe(200);
      expect(loginRes.body.data).toHaveProperty('token');
    });
  });

  describe('Password Reset Flow', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('OldPass123!', 12),
        isEmailVerified: true,
      });
    });

    it('should complete password reset flow', async () => {
      // Step 1: Request password reset
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'test@example.com' });

      expect(forgotRes.statusCode).toBe(200);

      // Step 2: Reset password with token
      const user = await User.findOne({ email: 'test@example.com' });
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          token: user.resetPasswordToken,
          newPassword: 'NewPass123!',
        });

      expect(resetRes.statusCode).toBe(200);

      // Step 3: Login with new password
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'NewPass123!',
        });

      expect(loginRes.statusCode).toBe(200);
    });
  });

  describe('Session Management', () => {
    let testUser;
    let testToken;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Test123!', 12),
        isEmailVerified: true,
      });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        });
      
      testToken = loginRes.body.data.token;
    });

    it('should get active sessions', async () => {
      const res = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should revoke a session', async () => {
      const sessionsRes = await request(app)
        .get('/api/auth/sessions')
        .set('Authorization', `Bearer ${testToken}`);
      
      const sessionId = sessionsRes.body.data[0]._id;
      
      const res = await request(app)
        .delete(`/api/auth/sessions/${sessionId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('should logout', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('Profile Management', () => {
    let testUser;
    let testToken;

    beforeEach(async () => {
      testUser = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: await bcrypt.hash('Test123!', 12),
        isEmailVerified: true,
      });
      
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Test123!',
        });
      
      testToken = loginRes.body.data.token;
    });

    it('should get current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('email', 'test@example.com');
    });

    it('should update profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Updated Name',
          phone: '+254712345678',
          company: 'Test Company',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('name', 'Updated Name');
    });

    it('should change password', async () => {
      const res = await request(app)
        .put('/api/auth/change-password')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          currentPassword: 'Test123!',
          newPassword: 'NewPass123!',
          confirmPassword: 'NewPass123!',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});