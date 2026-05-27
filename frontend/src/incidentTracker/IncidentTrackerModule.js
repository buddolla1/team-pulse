import React from 'react';
import { Navigate, NavLink, Route, Routes } from 'react-router-dom';
import authService from '../services/authService';
import { buildIncidentTrackerPath, getIncidentTrackerBasePath } from './utils/routing';
import DashboardPage from './pages/DashboardPage';
import IncidentListPage from './pages/IncidentListPage';
import IncidentCreatePage from './pages/IncidentCreatePage';
import IncidentEditPage from './pages/IncidentEditPage';
import IncidentDetailsPage from './pages/IncidentDetailsPage';
import ReportsPage from './pages/ReportsPage';
import './IncidentTrackerModule.css';

const getNavItems = () => ([
  { label: 'Dashboard', path: buildIncidentTrackerPath('/dashboard') },
  { label: 'Incidents', path: buildIncidentTrackerPath('/incidents') },
  { label: 'Reports', path: buildIncidentTrackerPath('/reports'), permission: 'incident_tracker.export' },
]);

function PermissionGate({ permission, children }) {
  if (!permission || authService.hasPermission(permission)) {
    return children;
  }

  return <Navigate to={buildIncidentTrackerPath('/incidents')} replace />;
}

function IncidentTrackerInner() {
  const navItems = getNavItems();
  const basePath = getIncidentTrackerBasePath();

  return (
    <section className="incident-module">
      <div className="incident-module-shell">
        <div className="incident-module-topbar">
          <div className="incident-module-brand">
            <h1 className="incident-module-title">Incident Tracker</h1>
            <p className="incident-module-subtitle">Native incident workspace on the TeamPulse backend.</p>
          </div>
        </div>

        <nav className="incident-module-nav">
          {navItems.filter((item) => !item.permission || authService.hasPermission(item.permission)).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `incident-module-tab ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="incident-module-content">
          <Routes>
            <Route path="/" element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="incidents" element={<IncidentListPage />} />
            <Route path="incidents/create" element={<PermissionGate permission="incident_tracker.create"><IncidentCreatePage /></PermissionGate>} />
            <Route path="incidents/:id/edit" element={<PermissionGate permission="incident_tracker.update"><IncidentEditPage /></PermissionGate>} />
            <Route path="incidents/:id" element={<IncidentDetailsPage />} />
            <Route path="reports" element={<PermissionGate permission="incident_tracker.export"><ReportsPage /></PermissionGate>} />
            <Route path="*" element={<Navigate to={`${basePath}/dashboard`} replace />} />
          </Routes>
        </div>
      </div>
    </section>
  );
}

export default function IncidentTrackerModule() {
  return <IncidentTrackerInner />;
}
