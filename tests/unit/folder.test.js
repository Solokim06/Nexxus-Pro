const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Folder = require('../../models/Folder');

describe('Folder Unit Tests', () => {
  let testUser;
  let testToken;
  let testFolder;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Folder.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Folder.deleteMany({});
    
    testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpassword',
      isEmailVerified: true,
    });
    
    const jwt = require('jsonwebtoken');
    testToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET);
    
    testFolder = await Folder.create({
      name: 'Test Folder',
      userId: testUser._id,
    });
  });

  describe('Create Folder', () => {
    it('should create a folder successfully', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'New Folder' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'New Folder');
    });

    it('should fail create folder without name', async () => {
      const res = await request(app)
        .post('/api/folders')
        .set('Authorization', `Bearer ${testToken}`)
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Get Folders', () => {
    it('should get all user folders', async () => {
      const res = await request(app)
        .get('/api/folders')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should get folder by ID', async () => {
      const res = await request(app)
        .get(`/api/folders/${testFolder._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Test Folder');
    });
  });

  describe('Update Folder', () => {
    it('should rename a folder', async () => {
      const res = await request(app)
        .put(`/api/folders/${testFolder._id}`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({ name: 'Renamed Folder' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('name', 'Renamed Folder');
    });
  });

  describe('Delete Folder', () => {
    it('should delete a folder', async () => {
      const res = await request(app)
        .delete(`/api/folders/${testFolder._id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      
      const deletedFolder = await Folder.findById(testFolder._id);
      expect(deletedFolder.isDeleted).toBe(true);
    });
  });

  describe('Folder Tree', () => {
    it('should get folder tree structure', async () => {
      const res = await request(app)
        .get('/api/folders/tree')
        .set('Authorization', `Bearer ${testToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});