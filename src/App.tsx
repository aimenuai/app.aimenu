import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import VisualIdentity from './pages/VisualIdentity';
import ContactInfo from './pages/ContactInfo';
import QRCode from './pages/QRCode';
import Menu from './pages/Menu';
import MenuDetail from './pages/MenuDetail';
import MenuSettings from './pages/MenuSettings';
import AIImport from './pages/AIImport';
import PublicLanding from './pages/PublicLanding';
import PublicMenuDetail from './pages/PublicMenuDetail';
import Abonnement from './pages/Abonnement';
import { SuccessPage } from './pages/SuccessPage';
import { SignupPage } from './pages/SignupPage';
import AdminOverview from './pages/AdminOverview';
import AdminClients from './pages/AdminClients';
import AdminResellers from './pages/AdminResellers';
import AdminUsers from './pages/AdminUsers';
import AdminSubscriptions from './pages/AdminSubscriptions';
import ResellerDashboard from './pages/ResellerDashboard';
import ClientDetail from './pages/ClientDetail';
import ResellerDetail from './pages/ResellerDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <AdminOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/clients"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <AdminClients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/resellers"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <AdminResellers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/admins"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/subscriptions"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <AdminSubscriptions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="reseller">
                  <ResellerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/client/:clientId"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <ClientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reseller/:resellerId"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="admin">
                  <ResellerDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reseller/client/:clientId"
              element={
                <ProtectedRoute allowWithoutSubscription requiredRole="reseller">
                  <ClientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/abonnement"
              element={
                <ProtectedRoute allowWithoutSubscription>
                  <Abonnement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/visual-identity"
              element={
                <ProtectedRoute>
                  <VisualIdentity />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/contact-info"
              element={
                <ProtectedRoute>
                  <ContactInfo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/qr-code"
              element={
                <ProtectedRoute>
                  <QRCode />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu"
              element={
                <ProtectedRoute>
                  <Menu />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu/:menuId"
              element={
                <ProtectedRoute>
                  <MenuDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu/:menuId/settings"
              element={
                <ProtectedRoute>
                  <MenuSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/menu/:menuId/ai-import"
              element={
                <ProtectedRoute>
                  <AIImport />
                </ProtectedRoute>
              }
            />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/:slug" element={<PublicLanding />} />
            <Route path="/:slug/menu/:menuId" element={<PublicMenuDetail />} />
          </Routes>
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
