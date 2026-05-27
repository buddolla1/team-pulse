import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010/api';

const isEmployeePath = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/employee');

const isEmployeeSession = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean(sessionStorage.getItem('employeeToken')) && !sessionStorage.getItem('adminToken');
};

const getActiveToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const employeeToken = sessionStorage.getItem('employeeToken');
  const adminToken = sessionStorage.getItem('adminToken');

  if (isEmployeePath() && employeeToken) {
    return employeeToken;
  }

  if (!isEmployeePath() && adminToken) {
    return adminToken;
  }

  return adminToken || employeeToken;
};

const clearActiveAuthStorage = () => {
  if (isEmployeePath() || isEmployeeSession()) {
    clearEmployeeStorage();
    return;
  }

  clearAuthStorage();
};

// Create axios instance with auth interceptor
const authApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const clearAuthStorage = () => {
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminPermissions');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('adminPermissions');
};

const clearEmployeeStorage = () => {
  sessionStorage.removeItem('employeeToken');
  sessionStorage.removeItem('employeeUser');
  sessionStorage.removeItem('employeePermissions');
  localStorage.removeItem('employeeToken');
  localStorage.removeItem('employeeUser');
  localStorage.removeItem('employeePermissions');
};

const TEAM_MEMBER_PERMISSIONS = [
  'incident_tracker.view',
  'leave_tracker.view',
  'leave_tracker.create',
  'release_management.view',
  'sprint_kpi.view',
  'sprint_kpi.create',
  'sprint_kpi.update',
  'sprint_kpi.delete'
];

const TEAM_LEAD_PERMISSIONS = [
  'incident_tracker.view',
  'incident_tracker.create',
  'incident_tracker.update',
  'incident_tracker.delete',
  'incident_tracker.export',
  'leave_tracker.view',
  'leave_tracker.create',
  'release_management.view',
  'release_management.create',
  'release_management.update',
  'release_management.delete',
  'release_management.export',
  'sprint_kpi.view',
  'sprint_kpi.create',
  'sprint_kpi.update',
  'sprint_kpi.delete'
];

const FULL_EMPLOYEE_PERMISSIONS = [
  'incident_tracker.view',
  'incident_tracker.create',
  'incident_tracker.update',
  'incident_tracker.delete',
  'incident_tracker.export',
  'leave_tracker.view',
  'leave_tracker.create',
  'release_management.view',
  'release_management.create',
  'release_management.update',
  'release_management.delete',
  'release_management.export',
  'sprint_kpi.view',
  'sprint_kpi.create',
  'sprint_kpi.update',
  'sprint_kpi.delete',
  'projects.view',
  'projects.create',
  'projects.update',
  'projects.delete'
];

const LEAVE_TRACKER_PERMISSIONS = [
  'leave_tracker.view',
  'leave_tracker.create',
  'leave_tracker.export'
];

const normalizeWorkLocation = (value) => String(value || '').trim().toLowerCase();
const isOnsiteWorkLocation = (value) => normalizeWorkLocation(value) === 'onsite';

const mergeUniquePermissions = (primary = [], fallback = []) => {
  const merged = new Set();
  [...primary, ...fallback].forEach((permission) => {
    if (permission) {
      merged.add(permission);
    }
  });
  return Array.from(merged);
};

const getCurrentRoleKey = () => {
  const admin = authService.getCurrentUser();
  const employee = authService.getCurrentEmployee();
  const roleValue = isEmployeeSession()
    ? (employee?.role || employee?.auth_role_name || employee?.role_name)
    : (admin?.role || admin?.auth_role_name || admin?.role_name);

  return String(roleValue || '').trim().toLowerCase();
};

const isAdminSession = () => Boolean(sessionStorage.getItem('adminToken')) && !isEmployeeSession();

const getCurrentEmployeeWorkLocation = () => {
  const employee = authService.getCurrentEmployee();
  return employee?.work_location || employee?.workLocation || null;
};

const getLeaveTrackerFallbackPermissions = () => {
  if (isEmployeeSession()) {
    if (!isOnsiteWorkLocation(getCurrentEmployeeWorkLocation())) {
      return [];
    }
    return LEAVE_TRACKER_PERMISSIONS.filter((permission) => permission !== 'leave_tracker.export');
  }

  return LEAVE_TRACKER_PERMISSIONS;
};

const sanitizePermissionsForSession = (permissions = []) => {
  const uniquePermissions = mergeUniquePermissions(permissions, []);

  if (isEmployeeSession()) {
    if (!isOnsiteWorkLocation(getCurrentEmployeeWorkLocation())) {
      return uniquePermissions.filter((permission) => !permission.startsWith('leave_tracker.'));
    }
    return uniquePermissions.filter((permission) => permission !== 'leave_tracker.export');
  }

  if (isAdminSession()) {
    return uniquePermissions.filter((permission) => permission !== 'leave_tracker.create');
  }

  return uniquePermissions;
};

const getStoredEmployeePermissions = () => {
  const employee = authService.getCurrentEmployee();
  const permStr = sessionStorage.getItem('employeePermissions');
  const workLocation = employee?.work_location || employee?.workLocation || null;
  const leaveTrackerFallbackPermissions = isOnsiteWorkLocation(workLocation)
    ? getLeaveTrackerFallbackPermissions()
    : [];

  if (permStr) {
    try {
      const parsed = JSON.parse(permStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return sanitizePermissionsForSession(
          mergeUniquePermissions(parsed, leaveTrackerFallbackPermissions)
        );
      }
    } catch (error) {
      // Fall through to object/fallback handling.
    }
  }

  const embeddedPermissions = Array.isArray(employee?.permissions) ? employee.permissions : [];
  if (embeddedPermissions.length > 0) {
    return sanitizePermissionsForSession(
      mergeUniquePermissions(embeddedPermissions, leaveTrackerFallbackPermissions)
    );
  }

  const employeeRole = getCurrentRoleKey();
  if (employeeRole === 'team member') {
    return sanitizePermissionsForSession(
      mergeUniquePermissions(TEAM_MEMBER_PERMISSIONS, leaveTrackerFallbackPermissions)
    );
  }

  if (employeeRole === 'team lead') {
    return sanitizePermissionsForSession(
      mergeUniquePermissions(TEAM_LEAD_PERMISSIONS, leaveTrackerFallbackPermissions)
    );
  }

  return sanitizePermissionsForSession(
    mergeUniquePermissions(
      Array.isArray(employee?.permissions) && employee.permissions.length > 0
      ? employee.permissions
        : FULL_EMPLOYEE_PERMISSIONS,
      leaveTrackerFallbackPermissions
    )
  );
};

// Request interceptor to add token to headers
authApi.interceptors.request.use(
  (config) => {
    const token = getActiveToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
authApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearActiveAuthStorage();
      window.location.href = isEmployeePath() ? '/employee/login' : '/';
    }
    return Promise.reject(error);
  }
);

// Employee auth API
const employeeApi = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

employeeApi.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('employeeToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

employeeApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      clearEmployeeStorage();
      window.location.href = '/employee/login';
    }
    return Promise.reject(error);
  }
);

// Auth service functions
const authService = {
  // Login
  login: async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password
    });
    if (response.data.success) {
      clearEmployeeStorage();
      sessionStorage.setItem('adminToken', response.data.data.token);
      sessionStorage.setItem('adminUser', JSON.stringify(response.data.data.admin));

      // Fetch and store user permissions
      try {
        const permResponse = await authApi.get('/my-permissions');
        if (permResponse.data.success) {
          sessionStorage.setItem('adminPermissions', JSON.stringify(permResponse.data.data.permissions));
        }
      } catch (error) {
        console.error('Error fetching permissions:', error);
      }
    }
    return response.data;
  },

  loginEmployee: async (username, password) => {
    const response = await axios.post(`${API_URL}/auth/employee-login`, {
      username,
      password
    });
    if (response.data.success) {
      clearAuthStorage();
      clearEmployeeStorage();
      sessionStorage.setItem('employeeToken', response.data.data.token);
      sessionStorage.setItem('employeeUser', JSON.stringify(response.data.data.employee));
      sessionStorage.setItem('employeePermissions', JSON.stringify(response.data.data.employee.permissions || []));
    }
    return response.data;
  },

  // Logout
  logout: async () => {
    try {
      if (!isEmployeeSession()) {
        await authApi.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthStorage();
      clearEmployeeStorage();
    }
  },

  logoutEmployee: async () => {
    clearEmployeeStorage();
  },

  // Get current user
  getCurrentUser: () => {
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  getCurrentEmployee: () => {
    const userStr = sessionStorage.getItem('employeeUser');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = sessionStorage.getItem('adminToken');
    return !!token;
  },

  isEmployeeAuthenticated: () => {
    const token = sessionStorage.getItem('employeeToken');
    return !!token;
  },

  clearPersistedAuth: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminPermissions');
    localStorage.removeItem('incident_tracker_token');
    localStorage.removeItem('employeeToken');
    localStorage.removeItem('employeeUser');
    localStorage.removeItem('employeePermissions');
  },

  // Get user permissions
  getPermissions: () => {
    if (isEmployeeSession()) {
      return getStoredEmployeePermissions();
    }

    const permStr = sessionStorage.getItem('adminPermissions');
    if (permStr) {
      try {
        const parsed = JSON.parse(permStr);
        return Array.isArray(parsed)
          ? sanitizePermissionsForSession(
              mergeUniquePermissions(parsed, getLeaveTrackerFallbackPermissions())
            )
          : getLeaveTrackerFallbackPermissions();
      } catch (error) {
        return getLeaveTrackerFallbackPermissions();
      }
    }
    return getLeaveTrackerFallbackPermissions();
  },

  // Check if user has a specific permission
  hasPermission: (permission) => {
    if (permission === 'leave_tracker.create' && isAdminSession()) {
      return false;
    }

    if (permission === 'leave_tracker.export' && isEmployeeSession()) {
      return false;
    }

    const permissions = authService.getPermissions();
    if (permissions.includes(permission)) {
      return true;
    }

    if (permission === 'leave_tracker.view' || permission === 'leave_tracker.create') {
      if (isEmployeeSession()) {
        return isOnsiteWorkLocation(getCurrentEmployeeWorkLocation());
      }
      return permission === 'leave_tracker.view' && Boolean(sessionStorage.getItem('adminToken'));
    }

    if (permission === 'leave_tracker.export') {
      return Boolean(sessionStorage.getItem('adminToken'));
    }

    return false;
  },

  // Check if user has any of the specified permissions
  hasAnyPermission: (permissionArray) => {
    if (permissionArray.includes('leave_tracker.create') && isAdminSession()) {
      const remaining = permissionArray.filter((perm) => perm !== 'leave_tracker.create');
      if (remaining.length === 0) {
        return false;
      }
      return authService.hasAnyPermission(remaining);
    }

    const permissions = authService.getPermissions();
    if (permissionArray.some(perm => permissions.includes(perm))) {
      return true;
    }

    if (permissionArray.every((perm) => perm === 'leave_tracker.view' || perm === 'leave_tracker.create')) {
      return isEmployeeSession()
        ? isOnsiteWorkLocation(getCurrentEmployeeWorkLocation())
        : Boolean(sessionStorage.getItem('adminToken'));
    }

    if (permissionArray.includes('leave_tracker.export')) {
      return Boolean(sessionStorage.getItem('adminToken'));
    }

    return false;
  },

  // Check if user has all specified permissions
  hasAllPermissions: (permissionArray) => {
    if (permissionArray.includes('leave_tracker.create') && isAdminSession()) {
      return false;
    }

    const permissions = authService.getPermissions();
    if (permissionArray.every(perm => permissions.includes(perm))) {
      return true;
    }

    if (permissionArray.every((perm) => perm === 'leave_tracker.view' || perm === 'leave_tracker.create')) {
      return isEmployeeSession()
        ? isOnsiteWorkLocation(getCurrentEmployeeWorkLocation())
        : Boolean(sessionStorage.getItem('adminToken'));
    }

    if (permissionArray.includes('leave_tracker.export')) {
      return Boolean(sessionStorage.getItem('adminToken')) && permissionArray.every((perm) => perm === 'leave_tracker.export' || permissions.includes(perm));
    }

    return false;
  },

  getDefaultEmployeePath: () => {
    const employee = authService.getCurrentEmployee();
    if (employee?.must_change_password) {
      return '/employee/change-password';
    }
    return '/employee/dashboard';
  },

  getDefaultAdminPath: () => {
    if (authService.hasPermission('dashboard.view')) {
      return '/admin/dashboard';
    }
    if (authService.hasPermission('sprint_kpi.view')) {
      return '/admin/sprint-kpi';
    }
    if (authService.hasPermission('incident_tracker.view')) {
      return '/admin/incident-tracker/dashboard';
    }
    if (authService.hasPermission('leave_tracker.view')) {
      return '/admin/leave-tracker';
    }
    if (authService.hasPermission('release_management.view')) {
      return '/admin/release-management';
    }
    return '/admin/dashboard';
  },

  // Refresh permissions (call after role changes)
  refreshPermissions: async () => {
    try {
      const response = await authApi.get('/my-permissions');
      if (response.data.success) {
        const permKey = isEmployeeSession() ? 'employeePermissions' : 'adminPermissions';
        sessionStorage.setItem(permKey, JSON.stringify(response.data.data.permissions));
        return response.data.data.permissions;
      }
    } catch (error) {
      console.error('Error refreshing permissions:', error);
    }
    return [];
  },

  // Get profile
  getProfile: async () => {
    const response = isEmployeeSession()
      ? await employeeApi.get('/auth/employee-profile')
      : await authApi.get('/auth/profile');
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword, newPassword) => {
    const response = isEmployeeSession()
      ? await employeeApi.post('/auth/employee-change-password', {
          currentPassword,
          newPassword
        })
      : await authApi.post('/auth/change-password', {
          currentPassword,
          newPassword
        });
    return response.data;
  },

  changeEmployeePassword: async (currentPassword, newPassword) => {
    const response = await employeeApi.post('/auth/employee-change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  },

  getEmployeeProfile: async () => {
    const response = await employeeApi.get('/auth/employee-profile-lite');
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async () => {
    const response = await authApi.get('/admin/dashboard/stats');
    return response.data;
  },

  // Admin user management
  getAllAdmins: async (page = 1, limit = 10, status = '') => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (status) {
      params.append('status', status);
    }
    const response = await authApi.get(`/admin/users?${params.toString()}`);
    return response.data;
  },

  getAdminById: async (id) => {
    const response = await authApi.get(`/admin/users/${id}`);
    return response.data;
  },

  createAdmin: async (data) => {
    const response = await authApi.post('/admin/users', data);
    return response.data;
  },

  updateAdmin: async (id, data) => {
    const response = await authApi.put(`/admin/users/${id}`, data);
    return response.data;
  },

  deleteAdmin: async (id) => {
    const response = await authApi.delete(`/admin/users/${id}`);
    return response.data;
  },

  // Audit logs
  getAuditLogs: async (page = 1, limit = 50, filters = {}) => {
    const params = new URLSearchParams();
    params.append('page', page);
    params.append('limit', limit);
    if (filters.admin_id) {
      params.append('admin_id', filters.admin_id);
    }
    if (filters.action) {
      params.append('action', filters.action);
    }
    if (filters.entity_type) {
      params.append('entity_type', filters.entity_type);
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    const response = await authApi.get(`/admin/audit-logs?${params.toString()}`);
    return response.data;
  },

  // Role management
  getAllRoles: async () => {
    const response = await authApi.get('/roles');
    return response.data;
  },

  getRoleById: async (id) => {
    const response = await authApi.get(`/roles/${id}`);
    return response.data;
  },

  createRole: async (data) => {
    const response = await authApi.post('/roles', data);
    return response.data;
  },

  updateRole: async (id, data) => {
    const response = await authApi.put(`/roles/${id}`, data);
    return response.data;
  },

  deleteRole: async (id) => {
    const response = await authApi.delete(`/roles/${id}`);
    return response.data;
  },

  getAllPermissions: async () => {
    const response = await authApi.get('/permissions');
    return response.data;
  }
};

export default authService;
