const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class Mailer {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.templateCache = {};
  }

  configure() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.warn('SMTP credentials not configured');
      return false;
    }

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    this.isConfigured = true;
    logger.info('Mailer configured');
    return true;
  }

  async sendEmail(options) {
    if (!this.isConfigured) {
      logger.warn('Mailer not configured, skipping email send');
      return null;
    }

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'Nexxus-Pro'}" <${process.env.SMTP_FROM || 'noreply@nexxus-pro.com'}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments || [],
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId} to ${options.to}`);
      return info;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendTemplate(email, templateName, data) {
    const template = this.getTemplate(templateName);
    const html = template(data);
    
    return this.sendEmail({
      to: email,
      subject: data.subject || 'Nexxus-Pro Notification',
      html,
    });
  }

  getTemplate(templateName) {
    if (this.templateCache[templateName]) {
      return this.templateCache[templateName];
    }

    const templatePath = path.join(__dirname, '../templates/emails', `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template ${templateName} not found`);
    }

    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);
    this.templateCache[templateName] = template;
    
    return template;
  }

  async sendWelcomeEmail(user) {
    return this.sendTemplate(user.email, 'welcome', {
      name: user.name,
      subject: 'Welcome to Nexxus-Pro!',
      dashboardUrl: `${process.env.CLIENT_URL}/dashboard`,
      unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
      privacyUrl: `${process.env.CLIENT_URL}/privacy`,
    });
  }

  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    
    return this.sendTemplate(user.email, 'email-verification', {
      name: user.name,
      subject: 'Verify Your Email - Nexxus-Pro',
      verificationUrl,
    });
  }

  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    
    return this.sendTemplate(user.email, 'password-reset', {
      name: user.name,
      subject: 'Reset Your Password - Nexxus-Pro',
      resetUrl,
    });
  }

  async sendPasswordChangedEmail(user) {
    return this.sendTemplate(user.email, 'password-changed', {
      name: user.name,
      subject: 'Password Changed - Nexxus-Pro',
      loginUrl: `${process.env.CLIENT_URL}/login`,
    });
  }

  async sendPaymentSuccessEmail(user, payment) {
    return this.sendTemplate(user.email, 'payment-success', {
      name: user.name,
      subject: 'Payment Successful - Nexxus-Pro',
      amount: payment.amount,
      currency: payment.currency,
      planName: payment.planId,
      transactionId: payment.transactionId,
      date: new Date().toLocaleDateString(),
      dashboardUrl: `${process.env.CLIENT_URL}/dashboard`,
      invoiceUrl: `${process.env.CLIENT_URL}/invoices/${payment._id}`,
    });
  }

  async sendPaymentFailedEmail(user, payment, reason) {
    return this.sendTemplate(user.email, 'payment-failed', {
      name: user.name,
      subject: 'Payment Failed - Nexxus-Pro',
      amount: payment.amount,
      currency: payment.currency,
      reason,
      retryUrl: `${process.env.CLIENT_URL}/pricing`,
    });
  }

  async sendSubscriptionActivatedEmail(user, subscription) {
    return this.sendTemplate(user.email, 'subscription-activated', {
      name: user.name,
      subject: `Your ${subscription.planId} Plan is Active - Nexxus-Pro`,
      planName: subscription.planId,
      features: subscription.features,
      nextBillingDate: subscription.endDate,
      dashboardUrl: `${process.env.CLIENT_URL}/dashboard`,
    });
  }

  async sendSubscriptionCancelledEmail(user, subscription) {
    return this.sendTemplate(user.email, 'subscription-cancelled', {
      name: user.name,
      subject: 'Subscription Cancelled - Nexxus-Pro',
      planId: subscription.planId,
      expiryDate: subscription.endDate,
      reactivateUrl: `${process.env.CLIENT_URL}/pricing`,
    });
  }

  async sendFileSharedEmail(recipient, sharerName, file, shareToken) {
    return this.sendTemplate(recipient, 'file-shared', {
      sharerName,
      fileName: file.name,
      fileSize: this.formatBytes(file.size),
      fileUrl: `${process.env.CLIENT_URL}/shared/${shareToken}`,
      expiresAt: file.shareExpires,
    });
  }

  async sendMergeCompleteEmail(user, mergeJob) {
    return this.sendTemplate(user.email, 'merge-complete', {
      name: user.name,
      subject: 'Your File Merge is Complete - Nexxus-Pro',
      fileCount: mergeJob.inputFiles.length,
      outputFormat: mergeJob.outputFormat,
      outputSize: this.formatBytes(mergeJob.outputSize),
      downloadUrl: `${process.env.CLIENT_URL}/merge/download/${mergeJob._id}`,
    });
  }

  async sendStorageWarningEmail(user, usage) {
    return this.sendTemplate(user.email, 'storage-warning', {
      name: user.name,
      subject: 'Storage Limit Warning - Nexxus-Pro',
      percentage: usage.percentage.toFixed(1),
      used: this.formatBytes(usage.used),
      limit: this.formatBytes(usage.limit),
      upgradeUrl: `${process.env.CLIENT_URL}/pricing`,
      manageUrl: `${process.env.CLIENT_URL}/dashboard`,
    });
  }

  async sendInvoiceEmail(user, invoice) {
    return this.sendTemplate(user.email, 'invoice', {
      name: user.name,
      subject: `Invoice ${invoice.number} - Nexxus-Pro`,
      invoiceNumber: invoice.number,
      amount: invoice.amount,
      currency: invoice.currency,
      date: invoice.date,
    });
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async verifyConnection() {
    if (!this.isConfigured) {
      return { configured: false };
    }
    
    try {
      await this.transporter.verify();
      return { configured: true, verified: true };
    } catch (error) {
      return { configured: true, verified: false, error: error.message };
    }
  }
}

module.exports = new Mailer();