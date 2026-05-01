import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  const lastUpdated = 'January 1, 2024';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Last updated: {lastUpdated}
            </p>

            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h2>1. Information We Collect</h2>
              <p>
                We collect information to provide better services to our users. The types of information we collect include:
              </p>
              <ul>
                <li><strong>Account Information:</strong> Name, email address, phone number, and payment information</li>
                <li><strong>Usage Data:</strong> Files uploaded, merge operations, and feature usage</li>
                <li><strong>Device Information:</strong> IP address, browser type, and operating system</li>
                <li><strong>Cookies:</strong> We use cookies to improve your experience</li>
              </ul>

              <h2>2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul>
                <li>Provide, maintain, and improve our services</li>
                <li>Process your payments and manage your subscription</li>
                <li>Send you technical notices and support messages</li>
                <li>Respond to your comments and questions</li>
                <li>Monitor and analyze usage patterns</li>
                <li>Detect and prevent fraud</li>
              </ul>

              <h2>3. Data Storage and Security</h2>
              <p>
                We take data security seriously. Your files are encrypted both in transit and at rest. We use industry-standard 
                security measures to protect your data from unauthorized access.
              </p>
              <ul>
                <li>Files are encrypted using AES-256 encryption</li>
                <li>All data transmitted over TLS/SSL</li>
                <li>Regular security audits and penetration testing</li>
                <li>Access controls and authentication measures</li>
              </ul>

              <h2>4. Data Sharing and Disclosure</h2>
              <p>
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul>
                <li>With your consent or at your direction</li>
                <li>To comply with legal obligations</li>
                <li>To protect our rights and prevent fraud</li>
                <li>With service providers who assist in our operations</li>
              </ul>

              <h2>5. Third-Party Services</h2>
              <p>
                We use third-party services for payment processing and analytics:
              </p>
              <ul>
                <li><strong>M-Pesa:</strong> Payment processing for Kenyan users</li>
                <li><strong>PayPal:</strong> International payment processing</li>
                <li><strong>Analytics:</strong> We use analytics to improve our service</li>
              </ul>

              <h2>6. Your Rights and Choices</h2>
              <p>
                You have certain rights regarding your personal information:
              </p>
              <ul>
                <li>Access and download your data</li>
                <li>Correct inaccurate information</li>
                <li>Delete your account and data</li>
                <li>Opt-out of marketing communications</li>
                <li>Disable cookies in your browser</li>
              </ul>

              <h2>7. Data Retention</h2>
              <p>
                We retain your data as long as your account is active. If you delete your account, we will delete your 
                files within 30 days. Some information may be retained for legal or legitimate business purposes.
              </p>

              <h2>8. Children's Privacy</h2>
              <p>
                Our service is not intended for children under 13. We do not knowingly collect information from children 
                under 13. If we learn we have collected such information, we will delete it.
              </p>

              <h2>9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate 
                safeguards are in place for such transfers.
              </p>

              <h2>10. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any material changes by email 
                or through the service.
              </p>

              <h2>11. Contact Us</h2>
              <p>
                If you have questions about this privacy policy or our data practices, please contact us:
              </p>
              <ul>
                <li>Email: privacy@nexxus-pro.com</li>
                <li>Phone: +254 (0) 700 000 000</li>
                <li>Address: Nairobi, Kenya</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your privacy is important to us. We are committed to protecting your personal information.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;