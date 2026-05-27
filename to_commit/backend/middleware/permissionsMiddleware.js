const db = require('../config/database');
const { getEmployeeAccessProfile } = require('../utils/employeeAccess');

// Cache for role permissions (refreshed periodically)
let permissionsCache = new Map();
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LEAVE_TRACKER_PERMISSION_PREFIX = 'leave_tracker.';

const isLeaveTrackerPermission = (permissionName) => String(permissionName || '').startsWith(LEAVE_TRACKER_PERMISSION_PREFIX);

const normalizeWorkLocation = (value) => String(value || '').trim().toLowerCase();

const isOnsiteWorkLocation = (workLocation) => normalizeWorkLocation(workLocation) === 'onsite';

const allowsLeaveTrackerFallback = (permissionName, context, workLocation = null) => {
  if (!isLeaveTrackerPermission(permissionName)) {
    return false;
  }

  if (context === 'employee' && !isOnsiteWorkLocation(workLocation)) {
    return false;
  }

  if (context === 'admin') {
    return permissionName !== 'leave_tracker.create';
  }

  if (context === 'employee') {
    return permissionName !== 'leave_tracker.export';
  }

  return false;
};

// Load permissions for a role into cache
const loadRolePermissions = async (roleId) => {
  try {
    const [permissions] = await db.query(
      `SELECT p.name, p.module, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [roleId]
    );

    const permissionNames = permissions.map(p => p.name);
    permissionsCache.set(roleId, permissionNames);
    return permissionNames;
  } catch (error) {
    console.error('Error loading role permissions:', error);
    return [];
  }
};

const getUserRoleContext = async (user) => {
  if (!user || !user.id) {
    return null;
  }

  if (user.role_id) {
    return {
      roleId: user.role_id,
      roleName: user.role_name || null,
      roleDisplayName: user.role_display_name || null
    };
  }

  if (user.user_type === 'employee') {
    const [employees] = await db.query(
      `SELECT e.role_id, r.name AS role_name, r.display_name AS role_display_name
       FROM employees e
       LEFT JOIN roles r ON e.role_id = r.id
       WHERE e.id = ?`,
      [user.id]
    );

    if (employees.length === 0 || !employees[0].role_id) {
      return null;
    }

    return {
      roleId: employees[0].role_id,
      roleName: employees[0].role_name || null,
      roleDisplayName: employees[0].role_display_name || null
    };
  }

  const [admins] = await db.query(
    `SELECT au.role_id, r.name AS role_name, r.display_name AS role_display_name
     FROM admin_users au
     LEFT JOIN roles r ON au.role_id = r.id
     WHERE au.id = ?`,
    [user.id]
  );

  if (admins.length === 0 || !admins[0].role_id) {
    return null;
  }

  return {
    roleId: admins[0].role_id,
    roleName: admins[0].role_name || null,
    roleDisplayName: admins[0].role_display_name || null
  };
};

// Get permissions for a role (with caching)
const getRolePermissions = async (roleId) => {
  const now = Date.now();

  // Refresh cache if expired
  if (!cacheTimestamp || now - cacheTimestamp > CACHE_DURATION) {
    permissionsCache.clear();
    cacheTimestamp = now;
  }

  // Return cached permissions if available
  if (permissionsCache.has(roleId)) {
    return permissionsCache.get(roleId);
  }

  // Load and cache permissions
  return await loadRolePermissions(roleId);
};

// Check if admin has a specific permission
const hasPermission = async (adminId, permissionName) => {
  try {
    const [admins] = await db.query(
      'SELECT id, role_id FROM admin_users WHERE id = ?',
      [adminId]
    );

    if (admins.length > 0) {
      const roleId = admins[0].role_id;
      if (!roleId) {
        return allowsLeaveTrackerFallback(permissionName, 'admin');
      }

      if (permissionName === 'leave_tracker.create') {
        return false;
      }

      const permissions = await getRolePermissions(roleId);
      return permissions.includes(permissionName) || allowsLeaveTrackerFallback(permissionName, 'admin');
    }

    const [employees] = await db.query(
      'SELECT id FROM employees WHERE id = ?',
      [adminId]
    );

    if (employees.length === 0) {
      return false;
    }

    const accessProfile = await getEmployeeAccessProfile(adminId);
    if (!accessProfile.isLimited) {
      return true;
    }
    return accessProfile.permissions.includes(permissionName) || allowsLeaveTrackerFallback(permissionName, 'employee', accessProfile.workLocation);
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

// Check if admin has any of the specified permissions
const hasAnyPermission = async (adminId, permissionNames) => {
  try {
    const [admins] = await db.query(
      'SELECT id, role_id FROM admin_users WHERE id = ?',
      [adminId]
    );

    if (admins.length > 0) {
      const roleId = admins[0].role_id;
      if (!roleId) {
        return permissionNames.some((perm) => allowsLeaveTrackerFallback(perm, 'admin'));
      }

      if (permissionNames.includes('leave_tracker.create')) {
        return permissionNames.some((perm) => perm !== 'leave_tracker.create' && (allowsLeaveTrackerFallback(perm, 'admin') || false));
      }

      const permissions = await getRolePermissions(roleId);
      return permissionNames.some(perm => permissions.includes(perm) || allowsLeaveTrackerFallback(perm, 'admin'));
    }

    const [employees] = await db.query(
      'SELECT id FROM employees WHERE id = ?',
      [adminId]
    );

    if (employees.length === 0) {
      return false;
    }

    const accessProfile = await getEmployeeAccessProfile(adminId);
    if (!accessProfile.isLimited) {
      return true;
    }
    return permissionNames.some(perm => accessProfile.permissions.includes(perm) || allowsLeaveTrackerFallback(perm, 'employee', accessProfile.workLocation));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Check if admin has all specified permissions
const hasAllPermissions = async (adminId, permissionNames) => {
  try {
    const [admins] = await db.query(
      'SELECT id, role_id FROM admin_users WHERE id = ?',
      [adminId]
    );

    if (admins.length > 0) {
      const roleId = admins[0].role_id;
      if (!roleId) {
        return permissionNames.every((perm) => allowsLeaveTrackerFallback(perm, 'admin'));
      }

      if (permissionNames.includes('leave_tracker.create')) {
        return false;
      }

      const permissions = await getRolePermissions(roleId);
      return permissionNames.every(perm => permissions.includes(perm) || allowsLeaveTrackerFallback(perm, 'admin'));
    }

    const [employees] = await db.query(
      'SELECT id FROM employees WHERE id = ?',
      [adminId]
    );

    if (employees.length === 0) {
      return false;
    }

    const accessProfile = await getEmployeeAccessProfile(adminId);
    if (!accessProfile.isLimited) {
      return true;
    }
    return permissionNames.every(perm => accessProfile.permissions.includes(perm) || allowsLeaveTrackerFallback(perm, 'employee', accessProfile.workLocation));
  } catch (error) {
    console.error('Error checking permissions:', error);
    return false;
  }
};

// Middleware factory to check for a specific permission
const requirePermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.admin || !req.admin.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const allowed = await hasPermission(req.admin.id, permissionName);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action.',
          required_permission: permissionName
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions.'
      });
    }
  };
};

// Middleware factory to check for any of multiple permissions
const requireAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.admin || !req.admin.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const allowed = await hasAnyPermission(req.admin.id, permissionNames);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action.',
          required_permissions: permissionNames
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions.'
      });
    }
  };
};

// Middleware factory to check for all specified permissions
const requireAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      if (!req.admin || !req.admin.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required.'
        });
      }

      const allowed = await hasAllPermissions(req.admin.id, permissionNames);

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to perform this action.',
          required_permissions: permissionNames
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking permissions.'
      });
    }
  };
};

// Middleware to attach user permissions to request object
const attachPermissions = async (req, res, next) => {
  try {
    if (req.admin && req.admin.id) {
      if (req.admin.user_type === 'employee') {
        const accessProfile = await getEmployeeAccessProfile(req.admin.id);
        req.admin.role_name = accessProfile.roleName;
        req.admin.role_display_name = accessProfile.roleDisplayName;
        req.admin.permissions = accessProfile.permissions;
        req.admin.access_level = accessProfile.isLimited ? 'limited' : 'full';
        req.employee = {
          ...(req.employee || {}),
          ...req.admin
        };
      } else {
        const userContext = await getUserRoleContext(req.admin);

        if (userContext && userContext.roleId) {
          const roleId = userContext.roleId;
          const permissions = await getRolePermissions(roleId);

          // Attach to request
          req.admin.role_id = roleId;
          req.admin.role_name = userContext.roleName;
          req.admin.role_display_name = userContext.roleDisplayName;
          req.admin.permissions = permissions;
        } else {
          req.admin.permissions = [];
        }
      }
    }

    next();
  } catch (error) {
    console.error('Error attaching permissions:', error);
    next();
  }
};

// Clear permissions cache (useful after role/permission changes)
const clearPermissionsCache = () => {
  permissionsCache.clear();
  cacheTimestamp = null;
};

module.exports = {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
  attachPermissions,
  clearPermissionsCache,
  getRolePermissions
};
