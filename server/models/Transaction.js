const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  
  // Transaction type
  type: {
    type: String,
    enum: ['payment', 'refund', 'subscription', 'upgrade', 'downgrade', 'credit', 'debit'],
    required: true,
  },
  
  // Amount
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'USD',
  },
  balance: {
    type: Number,
    default: 0,
  },
  
  // Related entities
  paymentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  
  // Description
  description: String,
  reference: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

// Indexes
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ reference: 1 });
transactionSchema.index({ type: 1 });

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;