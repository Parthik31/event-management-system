export const optimizeCatalogImage = (url) => {
  if (!url) return '';
  if (url.includes('pexels.com') && !url.includes('?')) {
    return `${url}?auto=compress&cs=tinysrgb&w=600&h=400&dpr=1`;
  }
  if (url.includes('unsplash.com') && !url.includes('w=')) {
    return `${url}&auto=format&fit=crop&w=600&q=80`;
  }
  return url;
};

export const sortItemsByCity = (items = [], userCity = '') => {
  const normalizedCity = String(userCity || '').toLowerCase();

  return [...items].sort((left, right) => {
    const leftMatch = String(left?.location || '').toLowerCase().includes(normalizedCity);
    const rightMatch = String(right?.location || '').toLowerCase().includes(normalizedCity);
    return Number(rightMatch) - Number(leftMatch);
  });
};
