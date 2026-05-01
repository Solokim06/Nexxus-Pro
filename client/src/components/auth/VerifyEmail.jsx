import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import Button from '../common/Button';
import { authService } from '../../services/authService';

const VerifyEmail = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const location = useLocation();
  const email = location.state?.email;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  
  useEffect(() => {
    if (token) {
      verifyEmail();
    }
  }, [token]);
  
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);
  
  const verifyEmail = async () => {
    setIsLoading(true);
    try {
      await authService.verifyEmail(token);
      setIsVerified(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleResendVerification = async () => {
    if (!email) {
      setError('Email address not found. Please login to resend verification.');
      return;
    }
    
    setIsLoading(true);
    try {
      await authService.resendVerificationEmail(email);
      setResendCountdown(60);
      setError('');
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center animate-bounce">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Email Verified Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Your email has been verified. Redirecting to login...
          </p>
          <Link to="/login">
            <Button variant="primary" fullWidth>
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Header */}
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center animate-pulse">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Verify your email address
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {email ? (
              <>We've sent a verification link to <strong>{email}</strong></>
            ) : (
              <>Please check your email for the verification link</>
            )}
          </p>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <Button
            variant="primary"
            fullWidth
            onClick={handleResendVerification}
            isLoading={isLoading}
            disabled={resendCountdown > 0}
          >
            {resendCountdown > 0 
              ? `Resend in ${resendCountdown}s` 
              : 'Resend Verification Email'
            }
          </Button>
          
          <Link to="/login">
            <Button variant="secondary" fullWidth>
              Back to Login
            </Button>
          </Link>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Didn't receive the email? Check your spam folder or{' '}
          <button
            onClick={handleResendVerification}
            className="text-primary-600 hover:text-primary-500 font-medium"
            disabled={resendCountdown > 0}
          >
            click here to resend
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyEmail;