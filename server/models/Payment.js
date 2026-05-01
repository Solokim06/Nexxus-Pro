const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Payment details
  method: {
    type: String,
    enum: ['mpesa', 'paypal', 'bank_transfer', 'card', 'upgrade'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
  },
  
  // Plan information
  planId: {
    type: String,
    enum: ['basic', 'pro', 'enterprise'],
  },
  billingCycle: {
    type: String,
    enum: ['month', 'year'],
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true,
  },
  
  // Transaction IDs
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  providerTransactionId: String,
  orderId: String,
  checkoutRequestId: String,
  
  // Receipt
  receiptUrl: String,
  receiptNumber: String,
  
  // Timestamps
  completedAt: Date,
  refundedAt: Date,
  cancelledAt: Date,
  
  // Refund information
  refundAmount: Number,
  refundReason: String,
  refundRequested: {
    type: Boolean,
    default: false,
  },
  refundRequestedAt: Date,
  refundApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  
  // Payment provider data
  providerData: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Customer information
  customerDetails: {
    name: String,
    email: String,
    phone: String,
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },
  },
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Webhook data
  webhookData: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Error information
  error: String,
  errorCode: String,
}, {
  timestamps: true,
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ status: 1, createdAt: 1 });
paymentSchema.index({ checkoutRequestId: 1 });
paymentSchema.index({ orderId: 1 });

// Virtual for formatted amount
paymentSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Method to mark as completed
paymentSchema.methods.markCompleted = async function(transactionId, providerData) {
  this.status = 'completed';
  this.completedAt = Date.now();
  if (transactionId) this.transactionId = transactionId;
  if (providerData) this.providerData = providerData;
  await this.save();
};

// Method to mark as failed
paymentSchema.methods.markFailed = async function(error) {
  this.status = 'failed';
  this.error = error.message || error;
  await this.save();
};

// Method to request refund
paymentSchema.methods.requestRefund = async function(reason) {
  this.refundRequested = true;
  this.refundReason = reason;
  this.refundRequestedAt = Date.now();
  await this.save();
};

// Method to process refund
paymentSchema.methods.processRefund = async function(amount, adminId) {
  this.status = 'refunded';
  this.refundAmount = amount || this.amount;
  this.refundedAt = Date.now();
  this.refundApprovedBy = adminId;
  await this.save();
};

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;