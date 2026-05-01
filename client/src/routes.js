import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Public Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Pricing from './pages/Pricing';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ContactUs from './pages/ContactUs';
import PaymentCallback from './pages/PaymentCallback';
import NotFound from './pages/NotFound';

// Protected Pages (require authentication)
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import MergeFiles from './pages/MergeFiles';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Security from './pages/Security';
import Notifications from './pages/Notifications';

// Layout wrapper for protected routes
const ProtectedLayout = ({ children }) => {
  return (
    <ProtectedRoute>
      {children}
    </ProtectedRoute>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/terms" element={<TermsOfService />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/contact" element={<ContactUs />} />
      <Route path="/payment/callback" element={<PaymentCallback />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={
        <ProtectedLayout>
          <Dashboard />
        </ProtectedLayout>
      } />
      
      <Route path="/upload" element={
        <ProtectedLayout>
          <Upload />
        </ProtectedLayout>
      } />
      
      <Route path="/merge" element={
        <ProtectedLayout>
          <MergeFiles />
        </ProtectedLayout>
      } />
      
      <Route path="/settings" element={
        <ProtectedLayout>
          <Settings />
        </ProtectedLayout>
      } />
      
      <Route path="/profile" element={
        <ProtectedLayout>
          <Profile />
        </ProtectedLayout>
      } />
      
      <Route path="/security" element={
        <ProtectedLayout>
          <Security />
        </ProtectedLayout>
      } />
      
      <Route path="/notifications" element={
        <ProtectedLayout>
          <Notifications />
        </ProtectedLayout>
      } />
      
      {/* Redirects */}
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register" element={<Navigate to="/dashboard" replace />} />
      
      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;