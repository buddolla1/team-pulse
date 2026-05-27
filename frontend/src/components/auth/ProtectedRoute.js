import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const ProtectedRoute = ({ children, permission, permissions, requireAll = false }) => {
  const isAuthenticated = authService.isAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/" replace />;
  }

  let isAllowed = true;
  if (permission) {
    isAllowed = authService.hasPermission(permission);
  } else if (permissions && Array.isArray(permissions)) {
    isAllowed = requireAll
      ? authService.hasAllPermissions(permissions)
      : authService.hasAnyPermission(permissions);
  }

  if (!isAllowed) {
    const fallbackPath = authService.getDefaultAdminPath();
    if (location.pathname !== fallbackPath) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <div className="p-4">You do not have permission to access this page.</div>;
  }

  return children;
};

export default ProtectedRoute;
