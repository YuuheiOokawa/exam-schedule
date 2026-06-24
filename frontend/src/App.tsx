import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { HeldQualificationsProvider } from '@/contexts/HeldQualificationsContext';
import { WishlistProvider } from '@/contexts/WishlistContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { AppFooter } from '@/components/layout/AppFooter';
import { ToastContainer } from '@/components/feedback/Toast';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorBoundary } from '@/components/feedback/ErrorBoundary';
import { ROUTES } from '@/constants/routes';

const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage'));
const ResetPasswordPage   = lazy(() => import('@/pages/ResetPasswordPage'));
const PricingPage         = lazy(() => import('@/pages/PricingPage'));
const PrivacyPage         = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage           = lazy(() => import('@/pages/TermsPage'));
const TokushoPage         = lazy(() => import('@/pages/TokushoPage'));
const SupportPage         = lazy(() => import('@/pages/SupportPage'));
const NotFoundPage        = lazy(() => import('@/pages/NotFoundPage'));

const DashboardPage           = lazy(() => import('@/pages/DashboardPage'));
const QualificationsPage      = lazy(() => import('@/pages/QualificationsPage'));
const QualificationDetailPage = lazy(() => import('@/pages/QualificationDetailPage'));
const CalendarPage            = lazy(() => import('@/pages/CalendarPage'));
const AdminPage               = lazy(() => import('@/pages/AdminPage'));
const HeldPage                = lazy(() => import('@/pages/HeldPage'));
const WishlistPage            = lazy(() => import('@/pages/WishlistPage'));
const RoadmapPage             = lazy(() => import('@/pages/RoadmapPage'));
const LoginPage               = lazy(() => import('@/pages/LoginPage'));
const RegisterPage            = lazy(() => import('@/pages/RegisterPage'));
const EmailSentPage           = lazy(() => import('@/pages/EmailSentPage'));
const SetPasswordPage         = lazy(() => import('@/pages/SetPasswordPage'));
const ProfilePage             = lazy(() => import('@/pages/ProfilePage'));

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-[var(--bg)]">
      <Sidebar />

      <div className="flex-1 min-h-screen flex flex-col lg:ml-[var(--sidebar-w)] min-w-0 w-0">
        <main className="flex-1 pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom,0px))] lg:pb-0 min-w-0">
          <ErrorBoundary>
          <Suspense fallback={<LoadingState />}>
            <Routes>
              <Route path={ROUTES.HOME}           element={<DashboardPage />} />
              <Route path={ROUTES.LIST}           element={<QualificationsPage />} />
              <Route path="/qualification/:id"    element={<QualificationDetailPage />} />
              <Route path={ROUTES.LOGIN}          element={<LoginPage />} />
              <Route path={ROUTES.REGISTER}       element={<RegisterPage />} />
              <Route path={ROUTES.EMAIL_SENT}     element={<EmailSentPage />} />
              <Route path={ROUTES.SET_PASSWORD}   element={<SetPasswordPage />} />
              <Route path={ROUTES.PROFILE}          element={<ProfilePage />} />
              <Route path={ROUTES.ROADMAP}          element={<RoadmapPage />} />
              <Route path={ROUTES.FORGOT_PASSWORD}  element={<ForgotPasswordPage />} />
              <Route path={ROUTES.RESET_PASSWORD}   element={<ResetPasswordPage />} />
              <Route path={ROUTES.PRICING}          element={<PricingPage />} />

              <Route path={ROUTES.HELD} element={
                <ProtectedRoute><HeldPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.WISHLIST} element={
                <ProtectedRoute><WishlistPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.CALENDAR} element={
                <ProtectedRoute><CalendarPage /></ProtectedRoute>
              } />
              <Route path={ROUTES.ADMIN} element={
                <ProtectedRoute requireAdmin><AdminPage /></ProtectedRoute>
              } />

              <Route path={ROUTES.PRIVACY}  element={<PrivacyPage />} />
              <Route path={ROUTES.TERMS}    element={<TermsPage />} />
              <Route path={ROUTES.TOKUSHO}  element={<TokushoPage />} />
              <Route path={ROUTES.SUPPORT}  element={<SupportPage />} />
              <Route path="*"               element={<NotFoundPage />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
        </main>
        <AppFooter />
      </div>

      <BottomNav />
      <ToastContainer />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <HeldQualificationsProvider>
              <WishlistProvider>
                <BrowserRouter>
                  <AppLayout />
                </BrowserRouter>
              </WishlistProvider>
            </HeldQualificationsProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
