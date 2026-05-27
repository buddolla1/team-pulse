import axios from 'axios';

const client = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5010/api',
});

const isEmployeePath = () => typeof window !== 'undefined' && window.location.pathname.startsWith('/employee');

client.interceptors.request.use((config) => {
  const employeeToken = sessionStorage.getItem('employeeToken');
  const adminToken = sessionStorage.getItem('adminToken');
  const token = isEmployeePath() ? (employeeToken || adminToken) : (adminToken || employeeToken);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (isEmployeePath()) {
        sessionStorage.removeItem('employeeToken');
        sessionStorage.removeItem('employeeUser');
        sessionStorage.removeItem('employeePermissions');
        window.location.href = '/employee/login';
      } else {
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('adminPermissions');
        window.location.href = '/';
      }
    }
    return Promise.reject(error);
  }
);

export default client;
