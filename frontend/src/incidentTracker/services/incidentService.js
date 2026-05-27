import client from '../api/client';

export const fetchDashboard = async (month) => {
  const { data } = await client.get('/dashboard', { params: { month } });
  return data;
};

export const fetchIncidents = async (params) => {
  const { data } = await client.get('/incidents', { params });
  return data;
};

export const fetchIncident = async (id) => {
  const { data } = await client.get(`/incidents/${id}`);
  return data;
};

export const createIncident = async (payload) => {
  const { data } = await client.post('/incidents', payload);
  return data;
};

export const updateIncident = async (id, payload) => {
  const { data } = await client.put(`/incidents/${id}`, payload);
  return data;
};

export const deleteIncident = async (id) => client.delete(`/incidents/${id}`);

export const addComment = async (id, payload) => {
  const { data } = await client.post(`/incidents/${id}/comments`, payload);
  return data;
};

export const uploadAttachment = async (id, formData) => {
  const { data } = await client.post(`/incidents/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};

export const exportCsv = async () => {
  const response = await client.get('/reports/csv', { responseType: 'blob' });
  downloadBlob(response.data, 'incident-report.csv');
};

export const exportPdf = async () => {
  const response = await client.get('/reports/pdf', { responseType: 'blob' });
  downloadBlob(response.data, 'incident-report.pdf');
};
