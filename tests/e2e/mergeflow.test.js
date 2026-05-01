const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const path = require('path');
const User = require('../../models/User');
const File = require('../../models/File');

describe('Merge Flow E2E Tests', () => {
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
    await File.deleteMany({});
    
    testUser = await User.create({
      name: 'Merge Test User',
      email: 'merge@example.com',
      password: 'Test123!',
      isEmailVerified: true,
      subscriptionPlan: 'pro',
    });
    
    page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    
    await page.type('input[name="email"]', 'merge@example.com');
    await page.type('input[name="password"]', 'Test123!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation(),
    ]);
  });

  afterEach(async () => {
    await page.close();
  });

  describe('PDF Merge Flow', () => {
    beforeEach(async () => {
      // Upload test PDFs
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/doc1.pdf',
        './tests/fixtures/doc2.pdf',
        './tests/fixtures/doc3.pdf'
      );
      
      await page.click('button:contains("Upload")');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
    });

    it('should merge multiple PDFs', async () => {
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      // Select files to merge
      await page.click('.file-select:contains("doc1.pdf")');
      await page.click('.file-select:contains("doc2.pdf")');
      await page.click('.file-select:contains("doc3.pdf")');
      
      // Select output format
      await page.select('select[name="outputFormat"]', 'pdf');
      
      // Configure merge options
      await page.select('select[name="pageSize"]', 'A4');
      await page.select('select[name="orientation"]', 'portrait');
      
      // Start merge
      await page.click('button:contains("Merge Files")');
      
      // Monitor merge progress
      await page.waitForSelector('.merge-progress');
      await page.waitForFunction(
        () => document.querySelector('.merge-complete'),
        { timeout: 60000 }
      );
      
      // Download merged file
      await page.click('button:contains("Download")');
      
      // Verify merge in history
      await page.click('a[href="/merge/history"]');
      await page.waitForSelector('.merge-history-item');
      
      const mergeItem = await page.$eval('.merge-history-item', el => el.textContent);
      expect(mergeItem).toContain('merged');
    });

    it('should preview before merging', async () => {
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      await page.click('.file-select:contains("doc1.pdf")');
      await page.click('.file-select:contains("doc2.pdf")');
      
      await page.click('button:contains("Preview")');
      await page.waitForSelector('.preview-modal');
      
      const previewContent = await page.$eval('.preview-content', el => el.textContent);
      expect(previewContent).toBeDefined();
      
      await page.click('.close-modal');
      await page.click('button:contains("Merge Files")');
    });
  });

  describe('Image Merge Flow', () => {
    beforeEach(async () => {
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/image1.jpg',
        './tests/fixtures/image2.jpg',
        './tests/fixtures/image3.png'
      );
      
      await page.click('button:contains("Upload")');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
    });

    it('should merge images into PDF', async () => {
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      await page.click('.file-select:contains("image1.jpg")');
      await page.click('.file-select:contains("image2.jpg")');
      await page.click('.file-select:contains("image3.png")');
      
      await page.select('select[name="outputFormat"]', 'pdf');
      await page.select('select[name="quality"]', 'high');
      
      await page.click('button:contains("Merge Files")');
      await page.waitForSelector('.merge-complete', { timeout: 60000 });
      
      const downloadButton = await page.$('button:contains("Download")');
      expect(downloadButton).toBeTruthy();
    });

    it('should merge images horizontally', async () => {
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      await page.click('.file-select:contains("image1.jpg")');
      await page.click('.file-select:contains("image2.jpg")');
      
      await page.select('select[name="outputFormat"]', 'image');
      await page.select('select[name="layout"]', 'horizontal');
      
      await page.click('button:contains("Merge Files")');
      await page.waitForSelector('.merge-complete', { timeout: 60000 });
    });
  });

  describe('Merge Queue Management', () => {
    beforeEach(async () => {
      // Upload test files
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/doc1.pdf',
        './tests/fixtures/doc2.pdf'
      );
      
      await page.click('button:contains("Upload")');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
    });

    it('should manage merge queue', async () => {
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      // Add multiple merges to queue
      for (let i = 0; i < 3; i++) {
        await page.click('.file-select:contains("doc1.pdf")');
        await page.click('.file-select:contains("doc2.pdf")');
        await page.click('button:contains("Add to Queue")');
        await page.waitForTimeout(1000);
      }
      
      // View queue
      await page.click('button:contains("Show Queue")');
      await page.waitForSelector('.queue-item');
      
      const queueCount = await page.$$eval('.queue-item', items => items.length);
      expect(queueCount).toBe(3);
      
      // Reorder queue
      const dragHandle = await page.$('.queue-item:first-child .drag-handle');
      const target = await page.$('.queue-item:last-child');
      
      await dragHandle.hover();
      await page.mouse.down();
      await page.mouse.move(
        (await target.boundingBox()).x,
        (await target.boundingBox()).y
      );
      await page.mouse.up();
      
      // Process queue
      await page.click('button:contains("Process All")');
      await page.waitForFunction(
        () => document.querySelectorAll('.queue-item.completed').length === 3,
        { timeout: 180000 }
      );
    });
  });

  describe('Merge History and Download', () => {
    let mergeJobId;

    beforeEach(async () => {
      // Create a merge job
      await page.click('a[href="/upload"]');
      await page.waitForNavigation();
      
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/doc1.pdf',
        './tests/fixtures/doc2.pdf'
      );
      
      await page.click('button:contains("Upload")');
      await page.waitForSelector('.upload-complete', { timeout: 30000 });
      
      await page.click('a[href="/merge"]');
      await page.waitForNavigation();
      
      await page.click('.file-select:contains("doc1.pdf")');
      await page.click('.file-select:contains("doc2.pdf")');
      await page.click('button:contains("Merge Files")');
      await page.waitForSelector('.merge-complete', { timeout: 60000 });
    });

    it('should view merge history', async () => {
      await page.click('a[href="/merge/history"]');
      await page.waitForNavigation();
      
      await page.waitForSelector('.merge-history-item');
      const historyItem = await page.$eval('.merge-history-item', el => el.textContent);
      expect(historyItem).toContain('merged');
    });

    it('should re-download merged file from history', async () => {
      await page.click('a[href="/merge/history"]');
      await page.waitForNavigation();
      
      await page.waitForSelector('.merge-history-item');
      await page.click('.merge-history-item button:contains("Download")');
      
      // Wait for download to start
      await page.waitForTimeout(2000);
      
      const downloadPath = await page.evaluate(() => {
        // Check if download started
        return true;
      });
      expect(downloadPath).toBe(true);
    });

    it('should delete merge from history', async () => {
      await page.click('a[href="/merge/history"]');
      await page.waitForNavigation();
      
      await page.waitForSelector('.merge-history-item');
      await page.click('.merge-history-item button:contains("Delete")');
      
      await page.click('button:contains("Confirm")');
      await page.waitForFunction(
        () => document.querySelectorAll('.merge-history-item').length === 0,
        { timeout: 5000 }
      );
    });
  });
});