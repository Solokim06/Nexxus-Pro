const fs = require('fs');
const crypto = require('crypto');
const clamd = require('clamdjs');

class VirusScanService {
  constructor() {
    this.scanner = null;
    this.virusSignatures = this.loadVirusSignatures();
    
    // Initialize ClamAV if available
    if (process.env.CLAMAV_HOST && process.env.CLAMAV_PORT) {
      this.scanner = clamd.createScanner(
        process.env.CLAMAV_HOST,
        parseInt(process.env.CLAMAV_PORT)
      );
    }
  }

  loadVirusSignatures() {
    // Simple signature database for basic detection
    // In production, use ClamAV or similar
    return [
      { pattern: /EICAR/, name: 'EICAR Test Virus' },
      { pattern: /X5O!P%@AP[4\\PZX54\(P^\)7CC\)7\$EICAR/, name: 'EICAR Test String' },
      // Add more signatures as needed
    ];
  }

  async scanFile(filePath) {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error('File not found');
    }

    // Method 1: Use ClamAV if available
    if (this.scanner) {
      try {
        const result = await this.scanner.scanFile(filePath);
        if (result.includes('FOUND')) {
          const virusName = result.split(':')[1].trim();
          return { isInfected: true, virusName, scanner: 'ClamAV' };
        }
        return { isInfected: false, scanner: 'ClamAV' };
      } catch (error) {
        console.error('ClamAV scan failed:', error);
        // Fallback to signature scanning
        return this.signatureScan(filePath);
      }
    }

    // Method 2: Signature-based scanning
    return this.signatureScan(filePath);
  }

  async signatureScan(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    for (const signature of this.virusSignatures) {
      if (signature.pattern.test(fileContent)) {
        return { 
          isInfected: true, 
          virusName: signature.name,
          scanner: 'Signature',
        };
      }
    }
    
    // Check for suspicious file extensions
    const ext = filePath.split('.').pop().toLowerCase();
    const suspiciousExts = ['exe', 'bat', 'cmd', 'scr', 'vbs', 'js', 'jar'];
    if (suspiciousExts.includes(ext)) {
      return {
        isInfected: true,
        virusName: 'Suspicious File Extension',
        scanner: 'Signature',
      };
    }
    
    return { isInfected: false, scanner: 'Signature' };
  }

  async scanBuffer(buffer, fileName = 'unknown') {
    const tempPath = `/tmp/scan_${crypto.randomBytes(16).toString('hex')}`;
    fs.writeFileSync(tempPath, buffer);
    
    try {
      const result = await this.scanFile(tempPath);
      return result;
    } finally {
      fs.unlinkSync(tempPath);
    }
  }

  async scanMultipleFiles(filePaths) {
    const results = [];
    
    for (const filePath of filePaths) {
      const result = await this.scanFile(filePath);
      results.push({
        file: filePath,
        ...result,
      });
    }
    
    return {
      total: results.length,
      infected: results.filter(r => r.isInfected).length,
      clean: results.filter(r => !r.isInfected).length,
      results,
    };
  }

  async getVirusDatabaseVersion() {
    if (this.scanner) {
      try {
        const version = await this.scanner.version();
        return version;
      } catch (error) {
        console.error('Failed to get ClamAV version:', error);
        return 'Unknown';
      }
    }
    return 'Signature-based (basic)';
  }

  async updateVirusDatabase() {
    if (this.scanner) {
      try {
        await this.scanner.reload();
        return { success: true, message: 'Database reloaded' };
      } catch (error) {
        console.error('Failed to update virus database:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, message: 'ClamAV not configured' };
  }

  async isSafeFile(filePath) {
    const result = await this.scanFile(filePath);
    return !result.isInfected;
  }

  async getFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Check against known malware hash databases
  async checkAgainstHashDatabase(filePath) {
    const fileHash = await this.getFileHash(filePath);
    
    // In production, check against VirusTotal API or similar
    // This is a placeholder
    const knownMaliciousHashes = []; // Load from database
    
    if (knownMaliciousHashes.includes(fileHash)) {
      return { isMalicious: true, source: 'HashDatabase' };
    }
    
    return { isMalicious: false };
  }
}

module.exports = new VirusScanService();