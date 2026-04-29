import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { getCachedApi } from '../utils/Axios';
import { sortItemsByCity } from '../utils/catalog';

const categoryCache = new Map();
const CATEGORY_CACHE_TTL_MS = 2 * 60 * 1000;

const getCachedCategoryItems = (category) => {
  const entry = categoryCache.get(category);

  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    categoryCache.delete(category);
    return null;
  }

  return entry.data;
};

export const useCategorizedEvents = ({ category, userCity, errorMessage }) => {
  const cachedItems = getCachedCategoryItems(category);
  const [items, setItems] = useState(() => sortItemsByCity(cachedItems || [], userCity));
  const [loading, setLoading] = useState(!cachedItems);

  useEffect(() => {
    let isActive = true;

    const applyItems = (rawItems = []) => {
      if (!isActive) return;
      setItems(sortItemsByCity(rawItems, userCity));
      setLoading(false);
    };

    const fetchItems = async () => {
      const cached = getCachedCategoryItems(category);
      if (cached) {
        applyItems(cached);
        return;
      }

      try {
        const { data } = await getCachedApi(
          `/events?category=${category}&status=Approved`,
          {},
          { cacheTTL: CATEGORY_CACHE_TTL_MS }
        );
        if (data.success) {
          categoryCache.set(category, {
            data: data.data || [],
            expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS
          });
          applyItems(data.data);
        }
      } catch {
        if (isActive) {
          toast.error(errorMessage);
          setLoading(false);
        }
      }
    };

    fetchItems();

    return () => {
      isActive = false;
    };
  }, [category, errorMessage, userCity]);

  return { items, loading };
};
