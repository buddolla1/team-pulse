import client from '../api/client';

export const login = async (payload) => {
  const { data } = await client.post('/auth/login', payload);
  return data;
};

export const getProfile = async () => {
  const { data } = await client.get('/auth/me');
  return data;
};
