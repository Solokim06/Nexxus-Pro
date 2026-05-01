const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Payment = require('../models/Payment');

class BankService {
  constructor() {
    this.bankDetails = {
      bankName: process.env.BANK_NAME || 'KCB Bank Kenya',
      accountName: process.env.BANK_ACCOUNT_NAME || 'Nexxus-Pro Ltd',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '1234567890',
      branch: process.env.BANK_BRANCH || 'Upper Hill, Nairobi',
      swiftCode: process.env.BANK_SWIFT_CODE || 'KCBLKENX',
      sortCode: process.env.BANK_SORT_CODE || '010000',
      iban: process.env.BANK_IBAN || '',
    };
  }
  
  generateReference() {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `NXP-${timestamp}-${random}`;
  }
  
  getBankDetails() {
    return {
      ...this.bankDetails,
      instructions: [
        'Transfer the exact amount to the bank account above',
        'Use the reference number as the transaction description',
        'Upload your payment receipt for verification',
        'Payment will be confirmed within 24-48 hours',
      ],
    };
  }
  
  async saveReceipt(receiptFile, reference) {
    const receiptDir = path.join(__dirname, '../../storage/receipts');
    if (!fs.existsSync(receiptDir)) {
      fs.mkdirSync(receiptDir, { recursive: true });
    }
    
    const ext = path.extname(receiptFile.originalname);
    const filename = `${reference}${ext}`;
    const filepath = path.join(receiptDir, filename);
    
    fs.renameSync(receiptFile.path, filepath);
    
    return {
      path: filepath,
      url: `${process.env.STORAGE_URL}/receipts/${filename}`,
    };
  }
  
  async verifyPayment(reference, amount, bankTransactionId) {
    // In production, this would call a bank API
    // For now, return manual verification required
    return {
      verified: false,
      requiresManualVerification: true,
      message: 'Payment requires manual verification',
    };
  }
  
  async getTransactionStatus(reference) {
    const payment = await Payment.findOne({ transactionId: reference });
    if (!payment) {
      return { status: 'not_found' };
    }
    
    return {
      status: payment.status,
      amount: payment.amount,
      submittedAt: payment.submittedAt,
      completedAt: payment.completedAt,
      notes: payment.verificationNotes,
    };
  }
  
  validateReceipt(receiptFile) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!allowedTypes.includes(receiptFile.mimetype)) {
      throw new Error('Receipt must be PDF, JPEG, or PNG');
    }
    
    if (receiptFile.size > maxSize) {
      throw new Error('Receipt file too large (max 5MB)');
    }
    
    return true;
  }
}

module.exports = new BankService();