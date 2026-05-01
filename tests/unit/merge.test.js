const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const MergeJob = require('../../models/MergeJob');

describe('Merge Unit Tests', () => {
  let testUser;
  let testToken;
  let testMergeJob;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await MergeJob.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await MergeJob.deleteMany({});
    
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isEmailVerified: true,
      subscriptionPlan: 'basic',
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
    
    testMergeJob = await MergeJob.create({
      userId: testUser._id,
      status: 'pending',
      outputFormat: 'pdf',
      inputFiles: [{ name: 'test1.pdf', size: 1024 }, { name: 'test2.pdf', size: 2048 }],
    });
  });

  describe('Merge Files', () => {
    it('should start a merge job', async () => {
      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'pdf')
        .attach('files', Buffer.from('test content 1'), 'file1.pdf')
        .attach('files', Buffer.from('test content 2'), 'file2.pdf');

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
    });

    it('should fail merge with less than 2 files', async () => {
      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'pdf')
        .attach('files', Buffer.from('test content'), 'file1.pdf');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Merge Status', () => {
    it('should get merge job status', async () => {
      const res = await request(app)
        .get(`/api/merge/status/${testMergeJob._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('status');
    });
  });

  describe('Get Merge History', () => {
    it('should get user merge history', async () => {
      const res = await request(app)
        .get('/api/merge/history')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Cancel Merge', () => {
    it('should cancel pending merge job', async () => {
      const res = await request(app)
        .post(`/api/merge/cancel/${testMergeJob._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const cancelledJob = await MergeJob.findById(testMergeJob._id);
      expect(cancelledJob.status).toBe('cancelled');
    });
  });
});