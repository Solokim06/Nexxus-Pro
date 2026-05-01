const puppeteer = require('puppeteer');
const mongoose = require('mongoose');
const User = require('../../models/User');

describe('Payment Flow E2E Tests', () => {
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
      name: 'Payment Test User',
      email: 'payment@example.com',
      password: 'Test123!',
      isEmailVerified: true,
      subscriptionPlan: 'free',
    });
    
    page = await browser.newPage();
    await page.goto('http://localhost:3000/login');
    
    await page.type('input[name="email"]', 'payment@example.com');
    await page.type('input[name="password"]', 'Test123!');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation(),
    ]);
  });

  afterEach(async () => {
    await page.close();
  });

  describe('M-Pesa Payment Flow', () => {
    it('should complete M-Pesa payment successfully', async () => {
      // Navigate to pricing
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      // Select Basic plan
      await page.click('.plan-card:contains("Basic") button:contains("Upgrade")');
      
      // Select M-Pesa
      await page.click('.payment-method:contains("M-Pesa")');
      
      // Enter phone number
      await page.type('input[placeholder="0712345678"]', '254712345678');
      
      // Submit payment
      await Promise.all([
        page.click('button:contains("Pay")'),
        page.waitForSelector('.payment-processing'),
      ]);
      
      // Wait for STK Push simulation
      await page.waitForFunction(
        () => document.querySelector('.payment-success'),
        { timeout: 60000 }
      );
      
      // Verify success message
      const successMessage = await page.$eval('.payment-success', el => el.textContent);
      expect(successMessage).toContain('Payment Successful');
      
      // Verify subscription upgraded
      await page.click('a[href="/dashboard"]');
      await page.waitForNavigation();
      
      const planBadge = await page.$eval('.subscription-badge', el => el.textContent);
      expect(planBadge).toContain('Basic');
    });

    it('should handle M-Pesa payment failure', async () => {
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      await page.click('.plan-card:contains("Basic") button:contains("Upgrade")');
      await page.click('.payment-method:contains("M-Pesa")');
      
      // Enter invalid phone number
      await page.type('input[placeholder="0712345678"]', '0000000000');
      await page.click('button:contains("Pay")');
      
      await page.waitForSelector('.payment-error');
      const errorMessage = await page.$eval('.payment-error', el => el.textContent);
      expect(errorMessage).toContain('Payment failed');
    });
  });

  describe('PayPal Payment Flow', () => {
    it('should complete PayPal payment successfully', async () => {
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      await page.click('.plan-card:contains("Pro") button:contains("Upgrade")');
      await page.click('.payment-method:contains("PayPal")');
      
      await page.click('button:contains("Pay with PayPal")');
      
      // Handle PayPal popup
      const newPagePromise = new Promise(resolve => 
        browser.once('targetcreated', target => resolve(target.page()))
      );
      
      const paypalPopup = await newPagePromise;
      await paypalPopup.waitForSelector('#email');
      
      // Fill PayPal login (test sandbox)
      await paypalPopup.type('#email', 'sb-username@example.com');
      await paypalPopup.type('#password', 'password123');
      await paypalPopup.click('#btnLogin');
      
      await paypalPopup.waitForSelector('#payment-submit-btn');
      await paypalPopup.click('#payment-submit-btn');
      
      // Return to main page
      await page.waitForSelector('.payment-success', { timeout: 30000 });
      
      const successMessage = await page.$eval('.payment-success', el => el.textContent);
      expect(successMessage).toContain('Payment Successful');
    });
  });

  describe('Bank Transfer Flow', () => {
    it('should complete bank transfer flow', async () => {
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      await page.click('.plan-card:contains("Basic") button:contains("Upgrade")');
      await page.click('.payment-method:contains("Bank Transfer")');
      
      // Get bank details
      const bankDetails = await page.$eval('.bank-details', el => el.textContent);
      expect(bankDetails).toContain('KCB Bank Kenya');
      
      // Generate reference
      const reference = await page.$eval('.reference-number', el => el.textContent);
      expect(reference).toMatch(/NXP-\d+/);
      
      // Upload receipt
      const fileInput = await page.$('input[type="file"]');
      await fileInput.uploadFile('./tests/fixtures/receipt.pdf');
      
      await page.click('button:contains("Submit Payment")');
      
      await page.waitForSelector('.payment-submitted');
      const confirmation = await page.$eval('.payment-submitted', el => el.textContent);
      expect(confirmation).toContain('Payment Submitted');
    });
  });

  describe('Subscription Management', () => {
    it('should cancel subscription', async () => {
      // First upgrade to paid plan
      await page.click('a[href="/pricing"]');
      await page.waitForNavigation();
      
      await page.click('.plan-card:contains("Basic") button:contains("Upgrade")');
      await page.click('.payment-method:contains("PayPal")');
      await page.click('button:contains("Pay with PayPal")');
      
      // Complete payment (simplified)
      await page.waitForSelector('.payment-success', { timeout: 30000 });
      
      // Navigate to subscription settings
      await page.click('.user-menu');
      await page.click('a:contains("Subscription")');
      await page.waitForNavigation();
      
      // Cancel subscription
      await page.click('button:contains("Cancel Subscription")');
      await page.select('select', 'too_expensive');
      await page.click('button:contains("Continue to Cancel")');
      await page.click('button:contains("Yes, Cancel Subscription")');
      
      await page.waitForSelector('.subscription-cancelled');
      const status = await page.$eval('.subscription-status', el => el.textContent);
      expect(status).toContain('Cancelled');
    });

    it('should change subscription plan', async () => {
      await page.click('.user-menu');
      await page.click('a:contains("Subscription")');
      await page.waitForNavigation();
      
      await page.click('button:contains("Change Plan")');
      await page.click('.plan-option:contains("Pro") button:contains("Switch")');
      
      // Handle prorated payment if needed
      if (await page.$('.prorated-payment')) {
        await page.click('.payment-method:contains("PayPal")');
        await page.click('button:contains("Pay")');
        await page.waitForSelector('.payment-success', { timeout: 30000 });
      }
      
      await page.waitForSelector('.plan-updated');
      const newPlan = await page.$eval('.current-plan', el => el.textContent);
      expect(newPlan).toContain('Pro');
    });
  });
});