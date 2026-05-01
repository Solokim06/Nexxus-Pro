import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 Animation */}
        <div className="relative mb-8">
          <div className="text-9xl md:text-9xl font-bold text-gray-200 dark:text-gray-700 select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-32 h-32 text-primary-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Oops! Page Not Found
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. Let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link to="/">
            <Button variant="primary" size="lg">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary" size="lg">
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Helpful Links */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Or try these helpful links:
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/pricing" className="text-sm text-primary-600 hover:text-primary-700">
              Pricing
            </Link>
            <Link to="/contact" className="text-sm text-primary-600 hover:text-primary-700">
              Contact Support
            </Link>
            <Link to="/terms" className="text-sm text-primary-600 hover:text-primary-700">
              Terms of Service
            </Link>
            <Link to="/privacy" className="text-sm text-primary-600 hover:text-primary-700">
              Privacy Policy
            </Link>
          </div>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md mx-auto">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            💡 Need help? Check out our{' '}
            <Link to="/help" className="text-primary-600 hover:text-primary-700">
              Help Center
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;