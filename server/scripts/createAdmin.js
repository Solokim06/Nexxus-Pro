const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

const User = require('../models/User');
const Subscription = require('../models/Subscription');

const logger = console;

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => {
  rl.question(query, resolve);
});

async function createAdmin() {
  try {
    logger.log('👑 Creating admin user...\n');

    // Get admin details from user
    const name = await question('Enter admin name: ');
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 8 chars): ');
    const confirmPassword = await question('Confirm password: ');

    // Validate input
    if (!name || !email || !password) {
      logger.error('❌ All fields are required');
      process.exit(1);
    }

    if (password !== confirmPassword) {
      logger.error('❌ Passwords do not match');
      process.exit(1);
    }

    if (password.length < 8) {
      logger.error('❌ Password must be at least 8 characters');
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    logger.log('✓ Connected to database');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email });
    if (existingAdmin) {
      logger.error(`❌ User with email ${email} already exists`);
      process.exit(1);
    }

    // Create subscription for admin
    const subscription = await Subscription.create({
      planId: 'enterprise',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      features: [
        'Unlimited Storage',
        'Unlimited Merges',
        'Priority Support',
        'Admin Access',
        'All Features',
      ],
      limits: {
        storage: -1,
        merges: -1,
        fileSize: -1,
      },
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user
    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true,
      subscriptionPlan: 'enterprise',
      subscriptionId: subscription._id,
    });

    logger.log('\n✅ Admin user created successfully!');
    logger.log('\n📋 Admin Details:');
    logger.log(`   Name: ${admin.name}`);
    logger.log(`   Email: ${admin.email}`);
    logger.log(`   Role: ${admin.role}`);
    logger.log(`   Subscription: Enterprise`);

    // Optional: Create additional admin options
    const createAnother = await question('\nCreate another admin? (y/n): ');
    
    if (createAnother.toLowerCase() === 'y') {
      rl.close();
      await createAdmin();
    } else {
      logger.log('\n✓ Admin setup complete!');
      rl.close();
      process.exit(0);
    }
  } catch (error) {
    logger.error('❌ Failed to create admin:', error);
    process.exit(1);
  }
}

// Run script
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;