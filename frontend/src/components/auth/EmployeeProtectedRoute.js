import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../../services/authService';

const EmployeeProtectedRoute = ({ children, permission = null }) => {
  const isAuthenticated = authService.isEmployeeAuthenticated();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/employee/login" replace />;
  }

  const employee = authService.getCurrentEmployee();
  if (employee?.must_change_password && location.pathname !== '/employee/change-password') {
    return <Navigate to="/employee/change-password" replace />;
  }

  if (location.pathname === '/employee/home') {
    return <Navigate to="/employee/dashboard" replace />;
  }

  if (permission && !authService.hasPermission(permission)) {
    return <Navigate to="/employee/dashboard" replace />;
  }

  return children;
};

export default EmployeeProtectedRoute;
