const normalizeBasePath = () => {
  if (typeof window === 'undefined') {
    return '/admin/leave-tracker';
  }

  return window.location.pathname.startsWith('/employee')
    ? '/employee/leave-tracker'
    : '/admin/leave-tracker';
};

export const buildLeaveTrackerPath = (path = '') => {
  const basePath = normalizeBasePath();
  const cleanPath = String(path).startsWith('/') ? path : `/${path}`;
  return `${basePath}${cleanPath === '/' ? '' : cleanPath}`;
};

export const getLeaveTrackerBasePath = () => normalizeBasePath();
