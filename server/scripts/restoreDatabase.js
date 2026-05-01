const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const AdmZip = require('adm-zip');
const dotenv = require('dotenv');
const { promisify } = require('util');

const execPromise = promisify(exec);
const dotenvConfig = dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = console;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

class DatabaseRestore {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.dbUri = process.env.MONGODB_URI;
    this.dbName = this.extractDbName();
  }

  extractDbName() {
    const match = this.dbUri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'nexxus_pro';
  }

  async listBackups() {
    if (!fs.existsSync(this.backupDir)) {
      return [];
    }
    
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
    
    backups.sort((a, b) => b.createdAt - a.createdAt);
    return backups;
  }

  async selectBackup() {
    const backups = await this.listBackups();
    
    if (backups.length === 0) {
      logger.error('❌ No backups found');
      return null;
    }
    
    logger.log('\n📋 Available Backups:');
    logger.log('='.repeat(60));
    
    backups.forEach((backup, index) => {
      logger.log(`${index + 1}. ${backup.name}`);
      logger.log(`   Size: ${backup.formattedSize}`);
      logger.log(`   Date: ${backup.createdAt.toLocaleString()}`);
      logger.log('');
    });
    
    const choice = await question(`Select backup to restore (1-${backups.length}): `);
    const index = parseInt(choice) - 1;
    
    if (isNaN(index) || index < 0 || index >= backups.length) {
      logger.error('❌ Invalid selection');
      return null;
    }
    
    return backups[index];
  }

  async restoreGzBackup(backupPath) {
    logger.log(`🔄 Restoring from ${path.basename(backupPath)}...`);
    
    const command = `mongorestore --uri="${this.dbUri}" --archive="${backupPath}" --gzip --drop`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.warn(`Warning: ${stderr}`);
    }
    
    logger.log('✅ Database restored successfully!');
    return true;
  }

  async restoreZipBackup(backupPath) {
    logger.log(`🔄 Extracting ${path.basename(backupPath)}...`);
    
    const extractDir = path.join(this.backupDir, 'restore_temp');
    
    // Extract zip
    const zip = new AdmZip(backupPath);
    zip.extractAllTo(extractDir, true);
    
    // Find the extracted database dump
    const files = fs.readdirSync(extractDir);
    const dumpDir = files.find(f => fs.statSync(path.join(extractDir, f)).isDirectory());
    
    if (!dumpDir) {
      throw new Error('Invalid backup format: no dump directory found');
    }
    
    logger.log(`🔄 Restoring from ${dumpDir}...`);
    
    const command = `mongorestore --uri="${this.dbUri}" --drop "${path.join(extractDir, dumpDir)}"`;
    
    const { stdout, stderr } = await execPromise(command);
    
    if (stderr) {
      logger.warn(`Warning: ${stderr}`);
    }
    
    // Clean up
    fs.rmSync(extractDir, { recursive: true, force: true });
    
    logger.log('✅ Database restored successfully!');
    return true;
  }

  async restore(backupPath = null, force = false) {
    try {
      let backup;
      
      if (backupPath) {
        if (!fs.existsSync(backupPath)) {
          logger.error(`❌ Backup file not found: ${backupPath}`);
          return false;
        }
        backup = { path: backupPath, name: path.basename(backupPath) };
      } else {
        backup = await this.selectBackup();
        if (!backup) return false;
      }
      
      logger.log('\n⚠️  WARNING: This will overwrite your current database!');
      logger.log(`   Database: ${this.dbName}`);
      logger.log(`   Backup: ${backup.name}`);
      
      if (!force) {
        const confirm = await question('\nAre you sure you want to proceed? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
          logger.log('❌ Restore cancelled');
          return false;
        }
      }
      
      // Perform restore based on file extension
      if (backup.name.endsWith('.gz')) {
        await this.restoreGzBackup(backup.path);
      } else if (backup.name.endsWith('.zip')) {
        await this.restoreZipBackup(backup.path);
      } else {
        logger.error('❌ Unsupported backup format');
        return false;
      }
      
      logger.log('\n✅ Database restore completed successfully!');
      return true;
    } catch (error) {
      logger.error('❌ Restore failed:', error);
      return false;
    } finally {
      rl.close();
    }
  }

  async validateBackup(backupPath) {
    logger.log(`🔍 Validating backup: ${path.basename(backupPath)}...`);
    
    if (!fs.existsSync(backupPath)) {
      return { valid: false, error: 'File not found' };
    }
    
    const stats = fs.statSync(backupPath);
    if (stats.size === 0) {
      return { valid: false, error: 'Backup file is empty' };
    }
    
    // Check if it's a valid gzip file
    if (backupPath.endsWith('.gz')) {
      const buffer = fs.readFileSync(backupPath);
      if (buffer[0] !== 0x1F || buffer[1] !== 0x8B) {
        return { valid: false, error: 'Invalid gzip file' };
      }
    }
    
    // Check if it's a valid zip file
    if (backupPath.endsWith('.zip')) {
      try {
        const zip = new AdmZip(backupPath);
        const entries = zip.getEntries();
        if (entries.length === 0) {
          return { valid: false, error: 'Zip file is empty' };
        }
      } catch (error) {
        return { valid: false, error: 'Invalid zip file' };
      }
    }
    
    return {
      valid: true,
      size: stats.size,
      formattedSize: this.formatBytes(stats.size),
      createdAt: stats.birthtime,
    };
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
const backupFile = process.argv[3];
const force = process.argv[4] === '--force';

const restorer = new DatabaseRestore();

async function run() {
  if (command === 'validate' && backupFile) {
    const result = await restorer.validateBackup(backupFile);
    if (result.valid) {
      logger.log('✅ Backup is valid');
      logger.log(`   Size: ${result.formattedSize}`);
      logger.log(`   Created: ${result.createdAt?.toLocaleString() || 'Unknown'}`);
    } else {
      logger.error(`❌ Backup is invalid: ${result.error}`);
    }
  } else if (command === 'list') {
    const backups = await restorer.listBackups();
    if (backups.length === 0) {
      logger.log('No backups found');
    } else {
      logger.log('\n📋 Available Backups:');
      for (const backup of backups) {
        logger.log(`   ${backup.name}`);
        logger.log(`      Size: ${backup.formattedSize}`);
        logger.log(`      Date: ${backup.createdAt.toLocaleString()}`);
        logger.log('');
      }
    }
  } else {
    await restorer.restore(backupFile, force);
  }
}

if (require.main === module) {
  run().catch(console.error);
}

module.exports = DatabaseRestore;