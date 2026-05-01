const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Import models
const User = require('../models/User');
const File = require('../models/File');
const Folder = require('../models/Folder');
const Subscription = require('../models/Subscription');
const Payment = require('../models/Payment');

const logger = console;

// Seed data
const seedData = {
  users: [
    {
      name: 'Admin User',
      email: 'admin@nexxus-pro.com',
      password: 'Admin123!',
      role: 'admin',
      isEmailVerified: true,
      subscriptionPlan: 'enterprise',
    },
    {
      name: 'John Doe',
      email: 'john@example.com',
      password: 'John123!',
      role: 'user',
      isEmailVerified: true,
      subscriptionPlan: 'pro',
    },
    {
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'Jane123!',
      role: 'user',
      isEmailVerified: true,
      subscriptionPlan: 'basic',
    },
    {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test123!',
      role: 'user',
      isEmailVerified: false,
      subscriptionPlan: 'free',
    },
  ],
  
  folders: [
    { name: 'Documents', color: '#3B82F6' },
    { name: 'Images', color: '#10B981' },
    { name: 'Videos', color: '#EF4444' },
    { name: 'Music', color: '#F59E0B' },
    { name: 'Archives', color: '#8B5CF6' },
  ],
  
  subscriptions: [
    {
      planId: 'free',
      status: 'active',
      features: ['1 GB Storage', '5 Merges/month'],
      limits: { storage: 1073741824, merges: 5 },
    },
    {
      planId: 'basic',
      status: 'active',
      features: ['10 GB Storage', '50 Merges/month', 'Priority Support'],
      limits: { storage: 10737418240, merges: 50 },
    },
    {
      planId: 'pro',
      status: 'active',
      features: ['100 GB Storage', 'Unlimited Merges', '24/7 Support', 'API Access'],
      limits: { storage: 107374182400, merges: -1 },
    },
  ],
};

async function seedDatabase() {
  try {
    logger.log('🌱 Starting database seeding...');

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.log('✓ Connected to database');

    // Clear existing data (optional - comment out if you want to keep data)
    await User.deleteMany({});
    await Folder.deleteMany({});
    await Subscription.deleteMany({});
    await Payment.deleteMany({});
    await File.deleteMany({});
    logger.log('✓ Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of seedData.users) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await User.create({
        ...userData,
        password: hashedPassword,
      });
      createdUsers.push(user);
      logger.log(`✓ Created user: ${user.email} (${user.role})`);
    }

    // Create folders for each user
    for (const user of createdUsers) {
      for (const folderData of seedData.folders) {
        await Folder.create({
          ...folderData,
          userId: user._id,
        });
      }
      logger.log(`✓ Created folders for user: ${user.email}`);
    }

    // Create subscriptions
    for (const subData of seedData.subscriptions) {
      await Subscription.create(subData);
      logger.log(`✓ Created subscription: ${subData.planId}`);
    }

    logger.log('\n✅ Database seeding completed successfully!');
    logger.log('\n📋 Test Credentials:');
    logger.log('   Admin: admin@nexxus-pro.com / Admin123!');
    logger.log('   User: john@example.com / John123!');
    logger.log('   User: jane@example.com / Jane123!');
    logger.log('   Test: test@example.com / Test123!');

    process.exit(0);
  } catch (error) {
    logger.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;