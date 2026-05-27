const db = require('../config/database');

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

const normalizeRoleName = (value) => String(value || '').trim().toLowerCase();
const normalizeWorkLocation = (value) => String(value || '').trim().toLowerCase();

const isTeamMemberRole = (roleName) => normalizeRoleName(roleName) === 'team member';
const isTeamLeadRole = (roleName) => normalizeRoleName(roleName) === 'team lead';
const isLimitedEmployeeRole = (roleName) => isTeamMemberRole(roleName) || isTeamLeadRole(roleName);
const isOnsiteWorkLocation = (workLocation) => normalizeWorkLocation(workLocation) === 'onsite';

const getEmployeeRoleName = async (employeeId) => {
  const [rows] = await db.query(
    'SELECT role FROM employees WHERE id = ?',
    [employeeId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0].role || null;
};

const getEmployeeWorkLocation = async (employeeId) => {
  const [rows] = await db.query(
    'SELECT work_location FROM employees WHERE id = ?',
    [employeeId]
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0].work_location || null;
};

const getEmployeeAccessProfile = async (employeeId) => {
  const roleName = await getEmployeeRoleName(employeeId);
  const workLocation = await getEmployeeWorkLocation(employeeId);
  const limited = isLimitedEmployeeRole(roleName);
  const basePermissions = isTeamMemberRole(roleName)
    ? TEAM_MEMBER_PERMISSIONS
    : isTeamLeadRole(roleName)
      ? TEAM_LEAD_PERMISSIONS
      : FULL_EMPLOYEE_PERMISSIONS;
  const permissions = isOnsiteWorkLocation(workLocation)
    ? basePermissions
    : basePermissions.filter((permission) => !permission.startsWith('leave_tracker.'));

  return {
    roleName,
    roleDisplayName: roleName,
    workLocation,
    isLimited: limited,
    permissions
  };
};

module.exports = {
  TEAM_MEMBER_PERMISSIONS,
  TEAM_LEAD_PERMISSIONS,
  FULL_EMPLOYEE_PERMISSIONS,
  getEmployeeAccessProfile,
  getEmployeeWorkLocation,
  isLimitedEmployeeRole,
  isTeamLeadRole,
  isTeamMemberRole,
  isOnsiteWorkLocation,
  normalizeRoleName
};
