const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../app');
const User = require('../../models/User');
const File = require('../../models/File');

describe('Download Integration Tests', () => {
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
      name: 'download.txt',
      originalName: 'download.txt',
      size: 1024,
      mimeType: 'text/plain',
      path: '/uploads/download.txt',
      url: 'http://localhost/uploads/download.txt',
      userId: testUser._id,
    });
  });

  describe('Single File Download', () => {
    it('should download file successfully', async () => {
      const res = await request(app)
        .get(`/api/files/download/${testFile._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
      expect(res.headers['content-disposition']).toContain('download.txt');
    });

    it('should increment download count', async () => {
      await request(app)
        .get(`/api/files/download/${testFile._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      const updatedFile = await File.findById(testFile._id);
      expect(updatedFile.downloadCount).toBe(1);
    });

    it('should reject download of non-existent file', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/files/download/${fakeId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(404);
    });

    it('should reject download without authentication', async () => {
      const res = await request(app)
        .get(`/api/files/download/${testFile._id}`);

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Multiple Files Download', () => {
    let testFiles;

    beforeEach(async () => {
      testFiles = await Promise.all([
        File.create({
          name: 'file1.txt',
          size: 1024,
          mimeType: 'text/plain',
          path: '/uploads/file1.txt',
          url: 'http://localhost/uploads/file1.txt',
          userId: testUser._id,
        }),
        File.create({
          name: 'file2.txt',
          size: 2048,
          mimeType: 'text/plain',
          path: '/uploads/file2.txt',
          url: 'http://localhost/uploads/file2.txt',
          userId: testUser._id,
        }),
      ]);
    });

    it('should download multiple files as zip', async () => {
      const fileIds = testFiles.map(f => f._id);
      const res = await request(app)
        .post('/api/files/download-multiple')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ fileIds });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('application/zip');
    });
  });

  describe('Shared File Download', () => {
    let sharedFile;
    let shareToken;

    beforeEach(async () => {
      sharedFile = await File.create({
        name: 'shared.txt',
        size: 1024,
        mimeType: 'text/plain',
        path: '/uploads/shared.txt',
        url: 'http://localhost/uploads/shared.txt',
        userId: testUser._id,
        isPublic: true,
        shareToken: 'test-share-token-123',
      });
      shareToken = sharedFile.shareToken;
    });

    it('should download shared file with token', async () => {
      const res = await request(app)
        .get(`/api/shared/download/${shareToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('text/plain');
    });

    it('should reject download with invalid token', async () => {
      const res = await request(app)
        .get('/api/shared/download/invalid-token');

      expect(res.statusCode).toBe(404);
    });
  });
});