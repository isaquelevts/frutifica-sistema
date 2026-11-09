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
import MembersList from '../features/members/MembersList';
import ManageLeaders from '../features/cells/ManageLeaders';
import Generations from '../features/generations/Generations';
import RiskMonitoring from '../features/consolidation/RiskMonitoring';
import Pricing from '../features/settings/Pricing';
import UserRegistration from '../features/settings/UserRegistration';
import PaymentSuccess from '../features/settings/PaymentSuccess';
import BulkImport from '../features/import/pages/BulkImport';
import WhatsappSettings from '../features/settings/WhatsappSettings';
import InviteManager from '../features/invites/InviteManager';
import { consolidationAccess } from '../features/consolidacao/consolidacaoService';

// Auth Feature
import Login from '../features/auth/Login';
import Register from '../features/auth/Register';
import LeaderRegister from '../features/auth/LeaderRegister';
import InviteAccept from '../features/invites/InviteAccept';
import ForgotPassword from '../features/auth/ForgotPassword';
import ResetPassword from '../features/auth/ResetPassword';

// Landing
import Landing from '../features/landing/Landing';

// Super Admin (lazy loaded)
const SuperAdminDashboard = lazy(() => import('../features/super-admin/pages/SuperAdminDashboard'));
const OrganizationsList = lazy(() => import('../features/super-admin/pages/OrganizationsList'));
const OrganizationDetail = lazy(() => import('../features/super-admin/pages/OrganizationDetail'));
const PlatformSettings = lazy(() => import('../features/super-admin/pages/PlatformSettings'));

// Consolidação (lazy loaded)
const PainelConsolidacao = lazy(() => import('../features/consolidacao/PainelConsolidacao'));
const PessoasPage = lazy(() => import('../features/consolidacao/PessoasPage'));
const PessoaForm = lazy(() => import('../features/consolidacao/PessoaForm'));
const PessoaDetalhe = lazy(() => import('../features/consolidacao/PessoaDetalhe'));
const EquipePage = lazy(() => import('../features/consolidacao/EquipePage'));

const CONSOLIDACAO_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CONSOLIDACAO_GESTOR, UserRole.CONSOLIDADOR];
const CONSOLIDACAO_GESTOR_ROLES = [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.CONSOLIDACAO_GESTOR];

const LazyFallback = () => (
  <div className="flex items-center justify-center h-64">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Redireciona líderes direto para o formulário de relatório
const LeaderRedirect: React.FC = () => {
    const { user, isAdmin, isSuperAdmin } = useAuth();
    if (!isAdmin && !isSuperAdmin && user?.roles?.includes(UserRole.LEADER) && user?.cellId) {
        return <Navigate to={`/report/${user.cellId}`} replace />;
    }
    // Quem só tem acesso à consolidação (sem célula) cai direto no módulo.
    const isCellUser = user?.roles?.some(r => r === UserRole.LEADER || r === UserRole.COLEADER) || !!user?.cellId;
    if (!isAdmin && !isSuperAdmin && !isCellUser && consolidationAccess(user?.roles)) {
        return <Navigate to="/consolidacao" replace />;
    }
    return <Dashboard />;
};

// Gestor vê o painel; consolidador vai direto para a fila de pessoas.
const ConsolidacaoHome: React.FC = () => {
    const { user } = useAuth();
    if (consolidationAccess(user?.roles) === 'gestor') return <PainelConsolidacao />;
    return <Navigate to="/consolidacao/pessoas" replace />;
};

const Lazy: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <Suspense fallback={<LazyFallback />}>{children}</Suspense>
);

// Guard para rotas normais autenticadas
const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center bg-muted/50"><p className="text-muted-foreground">Carregando...</p></div>;
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
        return <div className="flex h-screen items-center justify-center bg-muted/50"><p className="text-muted-foreground">Carregando...</p></div>;
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
            <Route path="/convite/:token" element={<InviteAccept />} />
            {/* @deprecated — substituído por /convite/:token (convite revogável e com validade).
                Mantido só para links antigos que já circulam. */}
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
            <Route path="/dashboard" element={<ProtectedRoute><LeaderRedirect /></ProtectedRoute>} />

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
            <Route path="/invites" element={<ProtectedRoute roles={[UserRole.ADMIN]}><InviteManager /></ProtectedRoute>} />
            <Route path="/generations" element={<ProtectedRoute roles={[UserRole.ADMIN]}><Generations /></ProtectedRoute>} />
            <Route path="/import" element={<ProtectedRoute roles={[UserRole.ADMIN]}><BulkImport /></ProtectedRoute>} />
            <Route path="/whatsapp-settings" element={<ProtectedRoute roles={[UserRole.ADMIN]}><WhatsappSettings /></ProtectedRoute>} />

            {/* Payment Routes */}
            <Route path="/pricing" element={<ProtectedRoute roles={[UserRole.ADMIN]}><Pricing /></ProtectedRoute>} />
            <Route path="/payment-success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />

            {/* Shared Routes */}
            <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
            <Route path="/risk-monitoring" element={<ProtectedRoute roles={[UserRole.ADMIN]}><RiskMonitoring /></ProtectedRoute>} />

            {/* Consolidação — visitantes e novos convertidos */}
            <Route path="/consolidacao" element={<ProtectedRoute roles={CONSOLIDACAO_ROLES}><Lazy><ConsolidacaoHome /></Lazy></ProtectedRoute>} />
            <Route path="/consolidacao/pessoas" element={<ProtectedRoute roles={CONSOLIDACAO_ROLES}><Lazy><PessoasPage /></Lazy></ProtectedRoute>} />
            <Route path="/consolidacao/nova" element={<ProtectedRoute roles={CONSOLIDACAO_ROLES}><Lazy><PessoaForm /></Lazy></ProtectedRoute>} />
            <Route path="/consolidacao/pessoas/:id" element={<ProtectedRoute roles={CONSOLIDACAO_ROLES}><Lazy><PessoaDetalhe /></Lazy></ProtectedRoute>} />
            <Route path="/consolidacao/pessoas/:id/editar" element={<ProtectedRoute roles={CONSOLIDACAO_ROLES}><Lazy><PessoaForm /></Lazy></ProtectedRoute>} />
            <Route path="/consolidacao/equipe" element={<ProtectedRoute roles={CONSOLIDACAO_GESTOR_ROLES}><Lazy><EquipePage /></Lazy></ProtectedRoute>} />

            <Route path="*" element={<CatchAllRoute />} />
        </Routes>
    );
};

const CatchAllRoute: React.FC = () => {
    const hash = window.location.hash;

    if (hash.includes('access_token') || hash.includes('type=recovery') || hash.includes('error=')) {
        return (
            <div className="flex h-screen items-center justify-center bg-muted/50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-muted-foreground font-medium">Processando autenticação...</p>
                </div>
            </div>
        );
    }

    return <Navigate to="/" />;
};

export default AppRoutes;
