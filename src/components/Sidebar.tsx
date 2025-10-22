import { ChevronLeft, ChevronRight, Image, Menu as MenuIcon, QrCode, Calendar, Settings, X, Phone, FileText, Shield, Users, LayoutDashboard, UserCog } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isMobileMenuOpen: boolean;
  onMobileMenuToggle: () => void;
}

export default function Sidebar({ isCollapsed, onToggle, isMobileMenuOpen, onMobileMenuToggle }: SidebarProps) {
  const { t } = useLanguage();
  const location = useLocation();
  const { userRole, isImpersonating } = useAuth();

  console.log('Sidebar - Current userRole:', userRole);

  const menuItems = [
    {
      title: t.nav.general,
      items: [
        { label: t.nav.dashboard, icon: LayoutDashboard, href: '/dashboard' },
      ]
    },
    {
      title: t.nav.myRestaurant,
      items: [
        { label: t.nav.visualIdentity, icon: Image, href: '/dashboard/visual-identity' },
        { label: t.nav.contactInfo, icon: Phone, href: '/dashboard/contact-info' },
        { label: t.nav.myMenus, icon: MenuIcon, href: '/dashboard/menu' },
        { label: t.nav.qrCode, icon: QrCode, href: '/dashboard/qr-code' },
      ]
    },
    {
      title: t.nav.clientServices,
      items: [
        { label: t.nav.reservations, icon: Calendar, href: '/dashboard/reservations' },
      ]
    },
    {
      title: t.nav.configuration,
      items: [
        { label: t.nav.settings, icon: Settings, href: '/dashboard/settings' },
      ]
    }
  ];

  const adminSection = {
    title: 'Administration',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin', roles: ['admin'] },
      { label: 'Clients', icon: Users, href: '/admin/clients', roles: ['admin'] },
      { label: 'Resellers', icon: UserCog, href: '/admin/resellers', roles: ['admin'] },
      { label: 'Admins', icon: Shield, href: '/admin/admins', roles: ['admin'] },
      { label: 'Reseller Dashboard', icon: Users, href: '/reseller', roles: ['admin', 'reseller'] },
    ]
  };

  return (
    <>
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileMenuToggle}
        ></div>
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-50 lg:z-30 ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
      <div className="flex flex-col h-full">
        <div className={`flex items-center p-4 border-b border-gray-200 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <img
            src={isCollapsed
              ? "https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Logo_icon.svg"
              : "https://pub-237d2da54b564d23aaa1c3826e1d4e65.r2.dev/Aimenu/Aimenu.svg"
            }
            alt="Aimenu"
            className={`transition-all ${isCollapsed ? 'h-8 w-8' : 'h-8'}`}
          />
          {!isCollapsed && (
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((section, sectionIdx) => (
            <div key={sectionIdx} className="mb-6">
              {!isCollapsed && (
                <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {section.title}
                </h3>
              )}
              <ul className="space-y-1">
                {section.items.map((item, itemIdx) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={itemIdx}>
                      <Link
                        to={item.href}
                        onClick={() => onMobileMenuToggle()}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isActive
                            ? 'bg-sidebar-active text-white font-medium'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {(userRole === 'admin' || userRole === 'reseller') && !isImpersonating && (
            <div className="mb-6">
              {!isCollapsed && (
                <h3 className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  {adminSection.title}
                </h3>
              )}
              <ul className="space-y-1">
                {adminSection.items.map((item, itemIdx) => {
                  console.log('Checking admin item:', item.label, 'userRole:', userRole, 'allowed roles:', item.roles);
                  if (!userRole || !item.roles.includes(userRole)) return null;
                  const isActive = location.pathname === item.href;
                  return (
                    <li key={itemIdx}>
                      <Link
                        to={item.href}
                        onClick={() => onMobileMenuToggle()}
                        className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          isActive
                            ? 'bg-sidebar-active text-white font-medium'
                            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        } ${isCollapsed ? 'justify-center' : ''}`}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onToggle}
            className="hidden lg:flex items-center justify-center w-full p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </aside>
    </>
  );
}
