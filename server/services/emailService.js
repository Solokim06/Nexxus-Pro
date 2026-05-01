const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    this.fromEmail = process.env.SMTP_FROM || 'noreply@nexxus-pro.com';
    this.fromName = process.env.SMTP_FROM_NAME || 'Nexxus-Pro';
    this.templateDir = path.join(__dirname, '../templates/emails');
  }
  
  async sendEmail({ to, subject, template, data, attachments = [] }) {
    try {
      const html = await this.renderTemplate(template, data);
      const text = this.stripHtml(html);
      
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject,
        text,
        html,
        attachments,
      };
      
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('Email send error:', error);
      throw error;
    }
  }
  
  async renderTemplate(templateName, data) {
    const templatePath = path.join(this.templateDir, `${templateName}.html`);
    
    if (!fs.existsSync(templatePath)) {
      return this.getFallbackTemplate(templateName, data);
    }
    
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateContent);
    return template(data);
  }
  
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
  
  getFallbackTemplate(templateName, data) {
    const templates = {
      'welcome': `
        <h1>Welcome to Nexxus-Pro, ${data.name}!</h1>
        <p>Thank you for joining Nexxus-Pro. We're excited to have you on board!</p>
        <p>Get started by uploading your first file or exploring our features.</p>
        <a href="${data.dashboardUrl}">Go to Dashboard</a>
      `,
      'email-verification': `
        <h1>Verify Your Email Address</h1>
        <p>Hello ${data.name},</p>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${data.verificationUrl}">Verify Email</a>
        <p>This link will expire in 24 hours.</p>
      `,
      'password-reset': `
        <h1>Reset Your Password</h1>
        <p>Hello ${data.name},</p>
        <p>We received a request to reset your password. Click the link below to create a new password:</p>
        <a href="${data.resetUrl}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      'password-changed': `
        <h1>Password Changed Successfully</h1>
        <p>Hello ${data.name},</p>
        <p>Your password has been changed successfully.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      `,
      'payment-success': `
        <h1>Payment Successful!</h1>
        <p>Hello ${data.name},</p>
        <p>Your payment of ${data.currency} ${data.amount} was successful.</p>
        <p>Your ${data.planName} plan is now active.</p>
        <p>Transaction ID: ${data.transactionId}</p>
        <a href="${data.invoiceUrl}">Download Invoice</a>
      `,
      'payment-failed': `
        <h1>Payment Failed</h1>
        <p>Hello ${data.name},</p>
        <p>Your payment of ${data.currency} ${data.amount} failed.</p>
        <p>Reason: ${data.reason}</p>
        <a href="${data.retryUrl}">Retry Payment</a>
      `,
      'subscription-activated': `
        <h1>Subscription Activated!</h1>
        <p>Hello ${data.name},</p>
        <p>Your ${data.planName} plan has been activated.</p>
        <p>Features included:</p>
        <ul>
          ${data.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
        <p>Next billing date: ${new Date(data.nextBillingDate).toLocaleDateString()}</p>
      `,
      'subscription-cancelled': `
        <h1>Subscription Cancelled</h1>
        <p>Hello ${data.name},</p>
        <p>Your ${data.planId} plan has been cancelled.</p>
        <p>You will have access until ${new Date(data.expiryDate).toLocaleDateString()}.</p>
        <p>We're sad to see you go! Please let us know how we can improve.</p>
      `,
      'subscription-renewal': `
        <h1>Subscription Renewal Reminder</h1>
        <p>Hello ${data.name},</p>
        <p>Your ${data.planId} plan will renew on ${new Date(data.expiryDate).toLocaleDateString()}.</p>
        <p>To avoid interruption, please ensure your payment method is up to date.</p>
        <a href="${data.billingUrl}">Manage Subscription</a>
      `,
      'subscription-expired': `
        <h1>Subscription Expired</h1>
        <p>Hello ${data.name},</p>
        <p>Your ${data.planId} plan has expired.</p>
        <p>You have been downgraded to the Free plan.</p>
        <a href="${data.upgradeUrl}">Upgrade Again</a>
      `,
      'invoice': `
        <h1>Invoice ${data.invoiceNumber}</h1>
        <p>Hello ${data.name},</p>
        <p>Please find your invoice attached.</p>
        <p>Amount: ${data.currency} ${data.amount}</p>
        <p>Date: ${new Date(data.date).toLocaleDateString()}</p>
      `,
      'file-shared': `
        <h1>File Shared With You</h1>
        <p>Hello,</p>
        <p>${data.sharerName} has shared a file with you: <strong>${data.fileName}</strong></p>
        <a href="${data.fileUrl}">View File</a>
        <p>This link will expire on ${new Date(data.expiresAt).toLocaleDateString()}</p>
      `,
      'folder-shared': `
        <h1>Folder Shared With You</h1>
        <p>Hello,</p>
        <p>${data.sharerName} has shared a folder with you: <strong>${data.folderName}</strong></p>
        <a href="${data.folderUrl}">View Folder</a>
        <p>This link will expire on ${new Date(data.expiresAt).toLocaleDateString()}</p>
      `,
      'merge-complete': `
        <h1>File Merge Complete</h1>
        <p>Hello ${data.name},</p>
        <p>Your merge job has completed successfully.</p>
        <p>Files merged: ${data.fileCount}</p>
        <p>Output format: ${data.outputFormat}</p>
        <a href="${data.downloadUrl}">Download Merged File</a>
      `,
      'storage-warning': `
        <h1>Storage Limit Warning</h1>
        <p>Hello ${data.name},</p>
        <p>You have used ${data.percentage}% of your storage limit.</p>
        <p>Used: ${data.used} / ${data.limit}</p>
        <a href="${data.upgradeUrl}">Upgrade for More Storage</a>
      `,
      'team-invite': `
        <h1>Team Invitation</h1>
        <p>Hello,</p>
        <p>${data.inviterName} has invited you to join their team on Nexxus-Pro.</p>
        <p>Role: ${data.role}</p>
        <a href="${data.inviteUrl}">Accept Invitation</a>
        <p>This invitation will expire in 7 days.</p>
      `,
    };
    
    return templates[templateName] || `<h1>${templateName}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`;
  }
  
  async sendWelcomeEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to Nexxus-Pro!',
      template: 'welcome',
      data: {
        name: user.name,
        dashboardUrl: `${process.env.CLIENT_URL}/dashboard`,
      },
    });
  }
  
  async sendVerificationEmail(user, token) {
    const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${token}`;
    return this.sendEmail({
      to: user.email,
      subject: 'Verify Your Email - Nexxus-Pro',
      template: 'email-verification',
      data: {
        name: user.name,
        verificationUrl,
      },
    });
  }
  
  async sendPasswordResetEmail(user, token) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
    return this.sendEmail({
      to: user.email,
      subject: 'Reset Your Password - Nexxus-Pro',
      template: 'password-reset',
      data: {
        name: user.name,
        resetUrl,
      },
    });
  }
  
  async sendPasswordChangedEmail(user) {
    return this.sendEmail({
      to: user.email,
      subject: 'Password Changed - Nexxus-Pro',
      template: 'password-changed',
      data: {
        name: user.name,
      },
    });
  }
  
  async sendPaymentSuccessEmail(user, payment) {
    return this.sendEmail({
      to: user.email,
      subject: 'Payment Successful - Nexxus-Pro',
      template: 'payment-success',
      data: {
        name: user.name,
        amount: payment.amount,
        currency: payment.currency,
        planName: payment.planId,
        transactionId: payment.transactionId,
        invoiceUrl: `${process.env.CLIENT_URL}/invoices/${payment._id}`,
      },
    });
  }
  
  async sendPaymentFailedEmail(user, payment, reason) {
    return this.sendEmail({
      to: user.email,
      subject: 'Payment Failed - Nexxus-Pro',
      template: 'payment-failed',
      data: {
        name: user.name,
        amount: payment.amount,
        currency: payment.currency,
        reason,
        retryUrl: `${process.env.CLIENT_URL}/pricing`,
      },
    });
  }
  
  async sendSubscriptionActivatedEmail(user, subscription) {
    const plan = this.getPlanDetails(subscription.planId);
    return this.sendEmail({
      to: user.email,
      subject: 'Subscription Activated - Nexxus-Pro',
      template: 'subscription-activated',
      data: {
        name: user.name,
        planName: plan.name,
        features: plan.features,
        nextBillingDate: subscription.endDate,
      },
    });
  }
  
  async sendSubscriptionCancelledEmail(user, subscription) {
    return this.sendEmail({
      to: user.email,
      subject: 'Subscription Cancelled - Nexxus-Pro',
      template: 'subscription-cancelled',
      data: {
        name: user.name,
        planId: subscription.planId,
        expiryDate: subscription.endDate,
      },
    });
  }
  
  async sendInvoiceEmail(user, invoice) {
    return this.sendEmail({
      to: user.email,
      subject: `Invoice ${invoice.number} - Nexxus-Pro`,
      template: 'invoice',
      data: {
        name: user.name,
        invoiceNumber: invoice.number,
        amount: invoice.amount,
        currency: invoice.currency,
        date: invoice.date,
      },
      attachments: [{
        filename: `invoice-${invoice.number}.pdf`,
        path: invoice.pdfPath,
      }],
    });
  }
  
  async sendFileSharedEmail(recipientEmail, sharerName, file, shareToken) {
    return this.sendEmail({
      to: recipientEmail,
      subject: `${sharerName} shared a file with you`,
      template: 'file-shared',
      data: {
        sharerName,
        fileName: file.name,
        fileUrl: `${process.env.CLIENT_URL}/shared/${shareToken}`,
        expiresAt: file.shareExpires,
      },
    });
  }
  
  async sendMergeCompleteEmail(user, mergeJob) {
    return this.sendEmail({
      to: user.email,
      subject: 'Your files have been merged',
      template: 'merge-complete',
      data: {
        name: user.name,
        fileCount: mergeJob.inputFiles.length,
        outputFormat: mergeJob.outputFormat,
        downloadUrl: `${process.env.CLIENT_URL}/merge/download/${mergeJob._id}`,
      },
    });
  }
  
  getPlanDetails(planId) {
    const plans = {
      basic: { name: 'Basic', features: ['10GB Storage', '50 Merges/month', 'Priority Support'] },
      pro: { name: 'Professional', features: ['100GB Storage', 'Unlimited Merges', '24/7 Support', 'API Access'] },
      enterprise: { name: 'Enterprise', features: ['1TB Storage', 'Unlimited Merges', 'Dedicated Support', 'SSO Integration'] },
    };
    return plans[planId] || plans.basic;
  }
  
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('Email service connected successfully');
      return true;
    } catch (error) {
      console.error('Email service connection failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();