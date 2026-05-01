const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const logger = console;

// Migration versions
const migrations = [
  {
    version: 1,
    name: 'Add indexes for performance',
    up: async () => {
      logger.log('Running migration 001: Adding indexes...');
      
      const User = require('../models/User');
      const File = require('../models/File');
      const Folder = require('../models/Folder');
      
      await User.collection.createIndex({ email: 1 }, { unique: true });
      await User.collection.createIndex({ phone: 1 }, { unique: true, sparse: true });
      await File.collection.createIndex({ userId: 1, folderId: 1 });
      await File.collection.createIndex({ name: 'text' });
      await Folder.collection.createIndex({ userId: 1, parentId: 1 });
      
      logger.log('✓ Migration 001 completed');
    },
    down: async () => {
      logger.log('Rolling back migration 001...');
      // Drop indexes if needed
      logger.log('✓ Rollback 001 completed');
    },
  },
  {
    version: 2,
    name: 'Add email verification tokens',
    up: async () => {
      logger.log('Running migration 002: Adding email verification tokens...');
      
      const User = require('../models/User');
      
      // Add fields to existing users
      await User.updateMany(
        { emailVerificationToken: { $exists: false } },
        { $set: { emailVerificationToken: null, emailVerificationExpires: null } }
      );
      
      logger.log('✓ Migration 002 completed');
    },
    down: async () => {
      logger.log('Rolling back migration 002...');
      const User = require('../models/User');
      await User.updateMany(
        {},
        { $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } }
      );
      logger.log('✓ Rollback 002 completed');
    },
  },
  {
    version: 3,
    name: 'Add subscription fields',
    up: async () => {
      logger.log('Running migration 003: Adding subscription fields...');
      
      const User = require('../models/User');
      const Subscription = require('../models/Subscription');
      
      // Add subscription fields to users
      await User.updateMany(
        { subscriptionPlan: { $exists: false } },
        { $set: { subscriptionPlan: 'free' } }
      );
      
      // Create subscription records for existing users
      const users = await User.find({ subscriptionId: { $exists: false } });
      for (const user of users) {
        const subscription = await Subscription.create({
          userId: user._id,
          planId: user.subscriptionPlan || 'free',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          features: [],
          limits: {},
        });
        
        user.subscriptionId = subscription._id;
        await user.save();
      }
      
      logger.log('✓ Migration 003 completed');
    },
    down: async () => {
      logger.log('Rolling back migration 003...');
      const User = require('../models/User');
      const Subscription = require('../models/Subscription');
      
      await User.updateMany({}, { $unset: { subscriptionPlan: 1, subscriptionId: 1 } });
      await Subscription.deleteMany({});
      logger.log('✓ Rollback 003 completed');
    },
  },
  {
    version: 4,
    name: 'Add file metadata fields',
    up: async () => {
      logger.log('Running migration 004: Adding file metadata fields...');
      
      const File = require('../models/File');
      
      await File.updateMany(
        { metadata: { $exists: false } },
        { $set: { metadata: {}, isStarred: false, downloadCount: 0 } }
      );
      
      logger.log('✓ Migration 004 completed');
    },
    down: async () => {
      logger.log('Rolling back migration 004...');
      const File = require('../models/File');
      await File.updateMany(
        {},
        { $unset: { metadata: 1, isStarred: 1, downloadCount: 1 } }
      );
      logger.log('✓ Rollback 004 completed');
    },
  },
  {
    version: 5,
    name: 'Add soft delete fields',
    up: async () => {
      logger.log('Running migration 005: Adding soft delete fields...');
      
      const File = require('../models/File');
      const Folder = require('../models/Folder');
      const User = require('../models/User');
      
      await File.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false } }
      );
      
      await Folder.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false } }
      );
      
      await User.updateMany(
        { isDeleted: { $exists: false } },
        { $set: { isDeleted: false } }
      );
      
      logger.log('✓ Migration 005 completed');
    },
    down: async () => {
      logger.log('Rolling back migration 005...');
      const File = require('../models/File');
      const Folder = require('../models/Folder');
      const User = require('../models/User');
      
      await File.updateMany({}, { $unset: { isDeleted: 1, deletedAt: 1 } });
      await Folder.updateMany({}, { $unset: { isDeleted: 1, deletedAt: 1 } });
      await User.updateMany({}, { $unset: { isDeleted: 1, deletedAt: 1 } });
      logger.log('✓ Rollback 005 completed');
    },
  },
];

class Migrator {
  constructor() {
    this.currentVersion = 0;
  }

  async getCurrentVersion() {
    const Migration = require('../models/Migration');
    const lastMigration = await Migration.findOne().sort({ version: -1 });
    return lastMigration ? lastMigration.version : 0;
  }

  async saveMigration(version, name, status) {
    const Migration = require('../models/Migration');
    await Migration.create({
      version,
      name,
      status,
      executedAt: new Date(),
    });
  }

  async migrate() {
    try {
      logger.log('🔄 Starting database migration...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      logger.log('✓ Connected to database');
      
      this.currentVersion = await this.getCurrentVersion();
      logger.log(`Current database version: ${this.currentVersion}`);
      
      const pendingMigrations = migrations.filter(m => m.version > this.currentVersion);
      
      if (pendingMigrations.length === 0) {
        logger.log('✓ Database is up to date');
        process.exit(0);
      }
      
      logger.log(`Found ${pendingMigrations.length} pending migrations`);
      
      for (const migration of pendingMigrations) {
        logger.log(`\n📦 Running migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.up();
          await this.saveMigration(migration.version, migration.name, 'completed');
          logger.log(`✓ Migration ${migration.version} completed`);
        } catch (error) {
          logger.error(`❌ Migration ${migration.version} failed:`, error);
          await this.saveMigration(migration.version, migration.name, 'failed');
          process.exit(1);
        }
      }
      
      logger.log('\n✅ Database migration completed successfully!');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Migration failed:', error);
      process.exit(1);
    }
  }

  async rollback(steps = 1) {
    try {
      logger.log('🔄 Rolling back migrations...');
      
      await mongoose.connect(process.env.MONGODB_URI);
      logger.log('✓ Connected to database');
      
      this.currentVersion = await this.getCurrentVersion();
      
      const migrationsToRollback = migrations
        .filter(m => m.version <= this.currentVersion)
        .slice(-steps)
        .reverse();
      
      if (migrationsToRollback.length === 0) {
        logger.log('✓ No migrations to rollback');
        process.exit(0);
      }
      
      for (const migration of migrationsToRollback) {
        logger.log(`\n📦 Rolling back migration ${migration.version}: ${migration.name}`);
        
        try {
          await migration.down();
          logger.log(`✓ Rollback ${migration.version} completed`);
        } catch (error) {
          logger.error(`❌ Rollback ${migration.version} failed:`, error);
          process.exit(1);
        }
      }
      
      logger.log('\n✅ Rollback completed successfully!');
      process.exit(0);
    } catch (error) {
      logger.error('❌ Rollback failed:', error);
      process.exit(1);
    }
  }
}

// CLI arguments
const command = process.argv[2];
const migrator = new Migrator();

if (command === 'rollback') {
  const steps = parseInt(process.argv[3]) || 1;
  migrator.rollback(steps);
} else {
  migrator.migrate();
}

module.exports = migrator;