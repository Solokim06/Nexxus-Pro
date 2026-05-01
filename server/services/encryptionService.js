const crypto = require('crypto');
const fs = require('fs');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.key = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
    this.keyBuffer = Buffer.from(this.key, 'hex');
  }
  
  encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }
  
  decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.keyBuffer,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  encryptFile(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.keyBuffer, iv);
      
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      
      // Write IV at the beginning of the file
      output.write(iv);
      
      input.pipe(cipher).pipe(output);
      
      output.on('finish', () => {
        resolve({
          path: outputPath,
          iv: iv.toString('hex'),
        });
      });
      
      output.on('error', reject);
      input.on('error', reject);
      cipher.on('error', reject);
    });
  }
  
  decryptFile(inputPath, outputPath, ivHex) {
    return new Promise((resolve, reject) => {
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.keyBuffer, iv);
      
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);
      
      input.pipe(decipher).pipe(output);
      
      output.on('finish', resolve);
      output.on('error', reject);
      input.on('error', reject);
      decipher.on('error', reject);
    });
  }
  
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }
  
  verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return verifyHash === hash;
  }
  
  generateRandomToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }
  
  generateApiKey() {
    return `nxp_${crypto.randomBytes(32).toString('hex')}`;
  }
  
  encryptObject(obj) {
    const jsonString = JSON.stringify(obj);
    return this.encrypt(jsonString);
  }
  
  decryptObject(encryptedData) {
    const decrypted = this.decrypt(encryptedData);
    return JSON.parse(decrypted);
  }
  
  hashFile(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }
}

module.exports = new EncryptionService();