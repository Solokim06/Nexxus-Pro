const request = require('supertest');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const app = require('../../app');
const User = require('../../models/User');
const File = require('../../models/File');

describe('Upload Integration Tests', () => {
  let testUser;
  let testToken;
  let testFolder;

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
      subscriptionPlan: 'basic',
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
  });

  describe('Single File Upload', () => {
    it('should upload a single file successfully', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('This is test file content'), 'testfile.txt');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'testfile.txt');
      expect(res.body.data).toHaveProperty('size');
      expect(res.body.data).toHaveProperty('mimeType', 'text/plain');
    });

    it('should upload an image file', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('fake image data'), 'test.jpg');

      expect(res.statusCode).toBe(201);
      expect(res.body.data.mimeType).toBe('image/jpeg');
    });

    it('should upload a PDF file', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('%PDF-1.4\n%Test PDF'), 'test.pdf');

      expect(res.statusCode).toBe(201);
      expect(res.body.data.mimeType).toBe('application/pdf');
    });

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(150 * 1024 * 1024); // 150MB
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', largeBuffer, 'largefile.bin');

      expect(res.statusCode).toBe(413);
      expect(res.body.success).toBe(false);
    });

    it('should reject disallowed file type', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('file', Buffer.from('malicious'), 'virus.exe');

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/files/upload')
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.statusCode).toBe(401);
    });
  });

  describe('Multiple Files Upload', () => {
    it('should upload multiple files', async () => {
      const res = await request(app)
        .post('/api/files/upload-multiple')
        .set('Authorization', `Bearer ${testToken}`)
        .attach('files', Buffer.from('file1'), 'file1.txt')
        .attach('files', Buffer.from('file2'), 'file2.txt')
        .attach('files', Buffer.from('file3'), 'file3.jpg');

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(3);
    });

    it('should reject if no files provided', async () => {
      const res = await request(app)
        .post('/api/files/upload-multiple')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Chunked Upload', () => {
    it('should upload file chunks successfully', async () => {
      const fileId = `test_${Date.now()}`;
      const totalChunks = 5;
      const chunkSize = 1024 * 1024; // 1MB
      
      for (let i = 0; i < totalChunks; i++) {
        const chunk = Buffer.alloc(chunkSize, `chunk_${i}`);
        const res = await request(app)
          .post('/api/files/upload-chunk')
          .set('Authorization', `Bearer ${testToken}`)
          .field('fileId', fileId)
          .field('chunkIndex', i)
          .field('totalChunks', totalChunks)
          .attach('chunk', chunk, `chunk_${i}`);

        expect(res.statusCode).toBe(200);
      }

      // Complete upload
      const completeRes = await request(app)
        .post('/api/files/complete-upload')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          fileId,
          fileName: 'largefile.bin',
          fileSize: totalChunks * chunkSize,
        });

      expect(completeRes.statusCode).toBe(200);
      expect(completeRes.body.success).toBe(true);
    });

    it('should resume interrupted upload', async () => {
      const fileId = `resume_${Date.now()}`;
      
      // Upload first 3 chunks
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/files/upload-chunk')
          .set('Authorization', `Bearer ${testToken}`)
          .field('fileId', fileId)
          .field('chunkIndex', i)
          .field('totalChunks', 5)
          .attach('chunk', Buffer.alloc(1024), `chunk_${i}`);
      }

      // Check status
      const statusRes = await request(app)
        .get(`/api/files/upload-status/${fileId}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(statusRes.statusCode).toBe(200);
      expect(statusRes.body.data.uploadedChunks).toBe(3);
    });
  });

  describe('Upload to Folder', () => {
    it('should upload file to specific folder', async () => {
      // Create folder first
      const folderRes = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Test Folder' });
      
      const folderId = folderRes.body.data._id;

      const res = await request(app)
        .post('/api/files/upload')
        .set('Authorization', `Bearer ${testToken}`)
        .field('folderId', folderId)
        .attach('file', Buffer.from('test'), 'test.txt');

      expect(res.statusCode).toBe(201);
      expect(res.body.data.folderId).toBe(folderId);
    });
  });
});