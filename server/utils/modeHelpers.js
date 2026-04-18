export const normalizeMode = (value) => {
  const mode = String(value || '').toLowerCase();

  if (['movie', 'movies', 'producer'].includes(mode)) {
    return 'movie';
  }

  if (['multiplex', 'theatre', 'theater', 'cinema'].includes(mode)) {
    return 'multiplex';
  }

  return 'event';
};

export const ensureModeAccess = (user) => {
  const activeMode = normalizeMode(user?.activeMode || user?.businessType);
  const availableModes = [activeMode];

  return { activeMode, availableModes };
};

export const getLegacyBusinessType = (mode) => {
  if (mode === 'movie') {
    return 'producer';
  }

  if (mode === 'multiplex') {
    return 'theatre';
  }

  return 'events';
};
