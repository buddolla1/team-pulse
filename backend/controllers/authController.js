const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { generateToken } = require('../middleware/authMiddleware');
const { getEmployeeAccessProfile } = require('../utils/employeeAccess');

const DEFAULT_EMPLOYEE_PASSWORD_HASH = '$2b$10$2M/kF0XYmTIc0zwyeFMqsOFWrBlfE73eaFadGJIumeqC4TdO.n9pO';

// Login admin user
const loginAdmin = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    // Find admin by username with role information
    const [admins] = await db.query(
      `SELECT au.*, r.id as role_id, r.name as role_name, r.display_name as role_display_name
       FROM admin_users au
       LEFT JOIN roles r ON au.role_id = r.id
       WHERE au.username = ?`,
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const admin = admins[0];

    // Check if admin is active
    if (admin.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the system administrator.'
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    // Update last login
    await db.query(
      'UPDATE admin_users SET last_login = CURRENT_TIMESTAMP WHERE id = ?',
      [admin.id]
    );

    // Log the login action
    /*await db.query(
      'INSERT INTO audit_logs (admin_id, action, entity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        admin.id,
        'LOGIN',
        'admin_users',
        'Admin user logged in',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      ]
    );
*/
    // Generate token with role information
    const token = generateToken({
      id: admin.id,
      username: admin.username,
      email: admin.email,
      full_name: admin.full_name,
      status: admin.status,
      role_id: admin.role_id,
      role_name: admin.role_name,
      user_type: 'admin'
    });

    // Return success with token and admin info
    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          full_name: admin.full_name,
          status: admin.status,
          role_id: admin.role_id,
          role_name: admin.role_name,
          role_display_name: admin.role_display_name,
          last_login: admin.last_login
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
};

const getEmployeeAssignedProjects = async (employeeId) => {
  const [assignedProjects] = await db.query(
    `SELECT DISTINCT
       p.id AS project_id,
       p.project_team_name,
       pt.agile_board_name,
       COALESCE(NULLIF(pt.agile_board_name, ''), p.project_team_name) AS project_label,
       pe.team_id,
       pe.allocation_percentage
     FROM project_employees pe
     INNER JOIN projects p ON p.id = pe.project_id
     LEFT JOIN project_teams pt ON pt.id = pe.team_id
     WHERE pe.employee_id = ?
     ORDER BY pt.agile_board_name, p.project_team_name`,
    [employeeId]
  );

  return assignedProjects;
};

const loginEmployee = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
    }

    const [employees] = await db.query(
      `SELECT e.*,
              r.id AS auth_role_id,
              r.name AS auth_role_name,
              r.display_name AS auth_role_display_name
       FROM employees e
       LEFT JOIN roles r ON e.role_id = r.id
       WHERE e.sso = ?`,
      [username]
    );

    if (employees.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const employee = employees[0];

    if (employee.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is not active. Please contact the system administrator.'
      });
    }

    const passwordHash = employee.password_hash || DEFAULT_EMPLOYEE_PASSWORD_HASH;
    const isPasswordValid = await bcrypt.compare(password, passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password.'
      });
    }

    const needsPasswordChange = Boolean(employee.must_change_password) || !employee.password_hash;
    const employeeAccessProfile = await getEmployeeAccessProfile(employee.id);
    const assignedProjects = await getEmployeeAssignedProjects(employee.id);

    await db.query(
      'UPDATE employees SET last_login = CURRENT_TIMESTAMP, password_hash = COALESCE(password_hash, ?), must_change_password = CASE WHEN password_hash IS NULL THEN 1 ELSE must_change_password END WHERE id = ?',
      [DEFAULT_EMPLOYEE_PASSWORD_HASH, employee.id]
    );

    const token = generateToken({
      id: employee.id,
      username: employee.sso,
      email: null,
      full_name: employee.name,
      status: employee.status,
      role_id: employee.role_id || null,
      role_name: employeeAccessProfile.roleName || employee.role || null,
      user_type: 'employee'
    });

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        employee: {
          id: employee.id,
          username: employee.sso,
          name: employee.name,
          role: employee.role,
          role_type: employee.role_type,
          work_location: employee.work_location || null,
          status: employee.status,
          role_id: employee.role_id || null,
          auth_role_name: employeeAccessProfile.roleName || employee.role || null,
          auth_role_display_name: employeeAccessProfile.roleDisplayName || employee.role || null,
          must_change_password: needsPasswordChange,
          permissions: employeeAccessProfile.permissions,
          accesses: employeeAccessProfile.permissions,
          assigned_projects: assignedProjects,
          project_assignments: assignedProjects
        }
      }
    });
  } catch (error) {
    console.error('Employee login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login.'
    });
  }
};

// Get current admin profile
const getProfile = async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT au.id, au.username, au.email, au.full_name, au.status, au.last_login, au.created_at,
              r.id as role_id, r.name as role_name, r.display_name as role_display_name, r.description as role_description
       FROM admin_users au
       LEFT JOIN roles r ON au.role_id = r.id
       WHERE au.id = ?`,
      [req.admin.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.'
      });
    }

    res.json({
      success: true,
      data: {
        ...admins[0],
        permissions: req.admin.permissions || [],
        accesses: req.admin.permissions || []
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile.'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    // Get current admin
    const [admins] = await db.query(
      'SELECT * FROM admin_users WHERE id = ?',
      [req.admin.id]
    );

    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found.'
      });
    }

    const admin = admins[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      'UPDATE admin_users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, req.admin.id]
    );

    // Log the password change
    await db.query(
      'INSERT INTO audit_logs (admin_id, action, entity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.admin.id,
        'UPDATE',
        'admin_users',
        'Admin changed password',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      ]
    );

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password.'
    });
  }
};

// Logout (client-side token removal, but log the action)
const logoutAdmin = async (req, res) => {
  try {
    // Log the logout action
    await db.query(
      'INSERT INTO audit_logs (admin_id, action, entity_type, description, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
      [
        req.admin.id,
        'LOGOUT',
        'admin_users',
        'Admin user logged out',
        req.ip || req.connection.remoteAddress,
        req.headers['user-agent'] || 'Unknown'
      ]
    );

    res.json({
      success: true,
      message: 'Logout successful.'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout.'
    });
  }
};

const getEmployeeProfile = async (req, res) => {
  try {
    const [employees] = await db.query(
      `SELECT e.*,
              r.name AS auth_role_name,
              r.display_name AS auth_role_display_name
       FROM employees e
       LEFT JOIN roles r ON e.role_id = r.id
       WHERE e.id = ?`,
      [req.employee.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    const employee = employees[0];
    const employeeAccessProfile = await getEmployeeAccessProfile(employee.id);
    const assignedProjects = await getEmployeeAssignedProjects(employee.id);

    res.json({
      success: true,
      data: {
        ...employee,
        must_change_password: Boolean(employee.must_change_password),
        auth_role_name: employeeAccessProfile.roleName || employee.role || null,
        auth_role_display_name: employeeAccessProfile.roleDisplayName || employee.role || null,
        work_location: employee.work_location || null,
        permissions: employeeAccessProfile.permissions,
        accesses: employeeAccessProfile.permissions,
        assigned_projects: assignedProjects,
        project_assignments: assignedProjects
      }
    });
  } catch (error) {
    console.error('Get employee profile error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile.'
    });
  }
};

const getEmployeeProfileLite = async (req, res) => {
  try {
    const [employees] = await db.query(
      `SELECT e.id,
              e.sso,
              e.name,
              e.role,
              e.role_type,
              e.work_location,
              e.status,
              e.last_login,
              e.role_id,
              e.must_change_password,
              r.name AS auth_role_name,
              r.display_name AS auth_role_display_name
       FROM employees e
       LEFT JOIN roles r ON e.role_id = r.id
       WHERE e.id = ?`,
      [req.employee.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    const employee = employees[0];
    const employeeAccessProfile = await getEmployeeAccessProfile(employee.id);
    const assignedProjects = await getEmployeeAssignedProjects(employee.id);

    res.json({
      success: true,
      data: {
        id: employee.id,
        sso: employee.sso,
        name: employee.name,
        role: employee.role,
        role_type: employee.role_type,
        work_location: employee.work_location || null,
        status: employee.status,
        last_login: employee.last_login,
        role_id: employee.role_id,
        auth_role_name: employeeAccessProfile.roleName || employee.role || null,
        auth_role_display_name: employeeAccessProfile.roleDisplayName || employee.role || null,
        must_change_password: Boolean(employee.must_change_password),
        permissions: employeeAccessProfile.permissions,
        accesses: employeeAccessProfile.permissions,
        assigned_projects: assignedProjects,
        project_assignments: assignedProjects
      }
    });
  } catch (error) {
    console.error('Get employee profile lite error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching profile.'
    });
  }
};

const changeEmployeePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    const [employees] = await db.query(
      'SELECT * FROM employees WHERE id = ?',
      [req.employee.id]
    );

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    const employee = employees[0];
    const currentHash = employee.password_hash || DEFAULT_EMPLOYEE_PASSWORD_HASH;
    const isPasswordValid = await bcrypt.compare(currentPassword, currentHash);

    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await db.query(
      'UPDATE employees SET password_hash = ?, must_change_password = 0, password_changed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newPasswordHash, req.employee.id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully.'
    });
  } catch (error) {
    console.error('Change employee password error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while changing password.'
    });
  }
};

module.exports = {
  loginAdmin,
  getProfile,
  changePassword,
  logoutAdmin,
  loginEmployee,
  getEmployeeProfile,
  getEmployeeProfileLite,
  changeEmployeePassword
};
