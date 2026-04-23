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

export const formatDateOnlyGmt7 = (date: Date = new Date()): string => {
  const gmt7Millis = date.getTime() + 7 * 60 * 60 * 1000;
  return new Date(gmt7Millis).toISOString().slice(0, 10);
};

export const getGmt7DateRangeStrings = (
  dateFrom?: Date,
  dateTo?: Date
): { from?: string; to?: string } => {
  if (!dateFrom && !dateTo) {
    return {};
  }

  const from = dateFrom ? `${formatDateOnlyGmt7(dateFrom)} 00:00:00 GMT+7` : undefined;
  const to = dateTo ? `${formatDateOnlyGmt7(dateTo)} 23:59:59 GMT+7` : undefined;

  return { from, to };
};

export const parseGmt7StringToDate = (value?: string): Date | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(' GMT+7', '+07:00').replace(' ', 'T');
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
};
