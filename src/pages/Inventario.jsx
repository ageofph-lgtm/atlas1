import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Package } from "lucide-react";
import CicloCard from "@/components/atlas/CicloCard";
import FilterBar from "@/components/atlas/FilterBar";
import ReservaModal from "@/components/atlas/ReservaModal";
import EditMaquinaModal from "@/components/atlas/EditMaquinaModal";
import DeleteMaquinaModal from "@/components/atlas/DeleteMaquinaModal";
import SaidaRapidaModal from "@/components/atlas/SaidaRapidaModal";
import TarefasModal from "@/components/atlas/TarefasModal";
import { authorizeCiclo } from "@/components/atlas/authorizeCiclo";
import { useSyncWatcher } from "@/hooks/useSyncWatcher";
import { INVENTARIO_TABS, CATEGORIA_CONFIG } from "@/components/atlas/constants";

const POR_FAZER_ESTADOS = ["entrada", "classificada", "autorizada", "em_execucao", "manutencao"];

export default function Inventario({ currentUser, userPermissions }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [activeTab, setActiveTab] = useState("por_fazer");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ categoria: "all", estado: "all", mastro: "all", vias_mastro: "all", tipo_pneu: "all" });
  const [reservaCiclo, setReservaCiclo] = useState(null);
  const [editMaquina, setEditMaquina] = useState(null);
  const [editCiclo, setEditCiclo] = useState(null);
  const [deleteMaquina, setDeleteMaquina] = useState(null);
  const [saidaRapidaCiclo, setSaidaRapidaCiclo] = useState(null);
  const [autorizarCicloState, setAutorizarCicloState] = useState(null);
  const [autorizando, setAutorizando] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allCiclos = await base44.entities.Ciclo.list("-created_date", 500);
      const visibleCiclos = currentUser?.perfil === "administrador"
        ? allCiclos
        : allCiclos.filter((c) => c.estado !== "fechado");
      const allMaquinas = await base44.entities.Maquina.list("-created_date", 500);
      setCiclos(visibleCiclos);
      setMaquinas(allMaquinas);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useSyncWatcher(loadData);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("atlasToWatcher", { action: "sync_status", autor });
      const data = res?.data !== undefined ? res.data : res;
      if (data.error) throw new Error(data.error);
      toast({ title: "✓ Sincronizado com o Watcher", description: `${data.updated} atualizações` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro no sync", description: err.message });
    }
    setSyncing(false);
  };

  const handleTarefasConfirm = async ({ tarefas, isVps, isExpress }) => {
    if (!autorizarCicloState) return;
    setAutorizando(autorizarCicloState.id);
    try {
      const data = await authorizeCiclo(autorizarCicloState.id, autor, { tarefas, isVps, isExpress });
      toast({ title: "✓ Autorizada", description: `Watcher O.S.: ${data.watcher_os_id}` });
      setAutorizarCicloState(null);
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro na autorização", description: err.message });
    }
    setAutorizando(null);
  };

  const maquinaMap = useMemo(() => {
    const map = {};
    maquinas.forEach((m) => {
      map[m.id] = m;
      if (m.serie) map["serie:" + m.serie] = m;
    });
    return map;
  }, [maquinas]);

  const getMaquina = (ciclo) =>
    (ciclo.maquina_id && maquinaMap[ciclo.maquina_id]) ||
    (ciclo.serie && maquinaMap["serie:" + ciclo.serie]) ||
    null;

  // Tab counts (unfiltered)
  const tabCounts = useMemo(() => ({
    por_fazer: ciclos.filter((c) => POR_FAZER_ESTADOS.includes(c.estado) && c.categoria !== "sucata").length,
    prontas: ciclos.filter((c) => c.estado === "pronta").length,
    recon: ciclos.filter((c) => c.categoria === "recon").length,
    uts: ciclos.filter((c) => c.categoria === "uts").length,
    sucata: ciclos.filter((c) => c.categoria === "sucata").length,
    em_aluguer: ciclos.filter((c) => c.estado === "em_aluguer").length,
    fechados: ciclos.filter((c) => c.estado === "fechado").length,
  }), [ciclos]);

  // Search: tokenized, case-insensitive, across all fields
  const matchesSearch = (ciclo, maquina, query) => {
    if (!query || !query.trim()) return true;
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return true;
    const fields = [
      ciclo?.serie, ciclo?.categoria, ciclo?.cone_cor, ciclo?.cone_numero, ciclo?.reserva_cliente,
      maquina?.modelo, maquina?.ano, maquina?.mastro, maquina?.vias_mastro,
      maquina?.joystick, maquina?.tipo_pneu, maquina?.h3, maquina?.bateria, ...(maquina?.acessorios || []),
    ].filter(Boolean).map((f) => String(f).toLowerCase());
    return tokens.every((token) => fields.some((f) => f.includes(token)));
  };

  // Filter pills
  const passesFilters = (ciclo, maquina) => {
    if (filters.categoria !== "all" && ciclo.categoria !== filters.categoria) return false;
    if (filters.estado !== "all" && ciclo.estado !== filters.estado) return false;
    if (filters.mastro !== "all" && maquina?.mastro !== filters.mastro) return false;
    if (filters.vias_mastro !== "all" && maquina?.vias_mastro !== filters.vias_mastro) return false;
    if (filters.tipo_pneu !== "all" && maquina?.tipo_pneu !== filters.tipo_pneu) return false;
    return true;
  };

  // Tab filter
  const getTabCiclos = () => {
    switch (activeTab) {
      case "por_fazer": return ciclos.filter((c) => POR_FAZER_ESTADOS.includes(c.estado) && c.categoria !== "sucata");
      case "prontas": return ciclos.filter((c) => c.estado === "pronta");
      case "recon": return ciclos.filter((c) => c.categoria === "recon");
      case "uts": return ciclos.filter((c) => c.categoria === "uts");
      case "sucata": return ciclos.filter((c) => c.categoria === "sucata");
      case "em_aluguer": return ciclos.filter((c) => c.estado === "em_aluguer");
      case "fechados": return ciclos.filter((c) => c.estado === "fechado");
      default: return [];
    }
  };

  // Sort: priority first, then oldest
  const sortCiclos = (items) => {
    return [...items].sort((a, b) => {
      if (a.prioridade !== b.prioridade) return a.prioridade ? -1 : 1;
      return new Date(a.data_entrada || a.created_date) - new Date(b.data_entrada || b.created_date);
    });
  };

  const filteredCiclos = useMemo(() => {
    const tabItems = getTabCiclos();
    const filtered = tabItems.filter((c) => {
      const m = getMaquina(c);
      return passesFilters(c, m) && matchesSearch(c, m, searchQuery);
    });
    return sortCiclos(filtered);
  }, [ciclos, maquinas, activeTab, filters, searchQuery]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Reserva save
  const handleReservaSave = async (data) => {
    if (!reservaCiclo) return;
    try {
      const updateData = {
        reserva_cliente: data.reserva_cliente,
        reserva_data: data.reserva_data,
      };
      if (data.reserva_cliente) {
        updateData.reserva_comercial = autor;
      } else {
        updateData.reserva_comercial = null;
      }
      if (data.reserva_nota) {
        updateData.observacoes = data.reserva_nota;
      }
      await base44.entities.Ciclo.update(reservaCiclo.id, updateData);
      toast({ title: "✓ Reserva guardada", description: `NS: ${reservaCiclo.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
      throw err;
    }
  };

  // Maquina edit
  const handleMaquinaEdit = async (specs, cicloUpdates = {}) => {
    if (!editMaquina) return;
    try {
      await base44.entities.Maquina.update(editMaquina.id, {
        mastro: specs.mastro || "",
        vias_mastro: specs.vias_mastro || "",
        joystick: specs.joystick || "",
        tipo_pneu: specs.tipo_pneu || "",
        acessorios: specs.acessorios || [],
        h3: specs.h3 || "",
        bateria: specs.bateria || "",
      });
      if (editCiclo && Object.keys(cicloUpdates).length > 0) {
        await base44.entities.Ciclo.update(editCiclo.id, cicloUpdates);
        if (cicloUpdates.categoria && cicloUpdates.categoria !== editCiclo.categoria) {
          const coneLabel = cicloUpdates.cone_cor ? `${cicloUpdates.cone_cor} ${cicloUpdates.cone_numero || ""}`.trim() : "sem cone";
          await base44.entities.EventoCiclo.create({
            ciclo_id: editCiclo.id,
            serie: editCiclo.serie,
            de_estado: editCiclo.categoria,
            para_estado: cicloUpdates.categoria,
            autor,
            nota: `Categoria definida: ${cicloUpdates.categoria} → cone ${coneLabel}`,
          });
        }
        if (cicloUpdates.estado && cicloUpdates.estado !== editCiclo.estado) {
          await base44.entities.EventoCiclo.create({
            ciclo_id: editCiclo.id,
            serie: editCiclo.serie,
            de_estado: editCiclo.estado,
            para_estado: cicloUpdates.estado,
            autor,
            nota: "Estado alterado (admin)",
          });
        }
      }
      toast({ title: "✓ Máquina atualizada", description: `NS: ${editMaquina.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
      throw err;
    }
  };

  const handleDeleteMaquina = async () => {
    if (!deleteMaquina) return;
    try {
      const ciclosByMaquina = await base44.entities.Ciclo.filter({ maquina_id: deleteMaquina.id });
      const ciclosBySerie = await base44.entities.Ciclo.filter({ serie: deleteMaquina.serie });
      const allCiclos = [...new Map([...ciclosByMaquina, ...ciclosBySerie].map((c) => [c.id, c])).values()];
      for (const ciclo of allCiclos) {
        await base44.entities.EventoCiclo.deleteMany({ ciclo_id: ciclo.id });
      }
      for (const ciclo of allCiclos) {
        await base44.entities.Ciclo.delete(ciclo.id);
      }
      await base44.entities.Maquina.delete(deleteMaquina.id);
      toast({ title: "✓ Máquina eliminada", description: `NS: ${deleteMaquina.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
      throw err;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        onSync={handleSync}
        syncing={syncing}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-700 overflow-x-auto">
        {INVENTARIO_TABS.filter((t) => !t.adminOnly || currentUser?.perfil === "administrador").map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded ${activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-500"}`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
        <button onClick={loadData} className="ml-auto p-2 text-slate-400 hover:text-amber-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      {filteredCiclos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p>Nenhuma máquina encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCiclos.map((c) => (
            <CicloCard
              key={c.id}
              ciclo={c}
              maquina={getMaquina(c)}
              canEditMaquina={userPermissions?.canEditMaquina}
              canReservar={userPermissions?.canReservar}
              canDeleteMaquina={userPermissions?.canDeleteMaquina}
              canSaidaRapida={(currentUser?.perfil === "logistica" || currentUser?.perfil === "administrador") && c.estado === "pronta"}
              canAutorizar={currentUser?.perfil === "administrador" || currentUser?.perfil === "gestor_frota"}
              onEdit={userPermissions?.canEditMaquina ? (ciclo, maquina) => { setEditMaquina(maquina); setEditCiclo(ciclo); } : null}
              onReservar={userPermissions?.canReservar ? (ciclo) => setReservaCiclo(ciclo) : null}
              onDelete={userPermissions?.canDeleteMaquina ? (maquina) => setDeleteMaquina(maquina) : null}
              onSaidaRapida={(currentUser?.perfil === "logistica" || currentUser?.perfil === "administrador") ? (ciclo) => setSaidaRapidaCiclo(ciclo) : null}
              onAutorizar={(currentUser?.perfil === "administrador" || currentUser?.perfil === "gestor_frota") ? (ciclo) => setAutorizarCicloState(ciclo) : null}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ReservaModal
        ciclo={reservaCiclo}
        open={!!reservaCiclo}
        onClose={() => setReservaCiclo(null)}
        onSave={handleReservaSave}
        canEdit={userPermissions?.canEditReserva}
      />
      <EditMaquinaModal
        maquina={editMaquina}
        ciclo={editCiclo}
        currentUser={currentUser}
        open={!!editMaquina}
        onClose={() => { setEditMaquina(null); setEditCiclo(null); }}
        onSave={handleMaquinaEdit}
        canDeleteMaquina={userPermissions?.canDeleteMaquina}
        onDelete={userPermissions?.canDeleteMaquina ? (maquina) => { setEditMaquina(null); setEditCiclo(null); setDeleteMaquina(maquina); } : null}
      />
      <DeleteMaquinaModal
        maquina={deleteMaquina}
        open={!!deleteMaquina}
        onClose={() => setDeleteMaquina(null)}
        onConfirm={handleDeleteMaquina}
      />
      <SaidaRapidaModal
        open={!!saidaRapidaCiclo}
        preselectedCiclo={saidaRapidaCiclo}
        currentUser={currentUser}
        onClose={() => setSaidaRapidaCiclo(null)}
        onDone={loadData}
      />
      <TarefasModal
        open={!!autorizarCicloState}
        ciclo={autorizarCicloState}
        onClose={() => setAutorizarCicloState(null)}
        onConfirm={handleTarefasConfirm}
        authorizing={autorizando !== null}
      />
    </div>
  );
}