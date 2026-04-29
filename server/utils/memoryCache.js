const cacheStore = new Map();

const cloneValue = (value) => {
  if (value == null) return value;

  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

export const getCacheValue = (key) => {
  const entry = cacheStore.get(key);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cacheStore.delete(key);
    return null;
  }

  return cloneValue(entry.value);
};

export const setCacheValue = (key, value, ttlMs = 30000) => {
  cacheStore.set(key, {
    value: cloneValue(value),
    expiresAt: Date.now() + ttlMs
  });

  return value;
};

export const withCache = async (key, ttlMs, factory) => {
  const cached = getCacheValue(key);
  if (cached) {
    return cached;
  }

  const freshValue = await factory();
  setCacheValue(key, freshValue, ttlMs);
  return freshValue;
};

export const clearCacheKey = (key) => {
  cacheStore.delete(key);
};

export const clearCacheByPrefix = (prefix) => {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
};

export const clearAllCache = () => {
  cacheStore.clear();
};
