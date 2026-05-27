import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import authService from '../services/authService';
import './AdminDashboard.css';

const EmployeeDashboard = () => {
  const [employee, setEmployee] = useState(authService.getCurrentEmployee());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await authService.getEmployeeProfile();
        if (response.success) {
          const nextEmployee = {
            ...(authService.getCurrentEmployee() || {}),
            ...response.data
          };
          setEmployee(nextEmployee);
          sessionStorage.setItem('employeeUser', JSON.stringify(nextEmployee));
        } else {
          setError(response.message || 'Failed to load dashboard');
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
        toast.error(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = location.hash.replace('#', '');
    const element = document.getElementById(id);
    if (element) {
      window.requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [location.hash]);

  const handleLogout = async () => {
    await authService.logoutEmployee();
    navigate('/employee/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-loading">
          <div className="spinner" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="dashboard-error">
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Employee Dashboard</h1>
          <p className="welcome-text">
            Welcome back, <strong>{employee?.name || 'Employee'}</strong>
          </p>
        </div>
        <div className="header-actions">
          <button onClick={() => navigate('/employee/change-password')} className="btn btn-primary">
            Change Password
          </button>
          <button onClick={handleLogout} className="btn btn-outline">
            Logout
          </button>
        </div>
      </div>

      <section className="dashboard-section" id="access-overview">
        <h2>Your Access</h2>
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <h3>{employee?.name || 'Employee'}</h3>
              <p>Employee Name</p>
            </div>
          </div>

          <div className="stat-card stat-success">
            <div className="stat-icon">🆔</div>
            <div className="stat-content">
              <h3>{employee?.sso || '-'}</h3>
              <p>SSO Username</p>
            </div>
          </div>

          <div className="stat-card stat-warning">
            <div className="stat-icon">🕒</div>
            <div className="stat-content">
              <h3>{formatDate(employee?.last_login)}</h3>
              <p>Last Login</p>
            </div>
          </div>

          <div className="stat-card stat-danger">
            <div className="stat-icon">✅</div>
            <div className="stat-content">
              <h3>{employee?.status || '-'}</h3>
              <p>Account Status</p>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="projects" style={{ scrollMarginTop: '90px' }}>
        <h2>Projects</h2>
        <div className="stat-card stat-primary">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <h3 style={{ fontSize: '20px' }}>Projects Overview</h3>
            <p>View the project teams linked to your access profile.</p>
            <span className="project-status status-active">Available</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="incident-tracker" style={{ scrollMarginTop: '90px' }}>
        <h2>Incident Tracker</h2>
        <div className="stat-card stat-warning">
          <div className="stat-icon">⚠</div>
          <div className="stat-content">
            <h3 style={{ fontSize: '20px' }}>Incident Tracking</h3>
            <p>View and track incident records assigned to general users.</p>
            <span className="project-status status-active">Available</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="release-management" style={{ scrollMarginTop: '90px' }}>
        <h2>Release Management</h2>
        <div className="stat-card stat-success">
          <div className="stat-icon">🚀</div>
          <div className="stat-content">
            <h3 style={{ fontSize: '20px' }}>Release Readiness</h3>
            <p>Review release readiness and deployment details.</p>
            <span className="project-status status-active">Available</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="sprint-kpi" style={{ scrollMarginTop: '90px' }}>
        <h2>Sprint KPI</h2>
        <div className="stat-card stat-danger">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3 style={{ fontSize: '20px' }}>Sprint KPI Access</h3>
            <p>Monitor sprint KPI stories and entry progress.</p>
            <span className="project-status status-active">Available</span>
          </div>
        </div>
      </section>

      <section className="dashboard-section" id="profile" style={{ scrollMarginTop: '90px' }}>
        <h2>Profile</h2>
        <div className="admin-stats">
          <div className="admin-stat-item">
            <span className="admin-stat-label">Employee Name</span>
            <span className="admin-stat-value">{employee?.name || '-'}</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">Job Role</span>
            <span className="admin-stat-value">{employee?.role || '-'}</span>
          </div>
          <div className="admin-stat-item">
            <span className="admin-stat-label">Auth Role</span>
            <span className="admin-stat-value">{employee?.role || employee?.auth_role_name || 'Team Member'}</span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EmployeeDashboard;
