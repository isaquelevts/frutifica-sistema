import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { UserRole } from '../shared/types/types';
import Layout from '../core/layout/Layout';

// Features
import Dashboard from '../features/dashboard/Dashboard';
import CellRegistration from '../features/cells/CellRegistration';
import CellList from '../features/cells/CellList';
import ReportForm from '../features/reports/ReportForm';
import ReportsList from '../features/reports/ReportsList';
import Ranking from '../features/reports/Ranking';
import MyCell from '../features/cells/MyCell';
import RiskMonitoring from '../features/consolidation/RiskMonitoring';
import MembersList from '../features/members/MembersList';
import ManageLeaders from '../features/cells/ManageLeaders';
import ConsolidationDashboard from '../features/consolidation/ConsolidationDashboard';
import CultReports from '../features/reports/CultReports';
import ConsolidationKanban from '../features/consolidation/ConsolidationKanban';
import VisitorForm from '../features/consolidation/VisitorForm';
import VisitorsList from '../features/consolidation/VisitorsList';
import GlobalMembers from '../features/members/GlobalMembers';
import Generations from '../features/generations/Generations';
import Pricing from '../features/settings/Pricing';
import UserRegistration from '../features/settings/UserRegistration';
import PaymentSuccess from '../features/settings/PaymentSuccess';
import BulkImport from '../features/import/pages/BulkImport';

// Auth Feature
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import LeaderRegister from '../features/auth/LeaderRegister';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';

// Landing
import Landing from '../features/landing/Landing';

// Super Admin (lazy loaded)
const SuperAdminDashboard = lazy(() => import('../features/super-admin/pages/SuperAdminDashboard'));
const OrganizationsList = lazy(() => import('../features/super-admin/pages/OrganizationsList'));
const OrganizationDetail = lazy(() => import('../features/super-admin/pages/OrganizationDetail'));
const PlatformSettings = lazy(() => import('../features/super-admin/pages/PlatformSettings'));

const LazyFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

// Guard para rotas normais autenticadas
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-50"><p className="text-slate-500">Carregando...</p></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (roles && user) {
        const hasRole = roles.some(role => user.roles.includes(role));
        if (!hasRole) {
            return <Navigate to="/dashboard" />;
        }
    }

    return <Layout>{children}</Layout>;
};

// Guard exclusivo para SuperAdmin
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isSuperAdmin, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-slate-50"><p className="text-slate-500">Carregando...</p></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (!isSuperAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
    return (
        <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/cadastro-lider/:orgId" element={<LeaderRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* ========================================= */}
            {/* SUPER ADMIN ROUTES — apenas superadmin   */}
            {/* ========================================= */}
            <Route path="/super" element={
                <SuperAdminRoute>
                    <Suspense fallback={<LazyFallback />}>
                        <SuperAdminDashboard />
                    </Suspense>
                </SuperAdminRoute>
            } />
            <Route path="/super/organizations" element={
                <SuperAdminRoute>
                    <Suspense fallback={<LazyFallback />}>
                        <OrganizationsList />
                    </Suspense>
                </SuperAdminRoute>
            } />
            <Route path="/super/organizations/:orgId" element={
                <SuperAdminRoute>
                    <Suspense fallback={<LazyFallback />}>
                        <OrganizationDetail />
                    </Suspense>
                </SuperAdminRoute>
            } />
            <Route path="/super/settings" element={
                <SuperAdminRoute>
                    <Suspense fallback={<LazyFallback />}>
                        <PlatformSettings />
                    </Suspense>
                </SuperAdminRoute>
            } />

            {/* ========================================= */}
            {/* ROTAS GERAIS                             */}
            {/* ========================================= */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

            {/* Leader Routes */}
            <Route path="/my-cell" element={<ProtectedRoute roles={[UserRole.LEADER]}><MyCell /></ProtectedRoute>} />
            <Route path="/members" element={<ProtectedRoute roles={[UserRole.LEADER]}><MembersList /></ProtectedRoute>} />
            <Route path="/report/:cellId" element={<ProtectedRoute roles={[UserRole.LEADER, UserRole.ADMIN]}><ReportForm /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/cells" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CellList /></ProtectedRoute>} />
            <Route path="/register-cell" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CellRegistration /></ProtectedRoute>} />
            <Route path="/edit-cell/:cellId" element={<ProtectedRoute roles={[UserRole.ADMIN]}><CellRegistration /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.LEADER]}><ReportsList /></ProtectedRoute>} />
            <Route path="/edit-report/:reportId" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.LEADER]}><ReportForm /></ProtectedRoute>} />
            <Route path="/leaders" element={<ProtectedRoute roles={[UserRole.ADMIN]}><ManageLeaders /></ProtectedRoute>} />
            <Route path="/generations" element={<ProtectedRoute roles={[UserRole.ADMIN]}><Generations /></ProtectedRoute>} />
            <Route path="/risk-monitoring" element={<ProtectedRoute roles={[UserRole.ADMIN]}><RiskMonitoring /></ProtectedRoute>} />
            <Route path="/all-members" element={<ProtectedRoute roles={[UserRole.ADMIN]}><GlobalMembers /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute roles={[UserRole.ADMIN]}><BulkImport /></ProtectedRoute>} />

            {/* Consolidation Routes (Admin & Introdutores) */}
            <Route path="/consolidation" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><ConsolidationDashboard /></ProtectedRoute>} />
            <Route path="/cult-reports" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><CultReports /></ProtectedRoute>} />
            <Route path="/kanban" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><ConsolidationKanban /></ProtectedRoute>} />
            <Route path="/add-visitor" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><VisitorForm /></ProtectedRoute>} />
            <Route path="/edit-visitor/:visitorId" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><VisitorForm /></ProtectedRoute>} />
            <Route path="/visitors" element={<ProtectedRoute roles={[UserRole.ADMIN, UserRole.INTRODUTOR]}><VisitorsList /></ProtectedRoute>} />

            {/* Payment Routes */}
            <Route path="/pricing" element={<ProtectedRoute roles={[UserRole.ADMIN]}><Pricing /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

            {/* Shared Routes */}
            <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />

            <Route path="*" element={<CatchAllRoute />} />
        </Routes>
    );
};

const CatchAllRoute: React.FC = () => {
    const hash = window.location.hash;

    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Processando autenticação...</p>
                </div>
            </div>
        );
    }

    return <Navigate to="/" />;
};

export default AppRoutes;
