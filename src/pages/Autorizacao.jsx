import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { listarTudo } from "@/components/atlas/carregarTudo";
import AvisoTruncado from "@/components/atlas/AvisoTruncado";
import AcoesEmMassa from "@/components/atlas/AcoesEmMassa";
import { executarEmLote, resumirLote } from "@/components/atlas/executarEmLote";
import { podeAutorizar } from "@/components/atlas/acoesCiclo";
import { useToast } from "@/components/ui/use-toast";
import { Package } from "lucide-react";
import { AUTORIZACAO_TABS } from "@/components/atlas/constants";
import CicloCard from "@/components/atlas/CicloCard";
import CiclosView from "@/components/atlas/CiclosView";
import ViewModeBar from "@/components/atlas/ViewModeBar";
import Ordenador from "@/components/atlas/Ordenador";
import BotaoExportar from "@/components/atlas/BotaoExportar";
import CicloMiniCard from "@/components/atlas/CicloMiniCard";
import FilterBar from "@/components/atlas/FilterBar";
import EditMaquinaModal from "@/components/atlas/EditMaquinaModal";
import TarefasModal from "@/components/atlas/TarefasModal";
import { authorizeCiclo } from "@/components/atlas/authorizeCiclo";
import { useSyncWatcher } from "@/hooks/useSyncWatcher";
import { canEditMaquinaRecord } from "@/components/hooks/usePermissions";
import { matchCicloSearch } from "@/components/atlas/searchUtils";
import { saveMaquinaEdit } from "@/components/atlas/saveMaquinaEdit";
import { definirPrioridade, marcarPronta } from "@/components/atlas/acoesCiclo";
import { marcarPedidosNaOS } from "@/components/atlas/pedidosOS";
import { estadoEfetivo, passesCicloFilters, normalizarEstadosIndefinidos, FILTROS_VAZIOS } from "@/components/atlas/cicloUtils";
import { useViewPrefs } from "@/components/atlas/viewPrefs";

// Máquinas que aguardam decisão da gestora. "indefinido" entra aqui porque é
// onde sucata/indefinida ficam à espera de ser reclassificadas.
const A_AUTORIZAR_ESTADOS = ["classificada", "manutencao", "indefinido"];
const NO_WATCHER_ESTADOS = ["autorizada", "em_execucao"];

export default function Autorizacao({ currentUser, userPermissions }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";
  const canMarcarPronta = currentUser?.perfil === "gestor_frota" || currentUser?.perfil === "administrador";
  const canAutorizar = currentUser?.perfil === "gestor_frota" || currentUser?.perfil === "administrador";

  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [activeTab, setActiveTab] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(FILTROS_VAZIOS);
  const { modo, setModo, tamanho, setTamanho, ordenacao, setOrdenacao } = useViewPrefs("autorizacao");
  const [isLoading, setIsLoading] = useState(true);
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
  const [authorizing, setAuthorizing] = useState(null);
  const [tarefasCiclo, setTarefasCiclo] = useState(null);
  const [editMaquina, setEditMaquina] = useState(null);
  const [editCiclo, setEditCiclo] = useState(null);

  const loadData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const ciclosLidos = await listarTudo(base44.entities.Ciclo);
      const allCiclos = ciclosLidos.registos;
      setTruncado(ciclosLidos.truncado);
      const allMaquinas = (await listarTudo(base44.entities.Maquina)).registos;
      setCiclos(await normalizarEstadosIndefinidos(allCiclos));
      setMaquinas(allMaquinas);
    } catch (e) {
      console.error(e);
    }
    if (!silent) setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useSyncWatcher(loadData);

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

  const passesAll = (ciclo) => {
    const m = getMaquina(ciclo);
    return passesCicloFilters(ciclo, m, filters) && matchCicloSearch(ciclo, m, searchQuery);
  };

  const aAutorizar = useMemo(
    () => ciclos.filter((c) => A_AUTORIZAR_ESTADOS.includes(estadoEfetivo(c))),
    [ciclos]
  );

  const tabCounts = useMemo(() => {
    const counts = {};
    AUTORIZACAO_TABS.forEach((t) => {
      counts[t.key] = aAutorizar.filter((c) => (t.key === "todas" || c.categoria === t.key) && passesAll(c)).length;
    });
    return counts;
  }, [aAutorizar, maquinas, filters, searchQuery]);

  // Prioridade primeiro, depois as mais antigas.
  const sortCiclos = (items) =>
    [...items].sort((a, b) => {
      if (!!a.prioridade !== !!b.prioridade) return a.prioridade ? -1 : 1;
      return new Date(a.data_entrada || a.created_date) - new Date(b.data_entrada || b.created_date);
    });

  const filteredCiclos = useMemo(
    () => sortCiclos(aAutorizar.filter((c) => (activeTab === "todas" || c.categoria === activeTab) && passesAll(c))),
    [aAutorizar, maquinas, activeTab, filters, searchQuery]
  );

  const emAndamento = useMemo(
    () =>
      sortCiclos(
        ciclos.filter(
          (c) => NO_WATCHER_ESTADOS.includes(estadoEfetivo(c)) && (activeTab === "todas" || c.categoria === activeTab) && passesAll(c)
        )
      ),
    [ciclos, maquinas, activeTab, filters, searchQuery]
  );

  // Só o que ainda está à vista: se um filtro escondeu uma máquina, ela não
  // pode continuar a contar para a ação em massa.
  const selecionados = useMemo(
    () => filteredCiclos.filter((c) => selecao.has(c.id)),
    [filteredCiclos, selecao]
  );

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const togglePrioridade = async (ciclo) => {
    try {
      await definirPrioridade(ciclo, !ciclo.prioridade);
      setCiclos((prev) => prev.map((c) => (c.id === ciclo.id ? { ...c, prioridade: !c.prioridade } : c)));
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleMarcarPronta = async (ciclo) => {
    try {
      await marcarPronta(ciclo, { autor });
      toast({ title: "✓ Marcada como pronta", description: `NS: ${ciclo.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

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

  const handleTarefasConfirm = async ({ tarefas, isVps, isExpress, pedidosMigrados = [], alvos = [] }) => {
    const lista = alvos.length ? alvos : tarefasCiclo ? [tarefasCiclo] : [];
    if (!lista.length) return;

    // Os pedidos vêm todos juntos do modal; cada máquina leva os seus para a
    // sua própria O.S.
    const pedidosPorCiclo = new Map();
    pedidosMigrados.forEach((p) => {
      if (!pedidosPorCiclo.has(p.ciclo_id)) pedidosPorCiclo.set(p.ciclo_id, []);
      pedidosPorCiclo.get(p.ciclo_id).push(p);
    });

    setAuthorizing(lista[0].id);
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
    setAuthorizing(null);
    setTarefasCiclo(null);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderCard = (c, { destaque = false, rolarParaVista = true } = {}) => {
    const m = getMaquina(c);
    return (
      <CicloCard
        key={c.id}
        ciclo={c}
        maquina={m}
        canEditMaquina={canEditMaquinaRecord(currentUser, m)}
        canAutorizar={canAutorizar && authorizing !== c.id}
        canNotas={userPermissions?.canNotas}
        onAtualizado={loadData}
        currentUser={currentUser}
        canPedidos={userPermissions?.canPedidos}
        canResponderPedidos={userPermissions?.canResponderPedidos}
        canApagarPedidos={userPermissions?.canApagarPedidos}
        canLimparRegistos={currentUser?.perfil === "administrador"}
        destaque={destaque}
        rolarParaVista={rolarParaVista}
        onEdit={canEditMaquinaRecord(currentUser, m) ? (ciclo, maquina) => { setEditMaquina(maquina); setEditCiclo(ciclo); } : null}
        onAutorizar={canAutorizar ? (ciclo) => setTarefasCiclo(ciclo) : null}
        onTogglePrioridade={canAutorizar ? togglePrioridade : null}
        onMarcarPronta={canMarcarPronta ? handleMarcarPronta : null}
      />
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-100">Autorização de Máquinas</h2>

      {/* Pesquisa + filtros (categorias ficam nas abas) */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        showCategoria={false}
      />

      {/* Abas por tipo de máquina */}
      <div className="flex items-center gap-1 border-b border-slate-700 overflow-x-auto">
        {AUTORIZACAO_TABS.map((tab) => (
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
      </div>

      <AvisoTruncado truncado={truncado} />

      <div className="flex justify-end items-center gap-2 flex-wrap">
        <BotaoExportar ciclos={filteredCiclos} getMaquina={getMaquina} pagina="autorizacao" />
        <Ordenador ordenacao={ordenacao} onOrdenacao={setOrdenacao} />
        <ViewModeBar modo={modo} onModo={setModo} tamanho={tamanho} onTamanho={setTamanho} />
      </div>

      {/* A autorizar */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-400 mb-3">
          A Autorizar ({filteredCiclos.length})
        </h3>
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
              <p>Nenhuma máquina aguardando autorização</p>
            </div>
          }
        />
      </div>

      {/* Em andamento no Watcher */}
      {emAndamento.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-purple-400 mb-3">
            No Watcher ({emAndamento.length})
          </h3>
          <div className="space-y-2">
            {emAndamento.map((c) => (
              <CicloMiniCard
                key={c.id}
                ciclo={c}
                maquina={getMaquina(c)}
                canNotas={userPermissions?.canNotas}
                onAtualizado={loadData}
                currentUser={currentUser}
                canPedidos={userPermissions?.canPedidos}
                canResponderPedidos={userPermissions?.canResponderPedidos}
                  canApagarPedidos={userPermissions?.canApagarPedidos}
              canLimparRegistos={currentUser?.perfil === "administrador"}
                onMarcarPronta={canMarcarPronta && c.estado === "em_execucao" ? handleMarcarPronta : null}
              />
            ))}
          </div>
        </div>
      )}

      <AcoesEmMassa
        selecionados={selecionados}
        onLimpar={() => setSelecao(new Set())}
        onConcluido={loadData}
        getMaquina={getMaquina}
        pagina="autorizacao"
        autor={autor}
        podeGerir={canAutorizar}
        onAutorizar={(lista) => setAutorizarEmMassa(lista)}
      />

      <EditMaquinaModal
        maquina={editMaquina}
        ciclo={editCiclo}
        currentUser={currentUser}
        open={!!editMaquina}
        onClose={() => { setEditMaquina(null); setEditCiclo(null); }}
        onSave={handleMaquinaEdit}
      />
      <TarefasModal
        open={!!tarefasCiclo || !!autorizarEmMassa}
        ciclo={tarefasCiclo}
        ciclos={autorizarEmMassa}
        progresso={progressoLote}
        onClose={() => { setTarefasCiclo(null); setAutorizarEmMassa(null); setProgressoLote(null); }}
        onConfirm={handleTarefasConfirm}
        authorizing={authorizing !== null}
      />
    </div>
  );
}
