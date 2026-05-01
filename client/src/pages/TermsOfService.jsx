import React from 'react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
  const lastUpdated = 'January 1, 2024';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Terms of Service
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Last updated: {lastUpdated}
            </p>

            <div className="prose prose-gray dark:prose-invert max-w-none">
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using Nexxus-Pro's services, you agree to be bound by these Terms of Service. 
                If you disagree with any part of the terms, you may not access the service.
              </p>

              <h2>2. Description of Service</h2>
              <p>
                Nexxus-Pro provides a file management and merging platform that allows users to upload, 
                store, merge, and share files. We offer both free and paid subscription plans with varying features and limits.
              </p>

              <h2>3. User Accounts</h2>
              <p>
                To use our service, you must create an account. You are responsible for maintaining the 
                confidentiality of your account credentials and for all activities that occur under your account.
              </p>
              <ul>
                <li>You must be at least 13 years old to use our service</li>
                <li>You must provide accurate and complete information</li>
                <li>You are responsible for all activity under your account</li>
                <li>You must immediately notify us of any unauthorized use</li>
              </ul>

              <h2>4. Subscription and Payments</h2>
              <p>
                Certain features of our service require payment. By purchasing a subscription, you agree to pay 
                the applicable fees and taxes. Subscriptions auto-renew unless cancelled.
              </p>
              <ul>
                <li>Fees are non-refundable except as required by law</li>
                <li>We accept M-Pesa, PayPal, and bank transfers</li>
                <li>You may cancel your subscription at any time</li>
                <li>We reserve the right to change prices with notice</li>
              </ul>

              <h2>5. User Content</h2>
              <p>
                You retain ownership of all files you upload to Nexxus-Pro. By uploading content, you grant us 
                a limited license to store, process, and transmit your content as necessary to provide the service.
              </p>
              <ul>
                <li>You are responsible for your content</li>
                <li>You must not upload illegal or harmful content</li>
                <li>We may remove content that violates these terms</li>
                <li>We do not claim ownership of your files</li>
              </ul>

              <h2>6. Acceptable Use Policy</h2>
              <p>
                You agree not to misuse our service. Prohibited activities include:
              </p>
              <ul>
                <li>Uploading malicious software or viruses</li>
                <li>Infringing on intellectual property rights</li>
                <li>Sharing illegal or prohibited content</li>
                <li>Attempting to bypass security measures</li>
                <li>Using the service for illegal purposes</li>
              </ul>

              <h2>7. Data Security and Privacy</h2>
              <p>
                We take data security seriously. We implement industry-standard security measures to protect your data. 
                For more information, please review our <Link to="/privacy" className="text-primary-600">Privacy Policy</Link>.
              </p>

              <h2>8. Service Availability</h2>
              <p>
                We strive to maintain high availability but do not guarantee uninterrupted service. We may perform 
                maintenance that temporarily affects service availability.
              </p>

              <h2>9. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, Nexxus-Pro shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages arising from your use of the service.
              </p>

              <h2>10. Termination</h2>
              <p>
                We may terminate or suspend your account immediately for violations of these terms. Upon termination, 
                your right to use the service will cease immediately.
              </p>

              <h2>11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of material changes via 
                email or through the service.
              </p>

              <h2>12. Governing Law</h2>
              <p>
                These terms shall be governed by the laws of Kenya, without regard to its conflict of law provisions.
              </p>

              <h2>13. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <ul>
                <li>Email: legal@nexxus-pro.com</li>
                <li>Address: Nairobi, Kenya</li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                By using Nexxus-Pro, you acknowledge that you have read and understood these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;