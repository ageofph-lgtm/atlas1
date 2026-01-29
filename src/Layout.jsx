
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Kanban, Truck, LogOut, BarChart3, Cog, Menu, X } from "lucide-react";
import { User } from "@/entities/all";
import { usePermissions } from "@/components/hooks/usePermissions";
import ProfileSelector from "./components/auth/ProfileSelector";
import NotificationCenter from "./components/shared/NotificationCenter";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Kanban
  },
  {
    title: "Frota", 
    url: createPageUrl("Frota"),
    icon: Truck
  },
  {
    title: "Relatórios",
    url: createPageUrl("Relatorios"),
    icon: BarChart3
  }
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const permissions = usePermissions(user?.perfil);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      if (userData && userData.perfil) {
        setUser(userData);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.log("User not authenticated or error loading user:", error);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await User.updateMyUserData({
        perfil: null,
        ultimo_acesso: new Date().toISOString(),
        ativo: false
      });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error("Logout error:", error);
      setUser(null);
      setIsAuthenticated(false);
    }
  };
  
  useEffect(() => {
    if(isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isMobileMenuOpen]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
        <Cog className="w-16 h-16 animate-spin text-red-500" />
        <p className="mt-4 text-lg font-semibold text-gray-600">A carregar...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ProfileSelector onLogin={handleLogin} />;
  }

  const allowedNavItems = navigationItems.filter(item => {
    if (item.url.includes('Dashboard')) {
      return permissions.canViewAll;
    }
    if (item.url.includes('Frota')) {
      return permissions.canViewAll;
    }
    if (item.url.includes('Relatorios')) {
      return permissions.canAccessReports;
    }
    return true;
  });

  const getPageTitle = () => {
    switch(currentPageName) {
      case 'Dashboard': return 'PAINEL GERAL';
      case 'Frota': return 'GESTÃO DA FROTA';
      case 'Relatorios': return 'RELATÓRIOS';
      default: return currentPageName?.toUpperCase() || 'ATLAS';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
          }

          .kanban-header-clip {
            clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
          }

          .angled-clip {
            clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%);
          }

          .angled-nav-item {
            clip-path: polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%);
          }

          .kanban-card-clip {
             clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
          }
          
          .glass-navbar {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          }

          .glass-effect {
            background: rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          .nav-btn-active {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: white;
          }

          .nav-btn {
            background: rgba(255, 255, 255, 0.2);
            color: #1f2937;
            border: 1px solid rgba(255, 255, 255, 0.3);
            backdrop-filter: blur(10px);
          }

          .nav-btn:hover {
            background: rgba(255, 255, 255, 0.3);
            transform: translateY(-1px);
          }

          .user-card {
            background: rgba(31, 41, 55, 0.9);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }

          /* Mobile menu styles */
          .mobile-menu-overlay {
            backdrop-filter: blur(10px);
            background: rgba(0, 0, 0, 0.5);
          }

          .mobile-sidebar {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(20px);
            border-left: 1px solid rgba(255, 255, 255, 0.2);
          }
        `}
      </style>

      {/* Top Navigation Bar with Glass Effect */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-navbar">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 flex-shrink-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
                  alt="ATLAS"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-xl font-bold text-gray-800 tracking-wider">ATLAS</h1>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-2">
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    className={`angled-nav-item px-6 py-3 flex items-center space-x-2 text-sm font-semibold transition-all duration-200 ${
                      isActive ? 'nav-btn-active' : 'nav-btn hover:nav-btn-hover'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Notification Center */}
              <NotificationCenter />

              {/* User Info - Desktop */}
              {user && (
                <div className="hidden md:flex items-center space-x-3 user-card px-4 py-2 angled-clip">
                  <div className="bg-red-500 w-8 h-8 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate text-sm">
                      {user.full_name || 'Utilizador'}
                    </p>
                    <p className="text-xs text-gray-300 truncate">
                      {user.perfil?.replace('_', ' ').toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-gray-300 hover:text-white transition-colors p-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button 
                onClick={() => setIsMobileMenuOpen(true)} 
                className="md:hidden p-2 rounded-full glass-effect text-gray-700 z-40 relative"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="mobile-menu-overlay fixed inset-0" onClick={() => setIsMobileMenuOpen(false)}></div>
          
          <div className="mobile-sidebar fixed top-0 right-0 w-80 h-full shadow-2xl z-[110]">
            <div className="p-6">
              {/* Header with Logo */}
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center space-x-3">
                  <img
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
                    alt="ATLAS"
                    className="w-8 h-8 object-contain"
                  />
                  <h2 className="text-xl font-bold text-white">ATLAS</h2>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-white hover:text-gray-300 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Mobile Navigation Links */}
              <div className="space-y-3 mb-8">
                {allowedNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  
                  return (
                    <Link
                      key={item.title}
                      to={item.url}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`angled-clip w-full py-4 px-6 flex items-center space-x-3 text-base font-semibold transition-all duration-200 ${
                        isActive 
                          ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md' 
                          : 'bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white/30'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Mobile User Section */}
              {user && (
                <div className="bg-gray-800/90 backdrop-blur-md p-4 angled-clip border border-white/20">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-red-500 w-10 h-10 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold">
                        {user.full_name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-white">
                        {user.full_name || 'Utilizador'}
                      </p>
                      <p className="text-sm text-gray-300">
                        {user.perfil?.replace('_', ' ').toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white angled-clip transition-colors flex items-center justify-center space-x-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Terminar Sessão</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Title Section - Hidden when mobile menu is open */}
      <div className={`pt-24 px-4 sm:px-6 lg:px-8 pb-6 transition-opacity duration-300 ${
        isMobileMenuOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'
      }`}>
        <div className="bg-gray-800 text-white py-4 px-8 angled-clip inline-block">
          <h1 className="text-xl md:text-2xl font-bold tracking-wide">{getPageTitle()}</h1>
        </div>
      </div>

      {/* Main Content - Hidden when mobile menu is open */}
      <main className={`px-4 sm:px-6 lg:px-8 pb-8 transition-opacity duration-300 ${
        isMobileMenuOpen ? 'opacity-0 pointer-events-none md:opacity-100 md:pointer-events-auto' : 'opacity-100'
      }`}>
        {React.cloneElement(children, { userPermissions: permissions, currentUser: user })}
      </main>
    </div>
  );
}
