const crypto = require('crypto');
const jwt = require('jsonwebtoken');

class TokenGenerator {
  constructor() {
    this.secret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    this.refreshSecret = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(32).toString('hex');
  }

  // Generate random token (for password reset, email verification, etc.)
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate numeric code (for 2FA, SMS verification, etc.)
  generateNumericCode(length = 6) {
    return Math.random().toString().slice(2, 2 + length);
  }

  // Generate JWT access token
  generateAccessToken(userId, expiresIn = '24h') {
    return jwt.sign(
      { userId, type: 'access' },
      this.secret,
      { expiresIn }
    );
  }

  // Generate refresh token
  generateRefreshToken(userId, expiresIn = '7d') {
    return jwt.sign(
      { userId, type: 'refresh' },
      this.refreshSecret,
      { expiresIn }
    );
  }

  // Generate both tokens
  generateTokens(userId) {
    return {
      accessToken: this.generateAccessToken(userId),
      refreshToken: this.generateRefreshToken(userId),
    };
  }

  // Generate email verification token
  generateEmailVerificationToken() {
    return {
      token: this.generateRandomToken(32),
      expiresIn: 24 * 60 * 60 * 1000, // 24 hours
    };
  }

  // Generate password reset token
  generatePasswordResetToken() {
    return {
      token: this.generateRandomToken(32),
      expiresIn: 60 * 60 * 1000, // 1 hour
    };
  }

  // Generate API key
  generateApiKey(prefix = 'nxp') {
    const key = this.generateRandomToken(32);
    return `${prefix}_${key}`;
  }

  // Generate share token for file/folder sharing
  generateShareToken() {
    return {
      token: this.generateRandomToken(16),
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  // Generate invitation token
  generateInvitationToken() {
    return {
      token: this.generateRandomToken(32),
      expiresIn: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  // Generate session token
  generateSessionToken() {
    return this.generateRandomToken(64);
  }

  // Generate 2FA secret
  generateTwoFactorSecret() {
    return crypto.randomBytes(20).toString('hex');
  }

  // Generate backup codes for 2FA
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(this.generateNumericCode(8));
    }
    return codes;
  }

  // Verify access token
  verifyAccessToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (decoded.type !== 'access') {
        throw new Error('Invalid token type');
      }
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.refreshSecret);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  // Decode token without verification
  decodeToken(token) {
    return jwt.decode(token);
  }

  // Generate webhook secret
  generateWebhookSecret() {
    return this.generateRandomToken(64);
  }

  // Generate CSRF token
  generateCsrfToken() {
    return this.generateRandomToken(32);
  }

  // Generate OAuth state parameter
  generateOAuthState() {
    return this.generateRandomToken(32);
  }

  // Generate payment reference
  generatePaymentReference(prefix = 'PAY') {
    const timestamp = Date.now();
    const random = this.generateRandomToken(4).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  // Generate invoice number
  generateInvoiceNumber(prefix = 'INV') {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const random = this.generateRandomToken(4).toUpperCase();
    return `${prefix}-${year}${month}-${random}`;
  }

  // Generate transaction ID
  generateTransactionId(prefix = 'TXN') {
    const timestamp = Date.now();
    const random = this.generateRandomToken(6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }
}

module.exports = new TokenGenerator();