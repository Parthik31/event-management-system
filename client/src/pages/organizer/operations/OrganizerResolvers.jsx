// filepath: /frontend/src/pages/organizer/OrganizerResolvers.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';

// Import Dashboards
import EventDashboard from '../dashboard/EventDashboard';
import MovieDashboard from '../dashboard/MovieDashboard';
import MultiplexDashboard from '../dashboard/MultiplexDashboard';

// Import Finance Ledgers
import EventFinance from '../finance/EventFinance';
import MovieFinance from '../finance/MovieFinance';
import MultiplexFinance from '../finance/MultiplexFinance';

/**
 * 🚦 DASHBOARD RESOLVER
 * Automatically routes the user to their specific business dashboard
 */
export const DashboardResolver = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.businessType) {
    case 'producer':
      return <MovieDashboard />;
    case 'theatre':
      return <MultiplexDashboard />;
    case 'events':
    default:
      return <EventDashboard />;
  }
};

/**
 * 💰 FINANCE RESOLVER
 * Automatically routes the user to their specific settlement ledger
 */
export const FinanceResolver = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  switch (user.businessType) {
    case 'producer':
      return <MovieFinance />;
    case 'theatre':
      return <MultiplexFinance />;
    case 'events':
    default:
      return <EventFinance />;
  }
};

// Backwards-compatible aliases for existing routes in `client/src/App.jsx`
export const OrganizerDashboardResolver = DashboardResolver;
export const OrganizerFinanceResolver = FinanceResolver;
