import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import RequireAuth from '@/components/layout/RequireAuth';

// Public
import SplashPage from '@/pages/SplashPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import CreateClubPage from '@/pages/CreateClubPage';

// Admin / Gestionnaire
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import MembresPage from '@/pages/admin/MembresPage';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import EquipesPage from '@/pages/admin/EquipesPage';
import JoueursPage from '@/pages/admin/JoueursPage';
import PlanningAdminPage from '@/pages/admin/PlanningPage';
import ActualitesAdminPage from '@/pages/admin/ActualitesPage';

// Dashboard (Joueur / Entraîneur)
import DashboardPage from '@/pages/DashboardPage';
import PlanningPage from '@/pages/dashboard/PlanningPage';
import ActualitesPage from '@/pages/dashboard/ActualitesPage';
import StatsPage from '@/pages/dashboard/StatsPage';
import EquipesPageDash from '@/pages/dashboard/EquipesPage';
import JoueursPageDash from '@/pages/dashboard/JoueursPage';

const ADMIN_ROLES = ['ADMIN', 'GESTIONNAIRE'] as const;
const ALL_ROLES = ['ADMIN', 'GESTIONNAIRE', 'ENTRAINEUR', 'JOUEUR'] as const;
const COACH_ROLES = ['ADMIN', 'GESTIONNAIRE', 'ENTRAINEUR'] as const;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<SplashPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/:token" element={<RegisterPage />} />
          <Route path="/create-club" element={<CreateClubPage />} />

          {/* ── Admin / Gestionnaire ── */}
          <Route
            path="/admin"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <AdminDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/membres"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <MembresPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <CategoriesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/equipes"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <EquipesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/joueurs"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <JoueursPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/planning"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <PlanningAdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/actualites"
            element={
              <RequireAuth roles={[...ADMIN_ROLES]}>
                <ActualitesAdminPage />
              </RequireAuth>
            }
          />

          {/* ── Dashboard Entraîneur / Joueur ── */}
          <Route
            path="/dashboard"
            element={
              <RequireAuth roles={[...ALL_ROLES]}>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/planning"
            element={
              <RequireAuth roles={[...ALL_ROLES]}>
                <PlanningPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/actualites"
            element={
              <RequireAuth roles={[...ALL_ROLES]}>
                <ActualitesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/stats"
            element={
              <RequireAuth roles={['JOUEUR']}>
                <StatsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/equipes"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <EquipesPageDash />
              </RequireAuth>
            }
          />
          <Route
            path="/dashboard/joueurs"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <JoueursPageDash />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
