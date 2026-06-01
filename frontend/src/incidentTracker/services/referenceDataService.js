import client from '../api/client';

export const fetchIncidentReferenceData = async () => {
  const { data } = await client.get('/incidents/reference-data');
  return data;
};
