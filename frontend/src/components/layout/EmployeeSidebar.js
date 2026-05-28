import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import './EmployeeSidebar.css';

const GENERAL_USER_ACCESS_ITEMS = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: 'pi pi-home' },
  { label: 'Assets', path: '/employee/assets', icon: 'pi pi-box' },
  { label: 'Incident Tracker', path: '/employee/incident-tracker', icon: 'pi pi-exclamation-triangle' },
  { label: 'Leave Tracker', path: '/employee/leave-tracker', icon: 'pi pi-calendar' },
  { label: 'Release Management', path: '/employee/release-management', icon: 'pi pi-send' },
  { label: 'Sprint KPI', path: '/employee/sprint-kpi', icon: 'pi pi-chart-bar' },
  { label: 'Change Password', path: '/employee/change-password', icon: 'pi pi-key' }
];

const FULL_EMPLOYEE_ACCESS_ITEMS = [
  { label: 'Dashboard', path: '/employee/dashboard', icon: 'pi pi-home' },
  { label: 'Assets', path: '/employee/assets', icon: 'pi pi-box' },
  { label: 'Incident Tracker', path: '/employee/incident-tracker', icon: 'pi pi-exclamation-triangle' },
  { label: 'Leave Tracker', path: '/employee/leave-tracker', icon: 'pi pi-calendar' },
  { label: 'Release Management', path: '/employee/release-management', icon: 'pi pi-send' },
  { label: 'Sprint KPI', path: '/employee/sprint-kpi', icon: 'pi pi-chart-bar' },
  { label: 'Change Password', path: '/employee/change-password', icon: 'pi pi-key' }
];

const EmployeeSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const employee = authService.getCurrentEmployee();
  const canAccessLeaveTracker = authService.hasPermission('leave_tracker.view');
  const accessItems = authService.getPermissions().length > 0
    ? FULL_EMPLOYEE_ACCESS_ITEMS
    : GENERAL_USER_ACCESS_ITEMS;
  const filteredAccessItems = accessItems.filter((item) => {
    if (item.path === '/employee/assets') {
      return authService.hasPermission('assets.create');
    }
    if (item.path === '/employee/leave-tracker') {
      return canAccessLeaveTracker;
    }
    return true;
  });

  const handleLogout = async () => {
    await authService.logoutEmployee();
    navigate('/employee/login');
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside className="employee-sidebar">
      <div className="employee-sidebar-header">
        <span className="employee-sidebar-brand">Employee Access</span>
        <strong>{employee?.name || 'Employee'}</strong>
        <small>{employee?.role || employee?.auth_role_display_name || employee?.auth_role_name || 'Team Member'}</small>
        <small>{employee?.sso || ''}</small>
      </div>

      <nav className="employee-sidebar-nav">
        {filteredAccessItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`employee-sidebar-link ${isActive(item.path) ? 'active' : ''}`}
          >
            <i className={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="employee-sidebar-footer">
        <button type="button" className="employee-sidebar-logout" onClick={handleLogout}>
          <i className="pi pi-sign-out" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;
