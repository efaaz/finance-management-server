export const getDateKey = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};