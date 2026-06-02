import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './toast.css';

// PrimeReact imports
import { PrimeReactProvider } from 'primereact/api';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import 'primeflex/primeflex.css';
import './primereact-custom.css';

import Header from './components/layout/Header';
import Sidebar from './components/layout/Sidebar';
import EmployeeSidebar from './components/layout/EmployeeSidebar';
import EmployeesPage from './pages/EmployeesPage';
import AddEmployeePage from './pages/AddEmployeePage';
import EditEmployeePage from './pages/EditEmployeePage';
import ProjectsPage from './pages/ProjectsPage';
import AssetsPage from './pages/AssetsPage';
import InvoicesPage from './pages/InvoicesPage';
import PosPage from './pages/PosPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminUsersManagement from './pages/AdminUsersManagement';
import RoleManagement from './pages/RoleManagement';
import ReleaseManagementPage from './pages/ReleaseManagementPage';
import NavigationManagementPage from './pages/NavigationManagementPage';
import DynamicFieldManagerPage from './pages/DynamicFieldManagerPage';
import SprintKpiPage from './pages/SprintKpiPage';
import EmployeeDashboard from './pages/EmployeeDashboard';
import EmployeeHome from './pages/EmployeeHome';
import EmployeeAssetsPage from './pages/EmployeeAssetsPage';
import EmployeeChangePassword from './pages/EmployeeChangePassword';
import IncidentTrackerModule from './incidentTracker/IncidentTrackerModule';
import LeaveTrackerModule from './leaveTracker/LeaveTrackerModule';
import ProtectedRoute from './components/auth/ProtectedRoute';
import EmployeeProtectedRoute from './components/auth/EmployeeProtectedRoute';
import './App.css';

function AppContent() {
  const location = useLocation();
  const isLoginPage =
    location.pathname === '/' ||
    location.pathname === '/admin/login' ||
    location.pathname.startsWith('/employee');

  return (
    <div className={`App ${isLoginPage ? 'login-page' : ''}`}>
      {!isLoginPage && <Header />}

      {!isLoginPage ? (
        <div className="app-layout">
          <Sidebar />

          <main className="app-main">
            <Routes>
              <Route path="/" element={<Navigate to="/admin/login" replace />} />
              <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute permission="dashboard.view">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute permission="admin_users.view">
                  <AdminUsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees"
              element={
                <ProtectedRoute permissions={['employees.view', 'employees.create', 'employees.update', 'employees.delete']} requireAll={false}>
                  <EmployeesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees/add"
              element={
                <ProtectedRoute permission="employees.create">
                  <AddEmployeePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employees/edit/:id"
              element={
                <ProtectedRoute permission="employees.update">
                  <EditEmployeePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/projects"
              element={
                <ProtectedRoute permissions={['projects.view', 'projects.create', 'projects.update', 'projects.delete']} requireAll={false}>
                  <ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/assets"
              element={
                <ProtectedRoute permissions={['assets.view', 'assets.create', 'assets.update', 'assets.delete', 'assets.assign', 'assets.export']} requireAll={false}>
                  <AssetsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/invoices"
              element={
                <ProtectedRoute permissions={['invoices.view', 'invoices.create']} requireAll={false}>
                  <InvoicesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pos"
              element={
                <ProtectedRoute permissions={['pos.view', 'pos.create', 'pos.update', 'pos.delete']} requireAll={false}>
                  <PosPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/incident-tracker"
              element={
                <ProtectedRoute permission="incident_tracker.view">
                  <Navigate to="/admin/incident-tracker/dashboard" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/incident-tracker/*"
              element={
                <ProtectedRoute permission="incident_tracker.view">
                  <IncidentTrackerModule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/leave-tracker/*"
              element={
                <ProtectedRoute permission="leave_tracker.view">
                  <LeaveTrackerModule />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/release-management"
              element={
                <ProtectedRoute permission="release_management.view">
                  <ReleaseManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dynamic-fields"
              element={
                <ProtectedRoute permission="roles.view">
                  <DynamicFieldManagerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sprint-kpi"
              element={
                <ProtectedRoute permission="sprint_kpi.view">
                  <SprintKpiPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/roles"
              element={
                <ProtectedRoute permission="roles.view">
                  <RoleManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/navigation"
              element={
                <ProtectedRoute permission="navigation.manage">
                  <NavigationManagementPage />
                </ProtectedRoute>
              }
            />
            </Routes>
          </main>
        </div>
      ) : location.pathname.startsWith('/employee') && location.pathname !== '/employee/login' ? (
        <div className="app-layout">
          <EmployeeSidebar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<AdminLogin />} />
              <Route path="/employee" element={<Navigate to="/employee/login" replace />} />
              <Route path="/employee/login" element={<AdminLogin mode="employee" />} />
              <Route
                path="/employee/dashboard"
                element={
                  <EmployeeProtectedRoute>
                    <EmployeeDashboard />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/assets"
                element={
                  <EmployeeProtectedRoute permission="assets.create">
                    <EmployeeAssetsPage />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/incident-tracker/*"
                element={
                  <EmployeeProtectedRoute>
                    <IncidentTrackerModule />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/leave-tracker/*"
                element={
                  <EmployeeProtectedRoute permission="leave_tracker.view">
                    <LeaveTrackerModule />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/release-management"
                element={
                  <EmployeeProtectedRoute>
                    <ReleaseManagementPage />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/sprint-kpi"
                element={
                  <EmployeeProtectedRoute>
                    <SprintKpiPage />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/home"
                element={
                  <EmployeeProtectedRoute>
                    <EmployeeHome />
                  </EmployeeProtectedRoute>
                }
              />
              <Route
                path="/employee/change-password"
                element={
                  <EmployeeProtectedRoute>
                    <EmployeeChangePassword />
                  </EmployeeProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
      ) : (
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/employee" element={<Navigate to="/employee/login" replace />} />
            <Route path="/employee/login" element={<AdminLogin mode="employee" />} />
            <Route
              path="/employee/dashboard"
              element={
                <EmployeeProtectedRoute>
                  <EmployeeDashboard />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/assets"
              element={
                <EmployeeProtectedRoute permission="assets.create">
                  <EmployeeAssetsPage />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/incident-tracker/*"
              element={
                <EmployeeProtectedRoute>
                  <IncidentTrackerModule />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/release-management"
              element={
                <EmployeeProtectedRoute>
                  <ReleaseManagementPage />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/sprint-kpi"
              element={
                <EmployeeProtectedRoute>
                  <SprintKpiPage />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/home"
              element={
                <EmployeeProtectedRoute>
                  <EmployeeHome />
                </EmployeeProtectedRoute>
              }
            />
            <Route
              path="/employee/change-password"
              element={
                <EmployeeProtectedRoute>
                  <EmployeeChangePassword />
                </EmployeeProtectedRoute>
              }
            />
          </Routes>
        </main>
      )}

      {!isLoginPage && (
        <footer className="app-footer">
          <p>&copy; 2024 TeamPulse. All rights reserved.</p>
        </footer>
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />
    </div>
  );
}

function App() {
  return (
    <PrimeReactProvider>
      <Router>
        <AppContent />
      </Router>
    </PrimeReactProvider>
  );
}

export default App;
