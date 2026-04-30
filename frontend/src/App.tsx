import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { I18nProvider } from '@/contexts/I18nContext';
import RequireAuth from '@/components/layout/RequireAuth';

// Public
import SplashPage from '@/pages/SplashPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import CreateClubPage from '@/pages/CreateClubPage';

// Gestionnaire
import AdminDashboardPage from '@/pages/admin/DashboardPage';
import MembresPage from '@/pages/admin/MembresPage';
import CategoriesPage from '@/pages/admin/CategoriesPage';
import EquipesPage from '@/pages/admin/EquipesPage';
import EquipeDetailPage from '@/pages/admin/EquipeDetailPage';
import ClubPage from '@/pages/admin/ClubPage';
import JoinPage from '@/pages/JoinPage';
import ProfilePage from '@/pages/ProfilePage';
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

const GESTIONNAIRE_ROLES = ['GESTIONNAIRE'] as const;
const COACH_ROLES = ['GESTIONNAIRE', 'ENTRAINEUR'] as const;
const ALL_ROLES = ['GESTIONNAIRE', 'ENTRAINEUR', 'JOUEUR'] as const;

export default function App() {
  return (
    <BrowserRouter>
      <I18nProvider>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<SplashPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register/:token" element={<RegisterPage />} />
          <Route path="/register" element={<Navigate to="/join" replace />} />
          <Route path="/create-club" element={<CreateClubPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/join/:code" element={<JoinPage />} />

          {/* ── Gestionnaire + Entraîneur ── */}
          <Route
            path="/admin"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <AdminDashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/membres"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <MembresPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/categories"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <CategoriesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/equipes"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <EquipesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/equipes/:id"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <EquipeDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/joueurs"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <JoueursPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/planning"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <PlanningAdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/actualites"
            element={
              <RequireAuth roles={[...COACH_ROLES]}>
                <ActualitesAdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/admin/club"
            element={
              <RequireAuth roles={[...GESTIONNAIRE_ROLES]}>
                <ClubPage />
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

          {/* ── Profil (tous rôles) ── */}
          <Route
            path="/profile"
            element={
              <RequireAuth roles={[...ALL_ROLES]}>
                <ProfilePage />
              </RequireAuth>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
      </I18nProvider>
    </BrowserRouter>
  );
}
