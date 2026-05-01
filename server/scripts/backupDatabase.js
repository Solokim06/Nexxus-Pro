const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const archiver = require('archiver');
const { promisify } = require('util');

const execPromise = promisify(exec);
const dotenvConfig = dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = console;

class DatabaseBackup {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.dbUri = process.env.MONGODB_URI;
    this.dbName = this.extractDbName();
  }

  extractDbName() {
    // Extract database name from MongoDB URI
    const match = this.dbUri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'nexxus_pro';
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createBackup() {
    try {
      this.ensureBackupDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${this.dbName}_${timestamp}`;
      const backupPath = path.join(this.backupDir, `${backupName}.gz`);
      
      logger.log(`🔄 Starting database backup...`);
      logger.log(`   Database: ${this.dbName}`);
      logger.log(`   Backup path: ${backupPath}`);
      
      // Create backup using mongodump
      const command = `mongodump --uri="${this.dbUri}" --archive="${backupPath}" --gzip`;
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr) {
        logger.warn(`Warning: ${stderr}`);
      }
      
      const stats = fs.statSync(backupPath);
      logger.log(`✅ Backup created successfully!`);
      logger.log(`   File: ${backupName}.gz`);
      logger.log(`   Size: ${this.formatBytes(stats.size)}`);
      logger.log(`   Path: ${backupPath}`);
      
      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('❌ Backup failed:', error);
      throw error;
    }
  }

  async createCompressedBackup() {
    try {
      this.ensureBackupDir();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup_${this.dbName}_${timestamp}`;
      const tempDir = path.join(this.backupDir, `temp_${timestamp}`);
      const backupPath = path.join(this.backupDir, `${backupName}.zip`);
      
      fs.mkdirSync(tempDir, { recursive: true });
      
      logger.log(`🔄 Creating compressed backup...`);
      
      // Create backup to temp directory
      const command = `mongodump --uri="${this.dbUri}" --out="${tempDir}"`;
      await execPromise(command);
      
      // Create zip archive
      await this.createZipArchive(tempDir, backupPath);
      
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      const stats = fs.statSync(backupPath);
      logger.log(`✅ Compressed backup created!`);
      logger.log(`   File: ${backupName}.zip`);
      logger.log(`   Size: ${this.formatBytes(stats.size)}`);
      
      return {
        name: backupName,
        path: backupPath,
        size: stats.size,
        timestamp: new Date(),
      };
    } catch (error) {
      logger.error('❌ Compressed backup failed:', error);
      throw error;
    }
  }

  createZipArchive(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', resolve);
      archive.on('error', reject);
      
      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async listBackups() {
    this.ensureBackupDir();
    
    const files = fs.readdirSync(this.backupDir);
    const backups = [];
    
    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      
      if (file.startsWith('backup_') && (file.endsWith('.gz') || file.endsWith('.zip'))) {
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          formattedSize: this.formatBytes(stats.size),
          createdAt: stats.birthtime,
        });
      }
    }
    
    // Sort by date (newest first)
    backups.sort((a, b) => b.createdAt - a.createdAt);
    
    return backups;
  }

  async cleanupOldBackups(maxBackups = 10) {
    const backups = await this.listBackups();
    
    if (backups.length <= maxBackups) {
      logger.log(`✓ No cleanup needed. ${backups.length} backups (limit: ${maxBackups})`);
      return;
    }
    
    const toDelete = backups.slice(maxBackups);
    let deletedCount = 0;
    
    for (const backup of toDelete) {
      fs.unlinkSync(backup.path);
      deletedCount++;
      logger.log(`   Deleted: ${backup.name}`);
    }
    
    logger.log(`✅ Cleaned up ${deletedCount} old backups`);
  }

  async showBackupInfo() {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      logger.log('No backups found');
      return;
    }
    
    logger.log('\n📋 Available Backups:');
    logger.log('='.repeat(80));
    
    let totalSize = 0;
    for (const backup of backups) {
      logger.log(`   ${backup.name}`);
      logger.log(`      Size: ${backup.formattedSize}`);
      logger.log(`      Date: ${backup.createdAt.toLocaleString()}`);
      logger.log(`      Path: ${backup.path}`);
      logger.log('');
      totalSize += backup.size;
    }
    
    logger.log(`📊 Summary:`);
    logger.log(`   Total backups: ${backups.length}`);
    logger.log(`   Total size: ${this.formatBytes(totalSize)}`);
    logger.log(`   Backup directory: ${this.backupDir}`);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// CLI arguments
const command = process.argv[2];
const backup = new DatabaseBackup();

async function run() {
  switch (command) {
    case 'create':
      await backup.createBackup();
      break;
    case 'compress':
      await backup.createCompressedBackup();
      break;
    case 'list':
      await backup.showBackupInfo();
      break;
    case 'cleanup':
      const maxBackups = parseInt(process.argv[3]) || 10;
      await backup.cleanupOldBackups(maxBackups);
      break;
    default:
      logger.log(`
Usage: node backupDatabase.js [command]

Commands:
  create    - Create a standard backup (.gz)
  compress  - Create a compressed backup (.zip)
  list      - List all backups
  cleanup [n] - Delete old backups keeping last n (default 10)

Examples:
  node backupDatabase.js create
  node backupDatabase.js compress
  node backupDatabase.js list
  node backupDatabase.js cleanup 5
      `);
  }
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = DatabaseBackup;