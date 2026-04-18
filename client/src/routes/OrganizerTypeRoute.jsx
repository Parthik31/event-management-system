import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const OrganizerTypeRoute = ({ allowedTypes = [] }) => {
  const { user } = useAuth();

  if (!allowedTypes.includes(user?.businessType)) {
    return <Navigate to="/organizer/dashboard" replace />;
  }

  return <Outlet />;
};

export default OrganizerTypeRoute;
