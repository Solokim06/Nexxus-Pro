const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const User = require('../../models/User');

describe('End-to-End Workflow Tests', () => {
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
      name: 'E2E Test User',
      email: 'e2e@example.com',
      password: 'Test123!',
      isEmailVerified: true,
    });
    
    page = await browser.newPage();
    await page.goto('http://localhost:3000');
  });

  afterEach(async () => {
    await page.close();
  });

  describe('Complete User Journey', () => {
    it('should complete full user journey from registration to file management', async () => {
      // Step 1: Navigate to registration page
      await page.click('a[href="/register"]');
      await page.waitForNavigation();
      
      // Step 2: Fill registration form
      await page.type('input[name="name"]', 'E2E User');
      await page.type('input[name="email"]', 'journey@example.com');
      await page.type('input[name="password"]', 'Test123!');
      await page.type('input[name="confirmPassword"]', 'Test123!');
      await page.click('input[name="agreeToTerms"]');
      
      // Step 3: Submit registration
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation(),
      ]);
      
      // Step 4: Verify redirect to dashboard
      expect(page.url()).toContain('/dashboard');
      
      // Step 5: Upload a file
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/test.txt');
      
      await page.waitForSelector('.upload-progress', { timeout: 10000 });
      await page.waitForFunction(
        () => !document.querySelector('.upload-progress'),
        { timeout: 30000 }
      );
      
      // Step 6: Verify file appears in list
      await page.waitForSelector('.file-item');
      const fileName = await page.$eval('.file-item .file-name', el => el.textContent);
      expect(fileName).toContain('test.txt');
      
      // Step 7: Create a folder
      await page.click('button[aria-label="New Folder"]');
      await page.type('input[placeholder="Folder name"]', 'My Documents');
      await page.click('button:contains("Create")');
      
      await page.waitForSelector('.folder-item');
      
      // Step 8: Move file to folder
      await page.click('.file-item .checkbox');
      await page.click('button:contains("Move")');
      await page.click('.folder-select .folder-option:contains("My Documents")');
      await page.click('button:contains("Move Here")');
      
      // Step 9: Navigate to folder
      await page.click('.folder-item:contains("My Documents")');
      await page.waitForSelector('.file-item');
      
      // Step 10: Share file
      await page.click('.file-item .share-button');
      await page.type('input[placeholder="Enter email"]', 'friend@example.com');
      await page.click('button:contains("Share")');
      
      await page.waitForSelector('.toast-success');
      
      // Step 11: Navigate to settings
      await page.click('.user-menu');
      await page.click('a:contains("Settings")');
      await page.waitForNavigation();
      
      // Step 12: Update profile
      await page.type('input[name="name"]', 'Updated E2E User');
      await page.click('button:contains("Save Changes")');
      
      await page.waitForSelector('.toast-success');
      
      // Step 13: Logout
      await page.click('.user-menu');
      await page.click('button:contains("Logout")');
      await page.waitForNavigation();
      
      expect(page.url()).toContain('/login');
    });

    it('should handle subscription upgrade flow', async () => {
      // Login
      await page.click('a[href="/login"]');
      await page.waitForNavigation();
      
      await page.type('input[name="email"]', 'e2e@example.com');
      await page.type('input[name="password"]', 'Test123!');
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation(),
      ]);
      
      // Navigate to pricing
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      // Select Pro plan
      await page.click('.plan-card:contains("Professional") button:contains("Upgrade")');
      
      // Select payment method
      await page.click('.payment-method:contains("M-Pesa")');
      await page.type('input[placeholder="0712345678"]', '254712345678');
      await page.click('button:contains("Pay")');
      
      // Wait for STK Push prompt (simulated)
      await page.waitForSelector('.payment-processing');
      await page.waitForFunction(
        () => document.querySelector('.payment-success'),
        { timeout: 60000 }
      );
      
      // Verify subscription activated
      await page.click('a[href="/dashboard"]');
      await page.waitForNavigation();
      
      const planBadge = await page.$eval('.subscription-badge', el => el.textContent);
      expect(planBadge).toContain('Pro');
    });
  });

  describe('File Management Workflow', () => {
    beforeEach(async () => {
      // Login
      await page.click('a[href="/login"]');
      await page.waitForNavigation();
      
      await page.type('input[name="email"]', 'e2e@example.com');
      await page.type('input[name="password"]', 'Test123!');
      await Promise.all([
        page.click('button[type="submit"]'),
        page.waitForNavigation(),
      ]);
    });

    it('should search and filter files', async () => {
      // Upload multiple files
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile(
        './tests/fixtures/document.pdf',
        './tests/fixtures/image.jpg',
        './tests/fixtures/video.mp4'
      );
      
      await page.waitForFunction(
        () => document.querySelectorAll('.file-item').length === 3,
        { timeout: 30000 }
      );
      
      // Search by name
      await page.type('input[placeholder="Search files..."]', 'document');
      await page.waitForFunction(
        () => document.querySelectorAll('.file-item').length === 1,
        { timeout: 5000 }
      );
      
      // Filter by type
      await page.click('button:contains("Filter")');
      await page.click('button:contains("Images")');
      await page.waitForFunction(
        () => document.querySelectorAll('.file-item').length === 1,
        { timeout: 5000 }
      );
      
      // Clear filters
      await page.click('button:contains("Clear filters")');
      await page.waitForFunction(
        () => document.querySelectorAll('.file-item').length === 3,
        { timeout: 5000 }
      );
    });

    it('should star and organize files', async () => {
      // Star a file
      await page.click('.file-item:first-child .star-button');
      await page.waitForSelector('.file-item:first-child .starred');
      
      // Go to starred view
      await page.click('a[href="/dashboard?starred=true"]');
      await page.waitForFunction(
        () => document.querySelectorAll('.file-item').length === 1,
        { timeout: 5000 }
      );
      
      // Create folder and move starred file
      await page.click('button[aria-label="New Folder"]');
      await page.type('input[placeholder="Folder name"]', 'Starred Files');
      await page.click('button:contains("Create")');
      
      await page.click('.file-item .checkbox');
      await page.click('button:contains("Move")');
      await page.click('.folder-select .folder-option:contains("Starred Files")');
      await page.click('button:contains("Move Here")');
      
      // Navigate to folder
      await page.click('.folder-item:contains("Starred Files")');
      await page.waitForSelector('.file-item');
      
      expect(await page.$eval('.file-item', el => !!el)).toBe(true);
    });
  });
});