// ==================== EMAIL TEMPLATES ====================

const templates = {
  // Welcome email
  welcome: (data) => ({
    subject: `Welcome to Nexxus-Pro, ${data.name}!`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Nexxus-Pro!</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Thank you for joining Nexxus-Pro! We're excited to have you on board.</p>
            <p>With Nexxus-Pro, you can:</p>
            <ul>
              <li>Upload and manage files securely</li>
              <li>Merge multiple files into one document</li>
              <li>Share files with team members</li>
              <li>Access your files from anywhere</li>
            </ul>
            <p>Get started by uploading your first file:</p>
            <p style="text-align: center;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
            <p>If you have any questions, feel free to contact our support team.</p>
            <p>Best regards,<br>The Nexxus-Pro Team</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
            <p><a href="${data.unsubscribeUrl}">Unsubscribe</a> | <a href="${data.privacyUrl}">Privacy Policy</a></p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Email verification
  emailVerification: (data) => ({
    subject: 'Verify Your Email Address - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verify Your Email</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Thank you for registering with Nexxus-Pro! Please verify your email address to complete your registration.</p>
            <p style="text-align: center;">
              <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <div class="warning">
              <p><strong>⚠️ This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with Nexxus-Pro, please ignore this email.</p>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><small>${data.verificationUrl}</small></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Password reset
  passwordReset: (data) => ({
    subject: 'Reset Your Password - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <p style="text-align: center;">
              <a href="${data.resetUrl}" class="button">Reset Password</a>
            </p>
            <div class="warning">
              <p><strong>⚠️ This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p><small>${data.resetUrl}</small></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Payment success
  paymentSuccess: (data) => ({
    subject: 'Payment Successful - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #10B981, #059669); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .details { background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Payment Successful!</h1>
          </div>
          <div class="content">
            <h2>Thank you, ${data.name}!</h2>
            <p>Your payment has been processed successfully.</p>
            <div class="details">
              <h3>Payment Details:</h3>
              <p><strong>Amount:</strong> ${data.currency} ${data.amount}</p>
              <p><strong>Plan:</strong> ${data.planName}</p>
              <p><strong>Transaction ID:</strong> ${data.transactionId}</p>
              <p><strong>Date:</strong> ${data.date}</p>
            </div>
            <p>Your subscription is now active. You can start using all the features of your ${data.planName} plan immediately.</p>
            <p style="text-align: center;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
            <p><a href="${data.invoiceUrl}">Download Invoice</a></p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Subscription activated
  subscriptionActivated: (data) => ({
    subject: `Your ${data.planName} Plan is Active - Nexxus-Pro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .features { background: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Activated! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Your <strong>${data.planName}</strong> plan is now active!</p>
            <div class="features">
              <h3>Features included:</h3>
              <ul>
                ${data.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
            <p><strong>Next billing date:</strong> ${new Date(data.nextBillingDate).toLocaleDateString()}</p>
            <p>You can manage your subscription settings at any time from your account dashboard.</p>
            <p style="text-align: center;">
              <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Subscription cancelled
  subscriptionCancelled: (data) => ({
    subject: 'Subscription Cancelled - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #EF4444, #DC2626); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Subscription Cancelled</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Your <strong>${data.planId}</strong> subscription has been cancelled.</p>
            <p>You will continue to have access to premium features until <strong>${new Date(data.expiryDate).toLocaleDateString()}</strong>.</p>
            <p>After this date, your account will be downgraded to the Free plan.</p>
            <p>We're sad to see you go! If you change your mind, you can reactivate your subscription at any time.</p>
            <p style="text-align: center;">
              <a href="${data.reactivateUrl}" class="button">Reactivate Subscription</a>
            </p>
            <p>We'd love to hear your feedback on how we can improve.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // File shared
  fileShared: (data) => ({
    subject: `${data.sharerName} shared a file with you - Nexxus-Pro`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #3B82F6, #8B5CF6); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📁 File Shared With You</h1>
          </div>
          <div class="content">
            <h2>Hello,</h2>
            <p><strong>${data.sharerName}</strong> has shared a file with you:</p>
            <p><strong>File:</strong> ${data.fileName}</p>
            <p><strong>Size:</strong> ${data.fileSize}</p>
            <p style="text-align: center;">
              <a href="${data.fileUrl}" class="button">View File</a>
            </p>
            <p><strong>This link will expire on:</strong> ${new Date(data.expiresAt).toLocaleDateString()}</p>
            <p>If you don't have a Nexxus-Pro account, you'll need to create one to access this file.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Merge complete
  mergeComplete: (data) => ({
    subject: 'Your File Merge is Complete - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #10B981, #059669); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Merge Complete! 🔄</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <p>Your file merge has been completed successfully!</p>
            <p><strong>Files merged:</strong> ${data.fileCount}</p>
            <p><strong>Output format:</strong> ${data.outputFormat.toUpperCase()}</p>
            <p><strong>Output size:</strong> ${data.outputSize}</p>
            <p style="text-align: center;">
              <a href="${data.downloadUrl}" class="button">Download Merged File</a>
            </p>
            <p>You can also find your merged file in the "Merges" section of your dashboard.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),

  // Storage warning
  storageWarning: (data) => ({
    subject: 'Storage Limit Warning - Nexxus-Pro',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #F59E0B, #D97706); color: white; border-radius: 10px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background: #3B82F6; color: white; text-decoration: none; border-radius: 5px; }
          .warning { background: #FEF3C7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; border-top: 1px solid #eee; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Storage Limit Warning</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.name},</h2>
            <div class="warning">
              <p>You have used <strong>${data.percentage}%</strong> of your storage limit!</p>
              <p><strong>Used:</strong> ${data.used} / ${data.limit}</p>
            </div>
            <p>You're running out of storage space. To avoid any interruption, please consider upgrading your plan or cleaning up old files.</p>
            <p style="text-align: center;">
              <a href="${data.upgradeUrl}" class="button">Upgrade Plan</a>
            </p>
            <p><a href="${data.manageUrl}">Manage Files</a> to free up space</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 Nexxus-Pro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  }),
};

// Helper function to get template
const getTemplate = (templateName, data) => {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Template ${templateName} not found`);
  }
  return template(data);
};

// Helper function to render template with data
const renderTemplate = (templateName, data) => {
  const template = getTemplate(templateName, data);
  return {
    subject: template.subject,
    html: template.html,
  };
};

module.exports = {
  templates,
  getTemplate,
  renderTemplate,
};