const crypto = require('crypto');
const bcrypt = require('bcryptjs');

class HashGenerator {
  // Generate SHA-256 hash
  sha256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Generate SHA-512 hash
  sha512(data) {
    return crypto.createHash('sha512').update(data).digest('hex');
  }

  // Generate MD5 hash (not for security, use for checksums only)
  md5(data) {
    return crypto.createHash('md5').update(data).digest('hex');
  }

  // Generate HMAC-SHA256
  hmacSha256(data, secret) {
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  // Generate HMAC-SHA512
  hmacSha512(data, secret) {
    return crypto.createHmac('sha512', secret).update(data).digest('hex');
  }

  // Hash password with bcrypt
  async hashPassword(password, saltRounds = 12) {
    return await bcrypt.hash(password, saltRounds);
  }

  // Verify password
  async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  // Generate file checksum (SHA-256)
  generateFileChecksum(fileBuffer) {
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  // Generate unique ID based on timestamp and random
  generateUniqueId(prefix = '') {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(8).toString('hex');
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
  }

  // Generate UUID v4
  generateUUID() {
    return crypto.randomUUID();
  }

  // Generate short ID (for URLs, share links, etc.)
  generateShortId(length = 8) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
  }

  // Generate hash from object
  hashObject(obj) {
    const str = JSON.stringify(obj);
    return this.sha256(str);
  }

  // Generate hash with salt
  hashWithSalt(data, salt) {
    return this.sha256(data + salt);
  }

  // Generate random salt
  generateSalt(length = 16) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate hash for API key
  hashApiKey(apiKey) {
    const salt = this.generateSalt();
    const hash = this.sha256(apiKey + salt);
    return { hash, salt };
  }

  // Verify API key
  verifyApiKey(apiKey, hash, salt) {
    const computedHash = this.sha256(apiKey + salt);
    return computedHash === hash;
  }

  // Generate hash for email verification
  generateEmailVerificationHash(email) {
    const salt = this.generateSalt();
    const hash = this.sha256(email + salt + process.env.EMAIL_VERIFICATION_SECRET);
    return { hash, salt };
  }

  // Generate hash for password reset
  generatePasswordResetHash(email, userId) {
    const salt = this.generateSalt();
    const hash = this.sha256(email + userId + salt + process.env.PASSWORD_RESET_SECRET);
    return { hash, salt };
  }

  // Generate Merkle tree root hash from array of items
  generateMerkleRoot(items) {
    if (!items.length) return null;
    
    let hashes = items.map(item => this.sha256(JSON.stringify(item)));
    
    while (hashes.length > 1) {
      const newHashes = [];
      for (let i = 0; i < hashes.length; i += 2) {
        if (i + 1 < hashes.length) {
          newHashes.push(this.sha256(hashes[i] + hashes[i + 1]));
        } else {
          newHashes.push(hashes[i]);
        }
      }
      hashes = newHashes;
    }
    
    return hashes[0];
  }

  // Generate hash chain (for blockchain-like verification)
  generateHashChain(data, length = 10) {
    const chain = [];
    let current = this.sha256(JSON.stringify(data));
    
    for (let i = 0; i < length; i++) {
      chain.push(current);
      current = this.sha256(current);
    }
    
    return chain;
  }

  // Verify hash chain
  verifyHashChain(originalHash, chain, index) {
    let current = originalHash;
    
    for (let i = 0; i <= index; i++) {
      if (current !== chain[i]) return false;
      current = this.sha256(current);
    }
    
    return true;
  }

  // Generate fingerprint for client
  generateClientFingerprint(userAgent, ip, acceptLanguage) {
    const data = `${userAgent}|${ip}|${acceptLanguage}`;
    return this.sha256(data);
  }

  // Generate device ID
  generateDeviceId(userAgent, platform, screenResolution) {
    const data = `${userAgent}|${platform}|${screenResolution}`;
    return this.sha256(data);
  }
}

module.exports = new HashGenerator();