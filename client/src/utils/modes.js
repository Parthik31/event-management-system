import api from './Axios';

export const MODE_META = {
  event: {
    label: 'Event Mode',
    shortLabel: 'Event',
    description: 'Events, plays, and activities',
    organizerCreateRoute: '/organizer/create-event'
  },
  movie: {
    label: 'Movie Mode',
    shortLabel: 'Movie',
    description: 'Movie releases and show performance',
    organizerCreateRoute: '/organizer/create-movie'
  },
  multiplex: {
    label: 'Multiplex Mode',
    shortLabel: 'Multiplex',
    description: 'Multiplex operations and screen analytics',
    organizerCreateRoute: '/organizer/multiplexes'
  }
};

export const formatCurrency = (value) =>
  `Rs ${Number(value || 0).toLocaleString('en-IN')}`;

export const syncActiveMode = async (mode, setAuthUser, currentUser) => {
  const { data } = await api.put('/auth/active-mode', { activeMode: mode });

  if (data.success && setAuthUser) {
    setAuthUser({
      ...(currentUser || {}),
      ...data.data
    });
  }

  return data.data;
};
