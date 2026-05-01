import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';

const Security = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('password');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePasswordForm = () => {
    const newErrors = {};
    if (!passwordData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }
    if (!passwordData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData),
      });

      if (response.ok) {
        // Show success toast
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const error = await response.json();
        setErrors({ general: error.message });
      }
    } catch (error) {
      setErrors({ general: 'Failed to change password' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    try {
      const response = await fetch('/api/users/enable-2fa', {
        method: 'POST',
      });
      const data = await response.json();
      // Show QR code modal
      console.log('2FA QR Code:', data.qrCode);
    } catch (error) {
      console.error('Failed to enable 2FA:', error);
    }
  };

  const handleSessions = async () => {
    try {
      const response = await fetch('/api/users/sessions');
      const sessions = await response.json();
      console.log('Active sessions:', sessions);
    } catch (error) {
      console.error('Failed to get sessions:', error);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      await fetch(`/api/users/sessions/${sessionId}`, {
        method: 'DELETE',
      });
      handleSessions();
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="container-custom mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
            Security Settings
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('password')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'password'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Change Password
                </button>
                <button
                  onClick={() => setActiveTab('2fa')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === '2fa'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Two-Factor Authentication
                </button>
                <button
                  onClick={() => setActiveTab('sessions')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'sessions'
                      ? 'text-primary-600 border-b-2 border-primary-600'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}
                >
                  Active Sessions
                </button>
              </div>
            </div>

            {/* Password Change */}
            {activeTab === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="p-6 space-y-6">
                {errors.general && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{errors.general}</p>
                  </div>
                )}
                
                <Input
                  label="Current Password"
                  type="password"
                  name="currentPassword"
                  value={passwordData.currentPassword}
                  onChange={handlePasswordChange}
                  error={errors.currentPassword}
                  required
                />
                
                <Input
                  label="New Password"
                  type="password"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  error={errors.newPassword}
                  required
                />
                
                <Input
                  label="Confirm New Password"
                  type="password"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
                  error={errors.confirmPassword}
                  required
                />
                
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Password requirements:</strong>
                    <br />
                    • Minimum 8 characters
                    <br />
                    • At least one uppercase letter
                    <br />
                    • At least one lowercase letter
                    <br />
                    • At least one number
                  </p>
                </div>
                
                <Button type="submit" variant="primary" isLoading={isLoading}>
                  Update Password
                </Button>
              </form>
            )}

            {/* 2FA */}
            {activeTab === '2fa' && (
              <div className="p-6 space-y-6">
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-200">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                  </div>
                </div>

                {user?.twoFactorEnabled ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-green-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      2FA is Enabled
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Your account is protected with two-factor authentication
                    </p>
                    <Button variant="danger">Disable 2FA</Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                      Protect Your Account
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Add an extra layer of security to prevent unauthorized access
                    </p>
                    <Button onClick={handleEnable2FA} variant="primary">
                      Enable 2FA
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Active Sessions */}
            {activeTab === 'sessions' && (
              <div className="p-6">
                <button
                  onClick={handleSessions}
                  className="mb-4 text-sm text-primary-600 hover:text-primary-700"
                >
                  Refresh Sessions
                </button>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Current Session
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Chrome on Windows • Nairobi, Kenya
                      </p>
                    </div>
                    <span className="text-xs text-green-600">Active Now</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Delete Account</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="danger">Delete Account</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Security;