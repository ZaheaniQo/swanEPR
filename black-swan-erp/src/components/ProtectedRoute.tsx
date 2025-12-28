
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useApp } from '../AppContext';
import { Role } from '../types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, isLoading, currentUserRole } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(currentUserRole)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-text-muted">
        <div className="text-center">
          <div className="text-2xl font-semibold text-primary">Permission Denied</div>
          <div className="mt-2 text-sm">You do not have access to this page.</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
