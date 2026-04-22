import React, { Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ThemeProvider } from './providers/ThemeProvider';
import { AuthProvider } from './providers/AuthProvider';
import { SocketProvider } from './providers/SocketProvider';
import { NotificationProvider } from './providers/NotificationProvider';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { ROUTES } from './config/api.config';

import { AppLayout } from './components/layout/AppLayout';

const LoginPage = React.lazy(() => import('./pages/auth/LoginPage').then(m => ({ default: m.LoginPage })));
const RegisterPage = React.lazy(() => import('./pages/auth/RegisterPage').then(m => ({ default: m.RegisterPage })));
const JiraTicketsPage = React.lazy(() => import('./pages/jira-tickets/JiraTicketsPage').then(m => ({ default: m.JiraTicketsPage })));
const GenerationQueuePage = React.lazy(() => import('./pages/generation-queue/GenerationQueuePage').then(m => ({ default: m.GenerationQueuePage })));
const TestCasesPage = React.lazy(() => import('./pages/test-cases/TestCasesPage').then(m => ({ default: m.TestCasesPage })));
const ExportsPage = React.lazy(() => import('./pages/exports/ExportsPage').then(m => ({ default: m.ExportsPage })));
const DashboardPage = React.lazy(() => import('./pages/dashboard/DashboardPage').then(m => ({ default: m.DashboardPage })));
const AdminPage = React.lazy(() => import('./pages/admin/AdminPage').then(m => ({ default: m.AdminPage })));

// -------------------------------------------------------------
// Query Client Setup
// -------------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SocketProvider>
            <NotificationProvider>
              <BrowserRouter>
                <Suspense fallback={<div className="flex h-screen items-center justify-center p-4">Loading App Modules...</div>}>
                  <Routes>
                    {/* Public Routes */}
                    <Route path={ROUTES.auth.login} element={<LoginPage />} />
                    <Route path={ROUTES.auth.register} element={<RegisterPage />} />

                    {/* Protected Routes */}
                    <Route element={<ProtectedRoute />}>
                      <Route element={<AppLayout />}>
                        <Route path="/" element={<Navigate to={ROUTES.dashboard} replace />} />
                        <Route path={ROUTES.dashboard} element={<DashboardPage />} />
                        <Route path={ROUTES.jiraTickets} element={<JiraTicketsPage />} />
                        <Route path={ROUTES.generationQueue} element={<GenerationQueuePage />} />
                        <Route path={ROUTES.testCases} element={<TestCasesPage />} />
                        <Route path={ROUTES.exports} element={<ExportsPage />} />
                        <Route path={ROUTES.admin} element={<AdminPage />} />
                      </Route>
                    </Route>

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to={ROUTES.dashboard} />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
              <Toaster position="bottom-right" richColors theme="system" />
            </NotificationProvider>
          </SocketProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
