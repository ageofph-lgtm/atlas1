import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Camera, LayoutGrid, ShieldCheck, Truck, LogOut, Cog, BarChart3, Bell } from "lucide-react";
import { User } from "@/entities/all";
import { usePermissions } from "@/components/hooks/usePermissions";
import ProfileSelector from "./components/auth/ProfileSelector";
import ThemeSwitcher from "./components/atlas/ThemeSwitcher";
import CaixaMensagens from "./components/atlas/CaixaMensagens";
import AvisoSemRede from "./components/atlas/AvisoSemRede";
import { useMensagens } from "@/hooks/useMensagens";
import { podeUsarMensagens } from "@/components/atlas/mensagens";

const ALL_NAV_ITEMS = [
  { key: "Entrada", title: "Entrada", url: createPageUrl("Entrada"), icon: Camera, permKey: "canEntrada" },
  { key: "Inventario", title: "Inventário", url: createPageUrl("Inventario"), icon: LayoutGrid, permKey: "canInventario" },
  { key: "Autorizacao", title: "Autorização", url: createPageUrl("Autorizacao"), icon: ShieldCheck, permKey: "canAutorizacao" },
  { key: "Saida", title: "Saída", url: createPageUrl("Saida"), icon: Truck, permKey: "canSaida" },
  { key: "Relatorios", title: "Relatórios", url: createPageUrl("Relatorios"), icon: BarChart3, permKey: "canRelatorios" },
];

const PAGE_TITLES = {
  Entrada: "ENTRADA DE MÁQUINAS",
  Inventario: "INVENTÁRIO",
  Autorizacao: "AUTORIZAÇÃO",
  Saida: "SAÍDA / RETORNO",
  Relatorios: "RELATÓRIOS",
};

/** Sino da caixa de mensagens, com o número de mensagens por ler. */
function SinoMensagens({ porLer, onOpen, compact = false, className = "" }) {
  return (
    <button
      onClick={onOpen}
      aria-label={`Mensagens${porLer ? ` — ${porLer} por ler` : ""}`}
      title="Mensagens"
      className={`relative rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 items-center transition-colors ${compact ? "p-1.5" : "p-2"} ${className}`}
    >
      <Bell className={compact ? "w-3.5 h-3.5" : "w-4 h-4"} />
      {porLer > 0 && (
        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] px-1 flex items-center justify-center">
          {porLer > 99 ? "99+" : porLer}
        </span>
      )}
    </button>
  );
}

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const permissions = usePermissions(user?.perfil);
  const [caixaAberta, setCaixaAberta] = useState(false);
  const caixa = useMensagens(user);
  const temCaixa = podeUsarMensagens(user?.perfil);

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
    const defaultRoute = userData?.perfil === "logistica" ? createPageUrl("Entrada") : createPageUrl("Inventario");
    navigate(defaultRoute);
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
      <AvisoSemRede />
      {/* Top Navigation */}
      <nav className="atlas-nav fixed top-0 left-0 right-0 z-50 glass border-b border-slate-700">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14 md:h-16 gap-2">
            {/* Logo + brand chip */}
            <div className="flex items-center">
              <div className="w-9 h-9 flex-shrink-0">
                <img
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
                  alt="ATLAS"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="brand-chip ml-3 hidden md:inline-flex">ATLAS</span>
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

              {/* Identidade compacta no mobile — vinha da gaveta */}
              {user && (
                <div className="flex md:hidden items-center gap-2 min-w-0">
                  <div className="bg-amber-500 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-slate-900 font-bold text-xs">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate max-w-[96px] leading-tight">
                      {user.full_name || "Utilizador"}
                    </p>
                    <p className="text-[9px] text-slate-500 truncate leading-tight">
                      {user.perfil?.replace("_", " ").toUpperCase()}
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    aria-label="Terminar sessão"
                    className="text-slate-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

              {temCaixa && <SinoMensagens porLer={caixa.porLer} onOpen={() => setCaixaAberta(true)} className="hidden md:flex" />}
              <ThemeSwitcher className="hidden md:block" />
            </div>
          </div>

          {/* Navegação mobile — substitui a gaveta lateral: um toque, sem animação */}
          <div className="md:hidden flex items-center gap-1 h-11">
            <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto no-scrollbar">
              {allowedNavItems.map((item) => {
                const isActive = location.pathname === item.url;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.key}
                    to={item.url}
                    title={item.title}
                    aria-label={item.title}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-lg transition-colors flex-shrink-0 ${
                      isActive
                        ? "bg-amber-500 text-slate-900 px-2.5 py-1.5 text-xs font-bold"
                        : "text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 p-2"
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {/* Só o item activo mostra o rótulo, para os cinco caberem no ecrã */}
                    {isActive && <span className="whitespace-nowrap">{item.title}</span>}
                  </Link>
                );
              })}
            </div>
            {temCaixa && <SinoMensagens porLer={caixa.porLer} onOpen={() => setCaixaAberta(true)} compact className="flex flex-shrink-0" />}
            <ThemeSwitcher compact className="flex-shrink-0" />
          </div>
        </div>
      </nav>

      <CaixaMensagens
        open={caixaAberta}
        onClose={() => setCaixaAberta(false)}
        onAbrirMaquina={(m) => {
          // A mensagem leva à máquina: o inventário abre já com ela procurada e em destaque.
          setCaixaAberta(false);
          navigate(`${createPageUrl("Inventario")}?serie=${encodeURIComponent(m.serie)}${m.ciclo_id ? `&ciclo=${m.ciclo_id}` : ""}`);
        }}
        mensagens={caixa.mensagens}
        porLer={caixa.porLer}
        isLoading={caixa.isLoading}
        naoLida={caixa.naoLida}
        onMarcarLida={caixa.marcarLida}
        onMarcarTodasLidas={caixa.marcarTodasLidas}
      />

      {/* Page Title */}
      <div className="pt-[108px] md:pt-20 px-4 sm:px-6 lg:px-8 pb-4">
        <h1 className="page-title text-lg md:text-xl font-bold tracking-wide text-slate-300">
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