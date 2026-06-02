import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5010/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const isEmployeePath = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/employee');

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

const clearAuthStorage = () => {
  sessionStorage.removeItem('adminToken');
  sessionStorage.removeItem('adminUser');
  sessionStorage.removeItem('adminPermissions');
  localStorage.removeItem('adminToken');
  localStorage.removeItem('adminUser');
  localStorage.removeItem('adminPermissions');
};

// Request interceptor to add token to headers
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      if (isEmployeePath()) {
        sessionStorage.removeItem('employeeToken');
        sessionStorage.removeItem('employeeUser');
        sessionStorage.removeItem('employeePermissions');
        window.location.href = '/employee/login';
      } else {
        clearAuthStorage();
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

// Employee API calls
export const getAllEmployees = (page = 1, limit = 10, roleType = null, sortField = 'created_at', sortOrder = 'DESC', search = null, project = null, team = null, role = null, status = null) => {
  const params = { page, limit };
  if (roleType && roleType !== 'All') {
    params.role_type = roleType;
  }
  if (role && role !== 'All') {
    params.role = role;
  }
  if (sortField) {
    params.sortField = sortField;
  }
  if (sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  if (project && project !== 'All') {
    params.project = project;
  }
  if (team && team !== 'All') {
    params.team = team;
  }
  if (status && status !== 'All') {
    params.status = status;
  }
  return api.get('/employees', { params });
};
export const getEmployeeById = (id) => api.get(`/employees/${id}`);
export const createEmployee = (data) => api.post('/employees', data);
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data);
export const resetEmployeePassword = (id) => api.post(`/employees/${id}/reset-password`);
export const deleteEmployee = (id) => api.delete(`/employees/${id}`);
export const getEmployeeRoles = () => api.get('/employees/roles/lookup');

// Project API calls
export const getAllProjects = (page = 1, limit = 10, status = null, sortField = 'created_at', sortOrder = 'DESC', search = null) => {
  const params = { page, limit };
  if (status && status !== 'All') {
    params.status = status;
  }
  if (sortField) {
    params.sortField = sortField;
  }
  if (sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  return api.get('/projects', { params });
};
export const getProjectById = (id) => api.get(`/projects/${id}`);
export const createProject = (data) => api.post('/projects', data);
export const updateProject = (id, data) => api.put(`/projects/${id}`, data);
export const deleteProject = (id) => api.delete(`/projects/${id}`);
export const assignEmployeesToProject = (projectId, data) => api.put(`/projects/${projectId}/employees`, data);

// Project Teams API calls
export const getAllTeams = () => api.get('/projects/teams/all');
export const getProjectTeams = (projectId) => api.get(`/projects/${projectId}/teams`);
export const createProjectTeam = (projectId, data) => api.post(`/projects/${projectId}/teams`, data);
export const updateProjectTeam = (teamId, data) => api.put(`/projects/teams/${teamId}`, data);
export const deleteProjectTeam = (teamId) => api.delete(`/projects/teams/${teamId}`);

// Project Team Employees API calls
export const getTeamEmployees = (teamId) => api.get(`/projects/teams/${teamId}/employees`);
export const assignEmployeesToTeam = (teamId, data) => api.put(`/projects/teams/${teamId}/employees`, data);
export const removeEmployeeFromTeam = (assignmentId) => api.delete(`/projects/team-employees/${assignmentId}`);

// Visa History API calls
export const getVisaHistory = (employeeId) => api.get(`/visa/employee/${employeeId}`);
export const getVisaHistoryById = (id) => api.get(`/visa/${id}`);
export const createVisaHistory = (data) => api.post('/visa', data);
export const updateVisaHistory = (id, data) => api.put(`/visa/${id}`, data);
export const deleteVisaHistory = (id) => api.delete(`/visa/${id}`);
export const getUpcomingVisaExpirations = (days = 90) => api.get('/visa/expirations', { params: { days } });

// Asset Management API calls
export const getAllAssets = (page = 1, limit = 10, status = null, assetType = null, sortField = 'created_at', sortOrder = 'DESC', search = null) => {
  const params = { page, limit };
  if (status && status !== 'All') {
    params.status = status;
  }
  if (assetType && assetType !== 'All') {
    params.asset_type = assetType;
  }
  if (sortField) {
    params.sortField = sortField;
  }
  if (sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  return api.get('/assets', { params });
};
export const getMyAssets = () => api.get('/assets/my');
export const getAssetById = (id) => api.get(`/assets/${id}`);
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);
export const assignAsset = (id, data) => api.put(`/assets/${id}/assign`, data);
export const unassignAsset = (id) => api.put(`/assets/${id}/unassign`);
export const getAssetsByEmployee = (employeeId) => api.get(`/assets/employee/${employeeId}`);

// Invoice Management API calls
export const getEmployeesForInvoice = (projectId, teamId = null) => {
  const params = { projectId };
  if (teamId) {
    params.teamId = teamId;
  }
  return api.get('/invoices/employees', { params });
};

export const getEmployeesByPo = (poId) => {
  return api.get('/invoices/employees-by-po', { params: { poId } });
};
export const getAllInvoices = (page = 1, limit = 10, status = null, projectId = null, teamId = null, month = null, year = null) => {
  const params = { page, limit };
  if (status && status !== 'All') {
    params.status = status;
  }
  if (projectId) {
    params.projectId = projectId;
  }
  if (teamId) {
    params.teamId = teamId;
  }
  if (month) {
    params.month = month;
  }
  if (year) {
    params.year = year;
  }
  return api.get('/invoices', { params });
};
export const getInvoiceById = (id) => api.get(`/invoices/${id}`);
export const checkInvoiceExists = (projectId, teamId, month, year) => {
  const params = new URLSearchParams({
    project_id: projectId,
    invoice_month: month,
    invoice_year: year
  });
  if (teamId) {
    params.append('team_id', teamId);
  }
  return api.get(`/invoices/check-exists?${params.toString()}`);
};
export const createInvoice = (data) => api.post('/invoices', data);
export const updateInvoice = (id, data) => api.put(`/invoices/${id}`, data);
export const deleteInvoice = (id) => api.delete(`/invoices/${id}`);
export const downloadInvoicePDF = async (id, invoiceNumber) => {
  const response = await api.get(`/invoices/${id}/pdf`, {
    responseType: 'blob'
  });

  // Create a blob from the PDF data
  const blob = new Blob([response.data], { type: 'application/pdf' });

  // Create a link element and trigger download
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice-${invoiceNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return response;
};

export const sendInvoiceEmail = (id, emailData) => {
  return api.post(`/invoices/${id}/send-email`, emailData);
};

// Lookup API calls
export const getLookupsByCategory = (category) => api.get(`/lookups/category/${category}`);
export const getAllLookupCategories = () => api.get('/lookups/categories');
export const getAllLookups = () => api.get('/lookups/all');
export const createLookup = (data) => api.post('/lookups', data);
export const updateLookup = (id, data) => api.put(`/lookups/${id}`, data);
export const deleteLookup = (id) => api.delete(`/lookups/${id}`);

// PO Management API calls
export const getAllPos = (page = 1, limit = 10, status = null, sortField = 'created_at', sortOrder = 'DESC', search = null) => {
  const params = { page, limit };
  if (status && status !== 'All') {
    params.status = status;
  }
  if (sortField) {
    params.sortField = sortField;
  }
  if (sortOrder) {
    params.sortOrder = sortOrder;
  }
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  return api.get('/pos', { params });
};
export const getPoById = (id) => api.get(`/pos/${id}`);
export const createPo = (data) => api.post('/pos', data);
export const updatePo = (id, data) => api.put(`/pos/${id}`, data);
export const deletePo = (id) => api.delete(`/pos/${id}`);
export const getPosByProject = (projectId) => api.get(`/pos/project/${projectId}`);
export const importPos = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/pos/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

// Sprint KPI API calls
export const getSprintKpiSprints = (filters = {}) => {
  const params = {};
  const normalized = typeof filters === 'number' || typeof filters === 'string'
    ? { project_id: filters }
    : (filters || {});

  if (normalized.project_id) params.project_id = normalized.project_id;
  if (normalized.sprint_start_date) params.sprint_start_date = normalized.sprint_start_date;
  if (normalized.start_date) params.start_date = normalized.start_date;
  if (normalized.month) params.month = normalized.month;
  if (normalized.agile_board_name) params.agile_board_name = normalized.agile_board_name;

  return api.get('/sprint-kpi/sprints', { params });
};

export const createSprintKpiSprint = (data) => api.post('/sprint-kpi/sprints', data);

export const getSprintKpiStories = (filters = {}) => {
  const params = {};
  const normalized = typeof filters === 'number' || typeof filters === 'string'
    ? { sprint_id: filters }
    : (filters || {});

  if (normalized.sprint_id) params.sprint_id = normalized.sprint_id;
  if (normalized.project_id) params.project_id = normalized.project_id;
  if (normalized.sprint_start_date) params.sprint_start_date = normalized.sprint_start_date;
  if (normalized.start_date) params.start_date = normalized.start_date;
  if (normalized.month) params.month = normalized.month;
  if (normalized.agile_board_name) params.agile_board_name = normalized.agile_board_name;

  return api.get('/sprint-kpi/stories', { params });
};

export const createSprintKpiStory = (data) => api.post('/sprint-kpi/stories', data);
export const updateSprintKpiStory = (id, data) => api.put(`/sprint-kpi/stories/${id}`, data);
export const deleteSprintKpiStory = (id) => api.delete(`/sprint-kpi/stories/${id}`);

export const createSprintKpiEntry = (storyId, data) => api.post(`/sprint-kpi/stories/${storyId}/kpis`, data);
export const updateSprintKpiEntry = (id, data) => api.put(`/sprint-kpi/kpis/${id}`, data);
export const deleteSprintKpiEntry = (id) => api.delete(`/sprint-kpi/kpis/${id}`);

// Dynamic Fields API calls
export const listDynamicSchemas = () => api.get('/dynamic-fields/schemas');
export const getDynamicSchema = (moduleKey, entityKey) => api.get(`/dynamic-fields/schemas/${moduleKey}/${entityKey}`);
export const createDynamicSchema = (data) => api.post('/dynamic-fields/schemas', data);
export const updateDynamicSchema = (id, data) => api.put(`/dynamic-fields/schemas/${id}`, data);
export const deleteDynamicSchema = (id) => api.delete(`/dynamic-fields/schemas/${id}`);
export const loadReleaseManagementTemplate = () => api.post('/dynamic-fields/templates/release-management');
export const createDynamicField = (schemaId, data) => api.post(`/dynamic-fields/schemas/${schemaId}/fields`, data);
export const updateDynamicField = (fieldId, data) => api.put(`/dynamic-fields/fields/${fieldId}`, data);
export const deleteDynamicField = (fieldId) => api.delete(`/dynamic-fields/fields/${fieldId}`);
export const getDynamicRecordValues = (recordType, recordId) => api.get(`/dynamic-fields/records/${recordType}/${recordId}`);
export const saveDynamicRecordValues = (recordType, recordId, data) => api.put(`/dynamic-fields/records/${recordType}/${recordId}`, data);
export const deleteDynamicRecordValues = (recordType, recordId) => api.delete(`/dynamic-fields/records/${recordType}/${recordId}`);

// Navigation API calls
export const getNavigationItems = (surface = null) => {
  const params = {};
  if (surface) {
    params.surface = surface;
  }
  return api.get('/navigation-items', { params });
};
export const createNavigationItem = (data) => api.post('/navigation-items', data);
export const updateNavigationItem = (id, data) => api.put(`/navigation-items/${id}`, data);
export const deleteNavigationItem = (id) => api.delete(`/navigation-items/${id}`);

// Release Management API calls
export const getAllReleases = (page = 1, limit = 10, releaseStatus = 'All', sortField = 'created_at', sortOrder = 'DESC', search = '', releaseMonth = '') => {
  const params = { page, limit, sortField, sortOrder };
  if (releaseStatus && releaseStatus !== 'All') {
    params.release_status = releaseStatus;
  }
  if (search && search.trim() !== '') {
    params.search = search.trim();
  }
  if (releaseMonth) {
    params.release_month = releaseMonth;
  }
  return api.get('/releases', { params });
};
export const getReleaseById = (id) => api.get(`/releases/${id}`);
export const createRelease = (data) => api.post('/releases', data);
export const updateRelease = (id, data) => api.put(`/releases/${id}`, data);
export const deleteRelease = (id) => api.delete(`/releases/${id}`);

export default api;
