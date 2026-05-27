const ADMIN_BASE_PATH = '/admin/incident-tracker';
const EMPLOYEE_BASE_PATH = '/employee/incident-tracker';

export const getIncidentTrackerBasePath = () => {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/employee')) {
    return EMPLOYEE_BASE_PATH;
  }

  return ADMIN_BASE_PATH;
};

export const buildIncidentTrackerPath = (suffix = '') => {
  const basePath = getIncidentTrackerBasePath();
  if (!suffix) {
    return basePath;
  }

  const normalizedSuffix = String(suffix).startsWith('/') ? String(suffix) : `/${suffix}`;
  return `${basePath}${normalizedSuffix}`;
};
