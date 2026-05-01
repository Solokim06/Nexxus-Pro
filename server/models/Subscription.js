const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },
  
  // Plan details
  planId: {
    type: String,
    enum: ['free', 'basic', 'pro', 'enterprise'],
    required: true,
  },
  planName: String,
  
  // Status
  status: {
    type: String,
    enum: ['active', 'trialing', 'past_due', 'cancelled', 'expired', 'incomplete'],
    default: 'trialing',
    index: true,
  },
  
  // Dates
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: {
    type: Date,
    required: true,
  },
  trialEndsAt: Date,
  cancelledAt: Date,
  expiredAt: Date,
  
  // Billing
  billingCycle: {
    type: String,
    enum: ['month', 'year'],
    default: 'month',
  },
  amount: Number,
  currency: {
    type: String,
    default: 'USD',
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  
  // Features and limits
  features: [String],
  limits: {
    storage: { type: Number, default: 1073741824 }, // 1GB
    fileSize: { type: Number, default: 52428800 }, // 50MB
    merges: { type: Number, default: 5 },
    teamMembers: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 1000 },
  },
  
  // Usage tracking (denormalized)
  usage: {
    storageUsed: { type: Number, default: 0 },
    mergesUsed: { type: Number, default: 0 },
    apiCallsUsed: { type: Number, default: 0 },
    lastResetAt: { type: Date, default: Date.now },
  },
  
  // Payment provider info
  provider: {
    type: String,
    enum: ['mpesa', 'paypal', 'bank_transfer', 'none'],
  },
  providerSubscriptionId: String,
  providerCustomerId: String,
  
  // Cancellation
  cancelReason: String,
  cancelAtPeriodEnd: {
    type: Boolean,
    default: false,
  },
  
  // Invoices
  invoices: [{
    invoiceId: String,
    amount: Number,
    date: Date,
    url: String,
  }],
  
  // Metadata
  metadata: {
    type: Map,
    of: String,
  },
}, {
  timestamps: true,
});

// Indexes
subscriptionSchema.index({ userId: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ providerSubscriptionId: 1 });
subscriptionSchema.index({ endDate: 1 });

// Virtual for isActive
subscriptionSchema.virtual('isActive').get(function() {
  return this.status === 'active' && this.endDate > Date.now();
});

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
  if (!this.endDate) return 0;
  const days = Math.ceil((this.endDate - Date.now()) / (1000 * 60 * 60 * 24));
  return Math.max(0, days);
});

// Method to renew subscription
subscriptionSchema.methods.renew = async function() {
  const duration = this.billingCycle === 'year' ? 365 : 30;
  this.startDate = Date.now();
  this.endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
  this.status = 'active';
  this.cancelledAt = null;
  this.cancelAtPeriodEnd = false;
  await this.save();
};

// Method to cancel
subscriptionSchema.methods.cancel = async function(reason) {
  this.cancelAtPeriodEnd = true;
  this.cancelReason = reason;
  await this.save();
};

// Method to check if limit is reached
subscriptionSchema.methods.isLimitReached = function(limitType) {
  const limit = this.limits[limitType];
  if (limit === -1) return false; // Unlimited
  const used = this.usage[`${limitType}Used`] || 0;
  return used >= limit;
};

// Method to increment usage
subscriptionSchema.methods.incrementUsage = async function(limitType, amount = 1) {
  const field = `${limitType}Used`;
  this.usage[field] = (this.usage[field] || 0) + amount;
  await this.save();
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);
module.exports = Subscription;