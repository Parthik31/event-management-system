export const formatSearchDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
};

export const buildEventSearchParams = ({
  query = '',
  category = 'All',
  priceFilter = 'All',
  dateFilter = ''
} = {}) => {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (category && category !== 'All') params.set('category', category);

  if (priceFilter === 'Free') params.set('maxPrice', '0');
  if (priceFilter === 'Under500') {
    params.set('minPrice', '1');
    params.set('maxPrice', '500');
  }
  if (priceFilter === '500-2000') {
    params.set('minPrice', '500');
    params.set('maxPrice', '2000');
  }
  if (priceFilter === 'Above2000') params.set('minPrice', '2001');

  if (dateFilter === 'Today') {
    const today = formatSearchDate();
    params.set('startDate', today);
    params.set('endDate', today);
  }

  if (dateFilter === 'Tomorrow') {
    const tomorrow = formatSearchDate(1);
    params.set('startDate', tomorrow);
    params.set('endDate', tomorrow);
  }

  return params.toString();
};
