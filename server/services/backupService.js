const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const archiver = require('archiver');
const { v4: uuidv4 } = require('uuid');

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 10;
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async backupDatabase() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `database_${timestamp}.gz`;
    const backupPath = path.join(this.backupDir, backupName);
    
    const dbUri = process.env.MONGODB_URI;
    const dbName = dbUri.split('/').pop().split('?')[0];
    
    return new Promise((resolve, reject) => {
      exec(`mongodump --uri="${dbUri}" --archive="${backupPath}" --gzip`, (error) => {
        if (error) {
          reject(error);
        } else {
          const stats = fs.statSync(backupPath);
          resolve({
            type: 'database',
            name: backupName,
            path: backupPath,
            size: stats.size,
            createdAt: new Date(),
          });
        }
      });
    });
  }

  async backupFiles() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `files_${timestamp}.zip`;
    const backupPath = path.join(this.backupDir, backupName);
    
    const filesDir = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(backupPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        const stats = fs.statSync(backupPath);
        resolve({
          type: 'files',
          name: backupName,
          path: backupPath,
          size: stats.size,
          createdAt: new Date(),
        });
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(filesDir, false);
      archive.finalize();
    });
  }

  async backupAll() {
    const [dbBackup, filesBackup] = await Promise.all([
      this.backupDatabase(),
      this.backupFiles(),
    ]);
    
    // Create combined backup record
    const combinedBackup = {
      id: uuidv4(),
      type: 'full',
      createdAt: new Date(),
      components: [dbBackup, filesBackup],
      totalSize: dbBackup.size + filesBackup.size,
    };
    
    await this.saveBackupRecord(combinedBackup);
    await this.cleanupOldBackups();
    
    return combinedBackup;
  }

  async saveBackupRecord(backup) {
    const recordsPath = path.join(this.backupDir, 'backups.json');
    let records = [];
    
    if (fs.existsSync(recordsPath)) {
      records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    }
    
    records.push(backup);
    fs.writeFileSync(recordsPath, JSON.stringify(records, null, 2));
    
    return backup;
  }

  async getBackups() {
    const recordsPath = path.join(this.backupDir, 'backups.json');
    
    if (!fs.existsSync(recordsPath)) {
      return [];
    }
    
    const records = JSON.parse(fs.readFileSync(recordsPath, 'utf8'));
    return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async restoreBackup(backupId) {
    const backups = await this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    if (backup.type === 'full') {
      for (const component of backup.components) {
        await this.restoreComponent(component);
      }
    } else {
      await this.restoreComponent(backup);
    }
    
    return { success: true, restoredBackup: backup };
  }

  async restoreComponent(backup) {
    if (backup.type === 'database') {
      return this.restoreDatabase(backup.path);
    } else if (backup.type === 'files') {
      return this.restoreFiles(backup.path);
    }
  }

  async restoreDatabase(backupPath) {
    const dbUri = process.env.MONGODB_URI;
    
    return new Promise((resolve, reject) => {
      exec(`mongorestore --uri="${dbUri}" --archive="${backupPath}" --gzip --drop`, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve({ success: true, type: 'database' });
        }
      });
    });
  }

  async restoreFiles(backupPath) {
    const filesDir = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');
    const extractDir = path.join(this.backupDir, 'restore_temp', uuidv4());
    
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true });
    }
    
    return new Promise((resolve, reject) => {
      const extract = require('extract-zip');
      
      extract(backupPath, { dir: extractDir })
        .then(() => {
          // Copy files to actual storage location
          const copyRecursive = (src, dest) => {
            const entries = fs.readdirSync(src, { withFileTypes: true });
            
            for (const entry of entries) {
              const srcPath = path.join(src, entry.name);
              const destPath = path.join(dest, entry.name);
              
              if (entry.isDirectory()) {
                if (!fs.existsSync(destPath)) {
                  fs.mkdirSync(destPath, { recursive: true });
                }
                copyRecursive(srcPath, destPath);
              } else {
                fs.copyFileSync(srcPath, destPath);
              }
            }
          };
          
          copyRecursive(extractDir, filesDir);
          
          // Cleanup
          fs.rmSync(extractDir, { recursive: true, force: true });
          
          resolve({ success: true, type: 'files' });
        })
        .catch(reject);
    });
  }

  async cleanupOldBackups() {
    const backups = await this.getBackups();
    
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups);
      
      for (const backup of toDelete) {
        if (backup.type === 'full') {
          for (const component of backup.components) {
            if (fs.existsSync(component.path)) {
              fs.unlinkSync(component.path);
            }
          }
        } else {
          if (fs.existsSync(backup.path)) {
            fs.unlinkSync(backup.path);
          }
        }
      }
      
      // Update records file
      const remaining = backups.slice(0, this.maxBackups);
      const recordsPath = path.join(this.backupDir, 'backups.json');
      fs.writeFileSync(recordsPath, JSON.stringify(remaining, null, 2));
    }
  }

  async scheduleBackups() {
    // Schedule daily backup at 2 AM
    const schedule = require('node-schedule');
    
    schedule.scheduleJob('0 2 * * *', async () => {
      console.log('Starting scheduled backup...');
      try {
        const backup = await this.backupAll();
        console.log(`Scheduled backup completed: ${backup.id}`);
        
        // Send notification
        const { sendEmail } = require('./emailService');
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Backup Completed - Nexxus-Pro',
          template: 'backup-completed',
          data: {
            backupId: backup.id,
            size: backup.totalSize,
            date: backup.createdAt,
          },
        });
      } catch (error) {
        console.error('Scheduled backup failed:', error);
      }
    });
  }

  async getBackupSize() {
    const backups = await this.getBackups();
    let totalSize = 0;
    
    for (const backup of backups) {
      if (backup.type === 'full') {
        totalSize += backup.totalSize;
      } else {
        totalSize += backup.size;
      }
    }
    
    return totalSize;
  }

  async deleteBackup(backupId) {
    const backups = await this.getBackups();
    const backup = backups.find(b => b.id === backupId);
    
    if (!backup) {
      throw new Error('Backup not found');
    }
    
    if (backup.type === 'full') {
      for (const component of backup.components) {
        if (fs.existsSync(component.path)) {
          fs.unlinkSync(component.path);
        }
      }
    } else {
      if (fs.existsSync(backup.path)) {
        fs.unlinkSync(backup.path);
      }
    }
    
    const updatedBackups = backups.filter(b => b.id !== backupId);
    const recordsPath = path.join(this.backupDir, 'backups.json');
    fs.writeFileSync(recordsPath, JSON.stringify(updatedBackups, null, 2));
    
    return { success: true };
  }
}

module.exports = new BackupService();