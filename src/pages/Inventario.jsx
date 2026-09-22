import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { listarTudo } from "@/components/atlas/carregarTudo";
import AvisoTruncado from "@/components/atlas/AvisoTruncado";
import BarraOcupacao from "@/components/atlas/BarraOcupacao";
import AcoesEmMassa from "@/components/atlas/AcoesEmMassa";
import { executarEmLote, resumirLote } from "@/components/atlas/executarEmLote";
import { podeAutorizar } from "@/components/atlas/acoesCiclo";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Package, Bell, X } from "lucide-react";
import CicloCard from "@/components/atlas/CicloCard";
import CiclosView from "@/components/atlas/CiclosView";
import ViewModeBar from "@/components/atlas/ViewModeBar";
import BotaoExportar from "@/components/atlas/BotaoExportar";
import FilterBar from "@/components/atlas/FilterBar";
import ReservaModal from "@/components/atlas/ReservaModal";
import EditMaquinaModal from "@/components/atlas/EditMaquinaModal";
import DeleteMaquinaModal from "@/components/atlas/DeleteMaquinaModal";
import TarefasModal from "@/components/atlas/TarefasModal";
import { authorizeCiclo } from "@/components/atlas/authorizeCiclo";
import { useSyncWatcher } from "@/hooks/useSyncWatcher";
import { canEditMaquinaRecord } from "@/components/hooks/usePermissions";
import { INVENTARIO_TABS } from "@/components/atlas/constants";
import { matchCicloSearch } from "@/components/atlas/searchUtils";
import { saveMaquinaEdit } from "@/components/atlas/saveMaquinaEdit";
import { notificarReserva } from "@/components/atlas/mensagens";
import { marcarPedidosNaOS } from "@/components/atlas/pedidosOS";
import { passesCicloFilters, normalizarEstadosIndefinidos, FILTROS_VAZIOS, isHistorico, tabFilterCiclo } from "@/components/atlas/cicloUtils";
import { useViewPrefs } from "@/components/atlas/viewPrefs";

export default function Inventario({ currentUser, userPermissions }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [searchParams, setSearchParams] = useSearchParams();
  // Chegou-se aqui por uma notificação: ?serie=…&ciclo=… põe a máquina em foco.
  const serieAlvo = searchParams.get("serie") || "";
  const cicloAlvo = searchParams.get("ciclo") || "";

  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [activeTab, setActiveTab] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const { modo, setModo, tamanho, setTamanho, ordenacao, setOrdenacao } = useViewPrefs("inventario");
  const [filters, setFilters] = useState(FILTROS_VAZIOS);
  const [reservaCiclo, setReservaCiclo] = useState(null);
  const [editMaquina, setEditMaquina] = useState(null);
  const [editCiclo, setEditCiclo] = useState(null);
  const [deleteMaquina, setDeleteMaquina] = useState(null);
  const [autorizarCicloState, setAutorizarCicloState] = useState(null);
  const [autorizando, setAutorizando] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Quando a leitura bate no travão, dizemo-lo: um limite calado faz os
  // relatórios mentir sem ninguém dar por isso.
  const [truncado, setTruncado] = useState(false);
  const [selecao, setSelecao] = useState(new Set());
  const [autorizarEmMassa, setAutorizarEmMassa] = useState(null);
  const [progressoLote, setProgressoLote] = useState(null);

  // O que se selecionou deixa de estar à vista quando se muda de aba, de
  // filtro, de pesquisa ou de modo. Guardar uma seleção escondida é como se
  // acaba a decidir sobre máquinas erradas.
  useEffect(() => {
    setSelecao(new Set());
  }, [activeTab, filters, searchQuery, modo]);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const ciclosLidos = await listarTudo(base44.entities.Ciclo);
      const allCiclos = ciclosLidos.registos;
      setTruncado(ciclosLidos.truncado);
      const allMaquinas = (await listarTudo(base44.entities.Maquina)).registos;
      setCiclos(await normalizarEstadosIndefinidos(allCiclos));
      setMaquinas(allMaquinas);
      // Os pedidos vêm numa consulta só, para os cards não fazerem uma cada.
      try {
        setPedidos((await listarTudo(base44.entities.PedidoMaquina)).registos);
      } catch (_e) {
        setPedidos([]);
      }
    } catch (e) {
      console.error(e);
    }
    if (!silent) setIsLoading(false);
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

  const handleTarefasConfirm = async ({ tarefas, isVps, isExpress, pedidosMigrados = [], alvos = [] }) => {
    const lista = alvos.length ? alvos : autorizarCicloState ? [autorizarCicloState] : [];
    if (!lista.length) return;

    // Os pedidos vêm todos juntos do modal; cada máquina leva os seus para a
    // sua própria O.S.
    const pedidosPorCiclo = new Map();
    pedidosMigrados.forEach((p) => {
      if (!pedidosPorCiclo.has(p.ciclo_id)) pedidosPorCiclo.set(p.ciclo_id, []);
      pedidosPorCiclo.get(p.ciclo_id).push(p);
    });

    setAutorizando(lista[0].id);
    setProgressoLote({ feito: 0, total: lista.length });

    // Em série, de propósito: cada autorização é uma chamada ao Watcher.
    const resultado = await executarEmLote(lista, {
      aplicavel: (c) => (podeAutorizar(c) ? true : "não estava classificada nem em manutenção"),
      executar: async (c) => {
        const data = await authorizeCiclo(c.id, autor, { tarefas, isVps, isExpress });
        await marcarPedidosNaOS(pedidosPorCiclo.get(c.id) || [], { autor, osId: data.watcher_os_id });
      },
      onProgresso: ({ feito, total }) => setProgressoLote({ feito, total }),
    });

    setProgressoLote(null);
    setAutorizando(null);
    setAutorizarCicloState(null);
    setAutorizarEmMassa(null);
    setSelecao(new Set());

    const houveProblema = resultado.falhadas.length > 0 || resultado.ignoradas.length > 0;
    toast({
      variant: resultado.feitas.length === 0 ? "destructive" : undefined,
      title: houveProblema ? "Concluído com ressalvas" : "✓ Autorizada",
      description: resumirLote(resultado, "autorizada"),
    });
    loadData();
  };

  const maquinaMap = useMemo(() => {
    const map = {};
    maquinas.forEach((m) => {
      map[m.id] = m;
      if (m.serie) map["serie:" + m.serie] = m;
    });
    return map;
  }, [maquinas]);

  const pedidosPorCiclo = useMemo(() => {
    const map = {};
    pedidos.forEach((p) => {
      if (!p.ciclo_id) return;
      (map[p.ciclo_id] = map[p.ciclo_id] || []).push(p);
    });
    Object.values(map).forEach((l) => l.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    return map;
  }, [pedidos]);

  const limparAlvo = () => setSearchParams({}, { replace: true });

  const recarregarPedidos = async () => {
    try {
      setPedidos((await listarTudo(base44.entities.PedidoMaquina)).registos);
    } catch (_e) {
      // mantém o que já estava
    }
  };

  const getMaquina = (ciclo) =>
    (ciclo.maquina_id && maquinaMap[ciclo.maquina_id]) ||
    (ciclo.serie && maquinaMap["serie:" + ciclo.serie]) ||
    null;

  // Ciclos fechados não entram no inventário — a mesma série apareceria duas
  // vezes, uma fechada e outra ativa. O histórico está nos relatórios.
  const ciclosAtivos = useMemo(() => ciclos.filter((c) => !isHistorico(c)), [ciclos]);

  // Vindo de uma mensagem, o inventário mostra só aquela máquina. Com centenas
  // de cards, rolar até ela e distingui-la do resto não era exequível.
  //
  // O ciclo da mensagem pode já ter fechado e a máquina ter voltado ao pátio
  // num ciclo novo, por isso procura-se por esta ordem: o ciclo indicado se
  // ainda estiver aberto, senão a série no pátio, e só depois o ciclo fechado
  // — esse aparece assinalado como histórico, em vez de dar ecrã vazio.
  const foco = useMemo(() => {
    if (!cicloAlvo && !serieAlvo) return null;
    const porId = cicloAlvo ? ciclosAtivos.find((c) => c.id === cicloAlvo) : null;
    if (porId) return { ciclos: [porId], historico: false };
    const porSerie = serieAlvo ? ciclosAtivos.filter((c) => c.serie === serieAlvo) : [];
    if (porSerie.length) return { ciclos: porSerie, historico: false };
    const fechado = cicloAlvo ? ciclos.find((c) => c.id === cicloAlvo) : null;
    if (fechado) return { ciclos: [fechado], historico: true };
    return { ciclos: [], historico: false };
  }, [ciclos, ciclosAtivos, cicloAlvo, serieAlvo]);

  // Filter pills + advanced filters (partilhados com autorização e saída)
  const passesFilters = (ciclo, maquina) => passesCicloFilters(ciclo, maquina, filters);

  // Categoria-fixed tabs conflict with the categoria pill when a different pill is active.
  const CATEGORIA_FIXED_TAB = { recon: "recon", uts: "uts", sucata: "sucata", indefinida: "indefinida" };

  const isTabDisabled = (tabKey) => {
    const fixed = CATEGORIA_FIXED_TAB[tabKey];
    return !!fixed && filters.categoria !== "all" && filters.categoria !== fixed;
  };

  // Tab counts — respect ALL active filters (categoria pill, advanced filters, search),
  // so every badge matches "how many would show if I clicked this tab now".
  const tabCounts = useMemo(() => {
    const counts = {};
    INVENTARIO_TABS.forEach((t) => {
      counts[t.key] = ciclosAtivos.filter((c) => {
        if (!tabFilterCiclo(t.key, c)) return false;
        const m = getMaquina(c);
        return passesFilters(c, m) && matchCicloSearch(c, m, searchQuery);
      }).length;
    });
    return counts;
  }, [ciclosAtivos, maquinas, filters, searchQuery]);

  // Tab filter
  const getTabCiclos = () => ciclosAtivos.filter((c) => tabFilterCiclo(activeTab, c));

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
      return passesFilters(c, m) && matchCicloSearch(c, m, searchQuery);
    });
    return sortCiclos(filtered);
  }, [ciclosAtivos, maquinas, activeTab, filters, searchQuery]);

  // Só o que ainda está à vista: se um filtro escondeu uma máquina, ela não
  // pode continuar a contar para a ação em massa.
  const selecionados = useMemo(
    () => filteredCiclos.filter((c) => selecao.has(c.id)),
    [filteredCiclos, selecao]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Auto-switch tab when the categoria pill makes the active tab invalid/empty.
  const firstPillChange = useRef(true);
  useEffect(() => {
    if (firstPillChange.current) { firstPillChange.current = false; return; }
    const disabled = isTabDisabled(activeTab);
    const empty = tabCounts[activeTab] === 0;
    if (disabled || empty) {
      setActiveTab("todas");
    }
     
  }, [filters.categoria]);

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
        // Guardamos o ID para lhe conseguir enviar as notificações desta máquina.
        updateData.reserva_comercial_id = currentUser?.id || "";
      } else {
        updateData.reserva_comercial = null;
        updateData.reserva_comercial_id = "";
      }
      if (data.reserva_nota) {
        updateData.observacoes = data.reserva_nota;
      }
      await base44.entities.Ciclo.update(reservaCiclo.id, updateData);
      await notificarReserva(reservaCiclo, {
        autor,
        cliente: data.reserva_cliente,
        data: data.reserva_data,
        cancelada: !data.reserva_cliente,
      });
      toast({ title: "✓ Reserva guardada", description: `NS: ${reservaCiclo.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
      throw err;
    }
  };

  // Maquina edit
  const handleMaquinaEdit = async (specs, cicloUpdates = {}, newSerie = null) => {
    if (!editMaquina) return;
    try {
      const description = await saveMaquinaEdit({ maquina: editMaquina, ciclo: editCiclo, specs, cicloUpdates, newSerie, autor });
      toast({ title: "✓ Máquina atualizada", description });
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

  // Um só conjunto de modais para os dois modos de ecrã. Mantê-los em duplicado
  // era garantir que divergiam à primeira alteração de permissões.
  const modais = (
    <>
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
      <TarefasModal
        open={!!autorizarCicloState || !!autorizarEmMassa}
        ciclo={autorizarCicloState}
        ciclos={autorizarEmMassa}
        progresso={progressoLote}
        onClose={() => { setAutorizarCicloState(null); setAutorizarEmMassa(null); setProgressoLote(null); }}
        onConfirm={handleTarefasConfirm}
        authorizing={autorizando !== null}
      />
    </>
  );

  const renderCard = (c, { destaque = false, rolarParaVista = true } = {}) => (
    <CicloCard
      key={c.id}
      ciclo={c}
      maquina={getMaquina(c)}
      canEditMaquina={canEditMaquinaRecord(currentUser, getMaquina(c))}
      canReservar={userPermissions?.canReservar}
      canDeleteMaquina={userPermissions?.canDeleteMaquina}
      canAutorizar={currentUser?.perfil === "administrador" || currentUser?.perfil === "gestor_frota"}
      canNotas={userPermissions?.canNotas}
      onAtualizado={loadData}
      currentUser={currentUser}
      canPedidos={userPermissions?.canPedidos}
      canResponderPedidos={userPermissions?.canResponderPedidos}
      canApagarPedidos={userPermissions?.canApagarPedidos}
      canLimparRegistos={currentUser?.perfil === "administrador"}
      pedidos={pedidosPorCiclo[c.id] || []}
      onPedidosChanged={recarregarPedidos}
      destaque={destaque}
      rolarParaVista={rolarParaVista}
      onEdit={canEditMaquinaRecord(currentUser, getMaquina(c)) ? (ciclo, maquina) => { setEditMaquina(maquina); setEditCiclo(ciclo); } : null}
      onReservar={userPermissions?.canReservar ? (ciclo) => setReservaCiclo(ciclo) : null}
      onDelete={userPermissions?.canDeleteMaquina ? (maquina) => setDeleteMaquina(maquina) : null}
      onAutorizar={(currentUser?.perfil === "administrador" || currentUser?.perfil === "gestor_frota") ? (ciclo) => setAutorizarCicloState(ciclo) : null}
    />
  );

  // Modo foco: veio-se de uma mensagem e o ecrã mostra só aquela máquina —
  // sem barra de filtros, sem abas e sem mais cards por onde rolar.
  if (foco) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs glass border border-amber-500/30 rounded-lg px-3 py-2">
          <Bell className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span className="text-slate-300">
            <span className="num font-bold text-slate-100">{serieAlvo || foco.ciclos[0]?.serie || "Máquina"}</span>
            {foco.historico ? " — ciclo já fechado, vindo das mensagens." : ", vinda das mensagens."}
          </span>
          <button
            onClick={limparAlvo}
            className="ml-auto flex items-center gap-1 px-2 py-1 rounded-lg text-amber-400 hover:bg-amber-500/10 font-medium flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" /> Ver inventário
          </button>
        </div>

        {foco.ciclos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500 text-center px-4">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p>Não encontrámos esta máquina no inventário.</p>
            <p className="text-xs mt-1">Se o ciclo já fechou, ela está no histórico, em Relatórios.</p>
          </div>
        ) : (
          <div className="max-w-xl space-y-3">
            {foco.ciclos.map((c) => renderCard(c, { destaque: true, rolarParaVista: false }))}
          </div>
        )}

        <AcoesEmMassa
        selecionados={selecionados}
        onLimpar={() => setSelecao(new Set())}
        onConcluido={loadData}
        getMaquina={getMaquina}
        pagina="inventario"
        autor={autor}
        podeGerir={currentUser?.perfil === "administrador" || currentUser?.perfil === "gestor_frota"}
        onAutorizar={(lista) => setAutorizarEmMassa(lista)}
      />

      {modais}
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
        {INVENTARIO_TABS.filter((t) => !t.adminOnly || currentUser?.perfil === "administrador").map((tab) => {
          const disabled = isTabDisabled(tab.key);
          return (
            <button
              key={tab.key}
              disabled={disabled}
              onClick={() => !disabled && setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 ${
                disabled
                  ? "border-transparent text-slate-600 cursor-not-allowed opacity-50"
                  : activeTab === tab.key
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded ${disabled ? "bg-slate-700/50 text-slate-600" : activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-500"}`}>
                {tabCounts[tab.key]}
              </span>
            </button>
          );
        })}
        <button onClick={loadData} className="ml-auto p-2 text-slate-400 hover:text-amber-400" title="Recarregar">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <BarraOcupacao ciclos={ciclos} />

      <AvisoTruncado truncado={truncado} />

      <div className="flex justify-end items-center gap-2 flex-wrap">
        <BotaoExportar ciclos={filteredCiclos} getMaquina={getMaquina} pagina="inventario" />
        <ViewModeBar modo={modo} onModo={setModo} tamanho={tamanho} onTamanho={setTamanho} />
      </div>

      <CiclosView
        ciclos={filteredCiclos}
        getMaquina={getMaquina}
        modo={modo}
        tamanho={tamanho}
        renderCard={renderCard}
        ordenacao={ordenacao}
        onOrdenacao={setOrdenacao}
        selecao={selecao}
        onSelecao={setSelecao}
        vazio={
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Package className="w-12 h-12 mb-3 opacity-30" />
            <p>Nenhuma máquina encontrada</p>
          </div>
        }
      />

      {modais}
    </div>
  );
}