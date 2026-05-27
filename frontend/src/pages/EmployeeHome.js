import React from 'react';
import { Navigate } from 'react-router-dom';

const EmployeeHome = () => {
  return <Navigate to="/employee/dashboard" replace />;
};

export default EmployeeHome;
