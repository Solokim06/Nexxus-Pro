const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../app');
const User = require('../../models/User');
const File = require('../../models/File');

describe('File Unit Tests', () => {
  let testUser;
  let testToken;
  let testFile;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await File.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await File.deleteMany({});
    
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isEmailVerified: true,
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
    
    testFile = await File.create({
      name: 'test.txt',
      originalName: 'test.txt',
      size: 1024,
      mimeType: 'text/plain',
      path: '/uploads/test.txt',
      url: 'http://localhost/uploads/test.txt',
      userId: testUser._id,
    });
  });

  describe('File Upload', () => {
    it('should upload a file successfully', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('test content'), 'testfile.txt');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'testfile.txt');
    });

    it('should fail upload without authentication', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test content'), 'testfile.txt');

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should fail upload with invalid file type', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('test content'), 'testfile.exe');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Files', () => {
    it('should get user files successfully', async () => {
      const res = await request(app)
        .get('/api/files')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get single file by ID', async () => {
      const res = await request(app)
        .get(`/api/files/${testFile._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
     expect(res.body.data).toHaveProperty('name', 'test.txt');
    });

    it('should return 404 for non-existent file', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/files/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('File Operations', () => {
    it('should rename a file', async () => {
      const res = await request(app)
        .put(`/api/files/${testFile._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'renamed.txt' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'renamed.txt');
    });

    it('should delete a file (move to trash)', async () => {
      const res = await request(app)
        .delete(`/api/files/${testFile._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const deletedFile = await File.findById(testFile._id);
      expect(deletedFile.isDeleted).toBe(true);
    });

    it('should star/unstar a file', async () => {
      const res = await request(app)
        .put(`/api/files/${testFile._id}/star`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const starredFile = await File.findById(testFile._id);
      expect(starredFile.isStarred).toBe(true);
    });
  });

  describe('File Search', () => {
    it('should search files by name', async () => {
      const res = await request(app)
        .get('/api/files/search?q=test')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});