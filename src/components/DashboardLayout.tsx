import { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ImpersonationBanner from './ImpersonationBanner';
import { useAuth } from '../contexts/AuthContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
  hideSidebar?: boolean;
}

export default function DashboardLayout({ children, hideSidebar = false }: DashboardLayoutProps) {
  const { isImpersonating } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <ImpersonationBanner />
      <div className={isImpersonating ? 'pt-12' : ''}>
        <Navbar
          isSidebarCollapsed={hideSidebar ? false : isSidebarCollapsed}
          onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          hideSidebar={hideSidebar}
        />
        {!hideSidebar && (
          <Sidebar
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            isMobileMenuOpen={isMobileMenuOpen}
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        )}

        <main
          className={`pt-16 transition-all duration-300 ${!hideSidebar ? 'lg:ml-64' : ''}`}
        >
          <div className="p-4 sm:p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
