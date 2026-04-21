export const formatGmt7 = (date: Date = new Date()): string => {
  const gmt7Millis = date.getTime() + 7 * 60 * 60 * 1000;
  const gmt7Date = new Date(gmt7Millis);
  const iso = gmt7Date.toISOString().replace('T', ' ');
  return `${iso.slice(0, 19)} GMT+7`;
};

export const formatGmt7DateCode = (date: Date = new Date()): string => {
  const gmt7Millis = date.getTime() + 7 * 60 * 60 * 1000;
  const gmt7Date = new Date(gmt7Millis);
  const day = String(gmt7Date.getUTCDate()).padStart(2, '0');
  const month = String(gmt7Date.getUTCMonth() + 1).padStart(2, '0');
  const year = String(gmt7Date.getUTCFullYear());
  return `${day}${month}${year}`;
};
