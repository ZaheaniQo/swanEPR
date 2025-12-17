
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUserRole, isLoading, profileStatus } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentUserRole === Role.SUPER_ADMIN) {
    return <>{children}</>;
  }

  if (allowedRoles && !allowedRoles.includes(currentUserRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
