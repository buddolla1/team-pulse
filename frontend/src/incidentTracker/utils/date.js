export const getCurrentMonth = () => new Date().toISOString().slice(0, 7);

export const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
};
