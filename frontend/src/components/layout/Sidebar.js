import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import authService from '../../services/authService';
import PermissionGuard from '../auth/PermissionGuard';
import { DashboardIcon, EmployeesIcon, ProjectsIcon, AssetsIcon, AdminUsersIcon, RolesIcon, IncidentTrackerIcon, LeaveTrackerIcon, ReleaseManagementIcon, SprintKpiIcon } from '../icons/MenuIcons';
import './Sidebar.css';

const Sidebar = () => {
  const location = useLocation();
  const isAuthenticated = authService.isAuthenticated();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const isActivePrefix = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const isAdminRoute = () => {
    return location.pathname.startsWith('/admin');
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Don't show sidebar on admin login page or non-admin routes
  if (location.pathname === '/' || !isAdminRoute() || !isAuthenticated) {
    return null;
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button className="sidebar-toggle" onClick={toggleSidebar} title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}>
        <i className={`pi ${isCollapsed ? 'pi-angle-right' : 'pi-angle-left'}`}></i>
      </button>

      <nav className="sidebar-nav">
        <ul className="sidebar-menu">
          <PermissionGuard permission="dashboard.view">
            <li className="sidebar-item">
              <Link to="/admin/dashboard" className={`sidebar-link ${isActive('/admin/dashboard')}`} title="Dashboard">
                <DashboardIcon className="sidebar-icon" />
                <span className="sidebar-text">Dashboard</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permissions={['employees.view', 'employees.create', 'employees.update', 'employees.delete']} requireAll={false}>
            <li className="sidebar-item">
              <Link to="/admin/employees" className={`sidebar-link ${isActive('/admin/employees')}`} title="Employees">
                <EmployeesIcon className="sidebar-icon" />
                <span className="sidebar-text">Employees</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permissions={['projects.view', 'projects.create', 'projects.update', 'projects.delete']} requireAll={false}>
            <li className="sidebar-item">
              <Link to="/admin/projects" className={`sidebar-link ${isActive('/admin/projects')}`} title="Projects">
                <ProjectsIcon className="sidebar-icon" />
                <span className="sidebar-text">Projects</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permissions={['assets.view', 'assets.create', 'assets.update', 'assets.delete', 'assets.assign', 'assets.export']} requireAll={false}>
            <li className="sidebar-item">
              <Link to="/admin/assets" className={`sidebar-link ${isActive('/admin/assets')}`} title="Assets">
                <AssetsIcon className="sidebar-icon" />
                <span className="sidebar-text">Assets</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permissions={['invoices.view', 'invoices.create']} requireAll={false}>
            <li className="sidebar-item">
              <Link to="/admin/invoices" className={`sidebar-link ${isActive('/admin/invoices')}`} title="Invoices">
                <i className="pi pi-file-edit sidebar-icon"></i>
                <span className="sidebar-text">Invoices</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="pos.view">
            <li className="sidebar-item">
              <Link to="/admin/pos" className={`sidebar-link ${isActive('/admin/pos')}`} title="Purchase Orders">
                <i className="pi pi-shopping-cart sidebar-icon"></i>
                <span className="sidebar-text">Purchase Orders</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="incident_tracker.view">
            <li className="sidebar-item">
              <Link
                to="/admin/incident-tracker/dashboard"
                className={`sidebar-link ${isActivePrefix('/admin/incident-tracker')}`}
                title="Incident Tracker"
              >
                <IncidentTrackerIcon className="sidebar-icon" />
                <span className="sidebar-text">Incident Tracker</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="leave_tracker.view">
            <li className="sidebar-item">
              <Link
                to="/admin/leave-tracker"
                className={`sidebar-link ${isActive('/admin/leave-tracker')}`}
                title="Leave Tracker"
              >
                <LeaveTrackerIcon className="sidebar-icon" />
                <span className="sidebar-text">Leave Tracker</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="release_management.view">
            <li className="sidebar-item">
              <Link
                to="/admin/release-management"
                className={`sidebar-link ${isActive('/admin/release-management')}`}
                title="Release Management"
              >
                <ReleaseManagementIcon className="sidebar-icon" />
                <span className="sidebar-text">Release Management</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="sprint_kpi.view">
            <li className="sidebar-item">
              <Link
                to="/admin/sprint-kpi"
                className={`sidebar-link ${isActive('/admin/sprint-kpi')}`}
                title="Sprint KPI"
              >
                <SprintKpiIcon className="sidebar-icon" />
                <span className="sidebar-text">Sprint KPI</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="admin_users.view">
            <li className="sidebar-item">
              <Link to="/admin/users" className={`sidebar-link ${isActive('/admin/users')}`} title="Admin Users">
                <AdminUsersIcon className="sidebar-icon" />
                <span className="sidebar-text">Admin Users</span>
              </Link>
            </li>
          </PermissionGuard>

          <PermissionGuard permission="roles.view">
            <li className="sidebar-item">
              <Link to="/admin/roles" className={`sidebar-link ${isActive('/admin/roles')}`} title="Roles">
                <RolesIcon className="sidebar-icon" />
                <span className="sidebar-text">Roles</span>
              </Link>
            </li>
          </PermissionGuard>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
