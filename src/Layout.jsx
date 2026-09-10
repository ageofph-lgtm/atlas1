import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, LayoutGrid, ShieldCheck, Truck, LogOut, Menu, X, Cog } from "lucide-react";
import { User } from "@/entities/all";
import { usePermissions } from "@/components/hooks/usePermissions";
import ProfileSelector from "./components/auth/ProfileSelector";

const ALL_NAV_ITEMS = [
  { key: "Entrada", title: "Entrada", url: createPageUrl("Entrada"), icon: Camera, permKey: "canEntrada" },
  { key: "Inventario", title: "Inventário", url: createPageUrl("Inventario"), icon: LayoutGrid, permKey: "canInventario" },
  { key: "Autorizacao", title: "Autorização", url: createPageUrl("Autorizacao"), icon: ShieldCheck, permKey: "canAutorizacao" },
  { key: "Saida", title: "Saída", url: createPageUrl("Saida"), icon: Truck, permKey: "canSaida" },
];

const PAGE_TITLES = {
  Entrada: "ENTRADA DE MÁQUINAS",
  Inventario: "INVENTÁRIO",
  Autorizacao: "AUTORIZAÇÃO",
  Saida: "SAÍDA / RETORNO",
};

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
        ativo: false,
      });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "unset";
  }, [isMobileMenuOpen]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900">
        <Cog className="w-12 h-12 animate-spin text-amber-500" />
        <p className="mt-4 text-sm font-semibold text-slate-400">A carregar...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ProfileSelector onLogin={handleLogin} />;
  }

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) => permissions[item.permKey]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Top Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-800/90 backdrop-blur-md border-b border-slate-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 flex-shrink-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
                  alt="ATLAS"
                  className="w-full h-full object-contain"
                />
              </div>
              <h1 className="text-lg font-bold text-slate-100 tracking-wider">ATLAS</h1>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-1">
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={item.url}
                    className={`px-4 py-2 flex items-center gap-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-amber-500 text-slate-900"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden md:flex items-center gap-3 bg-slate-700/50 px-3 py-1.5 rounded-lg">
                  <div className="bg-amber-500 w-7 h-7 rounded-full flex items-center justify-center">
                    <span className="text-slate-900 font-bold text-xs">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate max-w-[120px]">
                      {user.full_name || "Utilizador"}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {user.perfil?.replace("_", " ").toUpperCase()}
                    </p>
                  </div>
                  <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50"
              >
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[100] md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="absolute top-0 right-0 w-72 h-full bg-slate-800 border-l border-slate-700 shadow-2xl">
            <div className="p-5">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-100">ATLAS</h2>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-slate-400 hover:text-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                {allowedNavItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      to={item.url}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`w-full py-3 px-4 flex items-center gap-3 rounded-lg text-base font-medium transition-colors ${
                        isActive
                          ? "bg-amber-500 text-slate-900"
                          : "text-slate-300 hover:bg-slate-700/50"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.title}
                    </Link>
                  );
                })}
              </div>

              {user && (
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-500 w-9 h-9 rounded-full flex items-center justify-center">
                      <span className="text-slate-900 font-bold">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-200">{user.full_name || "Utilizador"}</p>
                      <p className="text-xs text-slate-500">{user.perfil?.replace("_", " ").toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2.5 bg-slate-700 hover:bg-red-600 text-slate-300 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Terminar Sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div className="pt-20 px-4 sm:px-6 lg:px-8 pb-4">
        <h1 className="text-lg md:text-xl font-bold tracking-wide text-slate-300">
          {PAGE_TITLES[currentPageName] || currentPageName?.toUpperCase() || "ATLAS"}
        </h1>
      </div>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pb-8">
        {React.cloneElement(children, { userPermissions: permissions, currentUser: user })}
      </main>
    </div>
  );
}