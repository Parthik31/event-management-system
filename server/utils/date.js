const INDIA_TIMEZONE = 'Asia/Kolkata';

export const formatDateInTimezone = (value = new Date(), timeZone = INDIA_TIMEZONE) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(value);

export const getTodayDateString = (timeZone = INDIA_TIMEZONE) =>
  formatDateInTimezone(new Date(), timeZone);

export const getTomorrowDateString = (timeZone = INDIA_TIMEZONE) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return formatDateInTimezone(tomorrow, timeZone);
};

export { INDIA_TIMEZONE };
