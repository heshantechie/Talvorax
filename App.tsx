import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ErrorBoundary } from './src/components/ErrorBoundary';

// Fix 15: Lazy load heavy route components for code splitting
const Login = lazy(() => import('./src/pages/Login').then(m => ({ default: m.Login })));
const Signup = lazy(() => import('./src/pages/Signup').then(m => ({ default: m.Signup })));
const Dashboard = lazy(() => import('./src/pages/Dashboard').then(m => ({ default: m.Dashboard })));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full spin-animation" />
      <span className="text-emerald-500 font-bold">Loading...</span>
    </div>
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { session, loading } = useAuth();
  
  if (loading) {
    return <LoadingFallback />;
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/signup" element={session ? <Navigate to="/dashboard" replace /> : <Signup />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={session ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Suspense>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;