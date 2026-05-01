const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const path = require('path');
const User = require('../../models/User');

describe('Upload Flow E2E Tests', () => {
  let browser;
  let page;
  let testUser;

  beforeAll(async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    
    browser = await puppeteer.launch({
      headless: process.env.CI === 'true',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    await browser.close();
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    
    testUser = await User.create({
      name: 'Upload Test User',
      email: 'upload@example.com',
      password: 'Test123!',
      isEmailVerified: true,
      subscriptionPlan: 'basic',
    });
    
    page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    
    await page.type('input[name="email"]', 'upload@example.com');
    await page.type('input[name="password"]', 'Test123!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation(),
    ]);
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Single File Upload', () => {
    it('should upload a single file via drag and drop', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      // Simulate drag and drop
      const dropzone = await page.$('.dropzone');
      const filePath = path.resolve('./tests/fixtures/test.txt');
      
      await dropzone.uploadFile(filePath);
      
      await page.waitForSelector('.file-list-item');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
      
      const fileName = await page.$eval('.file-name', el => el.textContent);
      expect(fileName).toContain('test.txt');
    });

    it('should upload via file picker', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/document.pdf');
      
      await page.waitForSelector('.file-list-item');
      await page.click('button:contains("Upload")');
      
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
      
      const success = await page.$eval('.toast-success', el => el.textContent);
      expect(success).toContain('Uploaded');
    });

    it('should reject file that exceeds size limit', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/largefile.bin');
      
      await page.waitForSelector('.error-message');
      const error = await page.$eval('.error-message', el => el.textContent);
      expect(error).toContain('exceeds');
    });
  });

  describe('Multiple Files Upload', () => {
    it('should upload multiple files', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/test.txt',
        './tests/fixtures/document.pdf',
        './tests/fixtures/image.jpg'
      );
      
      await page.waitForSelector('.file-list-item', { timeout: 5000 });
      
      const fileCount = await page.$$eval('.file-list-item', items => items.length);
      expect(fileCount).toBe(3);
      
      await page.click('button:contains("Upload All")');
      await page.waitForFunction(
        () => document.querySelectorAll('.upload-complete').length === 3,
        { timeout: 60000 }
      );
    });
  });

  describe('Chunked Upload', () => {
    it('should upload large file in chunks', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      // Enable chunked upload
      await page.click('input[value="chunked"]');
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/largefile.bin');
      
      await page.click('button:contains("Start Upload")');
      
      // Monitor chunk progress
      await page.waitForSelector('.chunk-progress');
      await page.waitForFunction(
        () => document.querySelector('.upload-complete'),
        { timeout: 120000 }
      );
      
      const success = await page.$eval('.toast-success', el => el.textContent);
      expect(success).toContain('Uploaded');
    });

    it('should resume interrupted upload', async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      await page.click('input[value="chunked"]');
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/largefile.bin');
      
      await page.click('button:contains("Start Upload")');
      
      // Interrupt after 50%
      await page.waitForFunction(
        () => {
          const progress = document.querySelector('.progress-bar');
          return progress && progress.style.width === '50%';
        },
        { timeout: 60000 }
      );
      
      // Simulate network interruption
      await page.setOfflineMode(true);
      await page.waitForTimeout(2000);
      await page.setOfflineMode(false);
      
      // Resume upload
      await page.click('button:contains("Resume")');
      await page.waitForSelector('.upload-complete', { timeout: 60000 });
      
      const success = await page.$eval('.toast-success', el => el.textContent);
      expect(success).toContain('Uploaded');
    });
  });

  describe('Upload to Folder', () => {
    it('should upload file to specific folder', async () => {
      // First create a folder
      await page.click('a[href="/dashboard"]');
      await page.waitForNavigation();
      
      await page.click('button[aria-label="New Folder"]');
      await page.type('input[placeholder="Folder name"]', 'Uploads');
      await page.click('button:contains("Create")');
      
      // Navigate to upload with folder selected
      await page.click('.folder-item:contains("Uploads")');
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/test.txt');
      
      await page.click('button:contains("Upload")');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
      
      // Verify file in folder
      await page.click('a[href="/dashboard"]');
      await page.waitForNavigation();
      await page.click('.folder-item:contains("Uploads")');
      
      await page.waitForSelector('.file-item');
      const fileName = await page.$eval('.file-name', el => el.textContent);
      expect(fileName).toContain('test.txt');
    });
  });
});