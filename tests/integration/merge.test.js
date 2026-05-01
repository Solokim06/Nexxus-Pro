const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../app');
const User = require('../../models/User');
const MergeJob = require('../../models/MergeJob');

describe('Merge Integration Tests', () => {
  let testUser;
  let testToken;

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
      subscriptionPlan: 'pro',
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  describe('PDF Merge', () => {
    it('should merge PDF files', async () => {
      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'pdf')
        .attach('files', Buffer.from('%PDF-1.4\nPage 1'), 'doc1.pdf')
        .attach('files', Buffer.from('%PDF-1.4\nPage 2'), 'doc2.pdf');

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('jobId');
    });

    it('should merge with custom options', async () => {
      const options = {
        pageSize: 'A4',
        orientation: 'landscape',
        compression: 'high',
      };

      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'pdf')
        .field('options', JSON.stringify(options))
        .attach('files', Buffer.from('%PDF-1.4\nDoc1'), 'doc1.pdf')
        .attach('files', Buffer.from('%PDF-1.4\nDoc2'), 'doc2.pdf');

      expect(res.statusCode).toBe(202);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Image Merge', () => {
    it('should merge images into PDF', async () => {
      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'pdf')
        .attach('files', Buffer.from('fake image'), 'image1.jpg')
        .attach('files', Buffer.from('fake image'), 'image2.png');

      expect(res.statusCode).toBe(202);
    });

    it('should merge images horizontally', async () => {
      const options = { layout: 'horizontal' };
      const res = await request(app)
        .post('/api/merge/files')
        .set('Authorization', `Bearer ${testToken}`)
        .field('outputFormat', 'image')
        .field('options', JSON.stringify(options))
        .attach('files', Buffer.from('fake image'), 'img1.jpg')
        .attach('files', Buffer.from('fake image'), 'img2.jpg');

      expect(res.statusCode).toBe(202);
    });
  });

  describe('Merge Queue', () => {
    it('should add merge to queue', async () => {
      const res = await request(app)
        .post('/api/merge/queue')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Merge',
          fileIds: ['file1', 'file2'],
          outputFormat: 'pdf',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('id');
    });

    it('should get merge queue', async () => {
      const res = await request(app)
        .get('/api/merge/queue')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should reorder queue items', async () => {
      const res = await request(app)
        .post('/api/merge/queue/reorder')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          queue: [{ id: '1', order: 1 }, { id: '2', order: 2 }],
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Merge Status', () => {
    let testJob;

    beforeEach(async () => {
      testJob = await MergeJob.create({
        userId: testUser._id,
        status: 'processing',
        outputFormat: 'pdf',
        progress: 50,
      });
    });

    it('should get merge status', async () => {
      const res = await request(app)
        .get(`/api/merge/status/${testJob._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('status', 'processing');
      expect(res.body.data).toHaveProperty('progress', 50);
    });

    it('should cancel merge job', async () => {
      const res = await request(app)
        .post(`/api/merge/cancel/${testJob._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Merge History', () => {
    beforeEach(async () => {
      await MergeJob.create([
        {
          userId: testUser._id,
          status: 'completed',
          outputFormat: 'pdf',
          outputName: 'merged1.pdf',
          completedAt: new Date(),
        },
        {
          userId: testUser._id,
          status: 'completed',
          outputFormat: 'zip',
          outputName: 'merged2.zip',
          completedAt: new Date(),
        },
      ]);
    });

    it('should get merge history', async () => {
      const res = await request(app)
        .get('/api/merge/history')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('should filter history by format', async () => {
      const res = await request(app)
        .get('/api/merge/history?outputFormat=pdf')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.every(job => job.outputFormat === 'pdf')).toBe(true);
    });
  });
});