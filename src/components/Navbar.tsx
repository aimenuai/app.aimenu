import { useState } from 'react';
import { Bell, User, Menu, LogOut, ChevronDown, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { createCustomerPortalSession } from '../lib/stripe';
import LanguageSelector from './LanguageSelector';
import { NavbarSubscriptionStatus } from './stripe/NavbarSubscriptionStatus';

interface NavbarProps {
  isSidebarCollapsed: boolean;
  onMobileMenuToggle: () => void;
  hideSidebar?: boolean;
}

export default function Navbar({ isSidebarCollapsed, onMobileMenuToggle, hideSidebar = false }: NavbarProps) {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const handleManageBilling = async () => {
    setBillingLoading(true);
    try {
      await createCustomerPortalSession(window.location.href);
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    } finally {
      setBillingLoading(false);
    }
  };

  return (
    <header className={`fixed top-0 right-0 h-16 bg-white border-b border-gray-200 z-20 transition-all duration-300 ${
      hideSidebar ? 'left-0' : isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'
    }`}>
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <img
            src="https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Aimenu.svg"
            alt="Aimenu"
            className="h-8 lg:hidden"
          />
        </div>

        <div className="flex-1 flex items-center justify-center">
          <NavbarSubscriptionStatus />
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <LanguageSelector />

          <button className="hidden sm:block relative p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-gray-600" />
              </div>
              <ChevronDown className="w-4 h-4 hidden sm:block" />
            </button>

            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm text-gray-500">{t.auth.email}</p>
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleManageBilling}
                    disabled={billingLoading}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-4 h-4" />
                    {billingLoading ? 'Loading...' : 'Manage Billing'}
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    {t.auth.logout}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
