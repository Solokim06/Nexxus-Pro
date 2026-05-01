import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRoles = [], requireVerified = true }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    // Redirect to login but save the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // Check if email verification is required
  if (requireVerified && !user?.isEmailVerified) {
    return <Navigate to="/verify-email" state={{ email: user?.email }} replace />;
  }
  
  // Check for required roles
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => user?.roles?.includes(role));
    if (!hasRequiredRole) {
      // User doesn't have required role, redirect to dashboard or 403 page
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Check subscription status for premium features
  const requiresSubscription = location.pathname.includes('/merge') || 
                               location.pathname.includes('/upload');
  
  if (requiresSubscription && user?.subscription?.status !== 'active') {
    return <Navigate to="/pricing" state={{ from: location }} replace />;
  }
  
  return children;
};

// Higher-order component for role-based protection
export const RoleBasedRoute = ({ children, roles, user, fallbackPath = '/dashboard' }) => {
  if (!user) return <Navigate to="/login" replace />;
  
  const hasAccess = roles.some(role => user.roles?.includes(role));
  
  if (!hasAccess) {
    return <Navigate to={fallbackPath} replace />;
  }
  
  return children;
};

// Component for subscription-based protection
export const SubscriptionRoute = ({ children, requiredPlan, user }) => {
  if (!user) return <Navigate to="/login" replace />;
  
  const planLevels = {
    free: 0,
    basic: 1,
    pro: 2,
    enterprise: 3,
  };
  
  const userPlanLevel = planLevels[user.subscription?.plan] || 0;
  const requiredLevel = planLevels[requiredPlan] || 0;
  
  if (userPlanLevel < requiredLevel) {
    return <Navigate to="/pricing" state={{ requiredPlan }} replace />;
  }
  
  return children;
};

export default ProtectedRoute;