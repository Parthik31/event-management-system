import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import api from '../utils/Axios';
import { sortItemsByCity } from '../utils/catalog';

const categoryCache = new Map();

export const useCategorizedEvents = ({ category, userCity, errorMessage }) => {
  const cachedItems = categoryCache.get(category);
  const [items, setItems] = useState(() => sortItemsByCity(cachedItems || [], userCity));
  const [loading, setLoading] = useState(!cachedItems);

  useEffect(() => {
    const applyItems = (rawItems = []) => {
      setItems(sortItemsByCity(rawItems, userCity));
      setLoading(false);
    };

    const fetchItems = async () => {
      const cached = categoryCache.get(category);
      if (cached) {
        applyItems(cached);
        return;
      }

      try {
        const { data } = await api.get(`/events?category=${category}&status=Approved`);
        if (data.success) {
          categoryCache.set(category, data.data);
          applyItems(data.data);
        }
      } catch {
        toast.error(errorMessage);
        setLoading(false);
      }
    };

    fetchItems();
  }, [category, errorMessage, userCity]);

  return { items, loading };
};
