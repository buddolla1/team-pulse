import client from '../../services/api';

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const fetchLeaves = async (params = {}) => {
  const { data } = await client.get('/leave-tracker', { params });
  return data;
};

export const fetchLeave = async (id) => {
  const { data } = await client.get(`/leave-tracker/${id}`);
  return data;
};

export const createLeave = async (payload) => {
  const { data } = await client.post('/leave-tracker', payload);
  return data;
};

export const exportLeavesExcel = async (params = {}) => {
  const response = await client.get('/leave-tracker/export/excel', {
    params,
    responseType: 'blob'
  });

  downloadBlob(response.data, 'leave-tracker-report.xlsx');
};
