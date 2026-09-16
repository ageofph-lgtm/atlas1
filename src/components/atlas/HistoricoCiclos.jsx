import React, { useState, useMemo } from "react";
import { History, Package } from "lucide-react";
import CicloCard from "@/components/atlas/CicloCard";
import FilterBar from "@/components/atlas/FilterBar";
import { HISTORICO_TABS } from "@/components/atlas/constants";
import { matchCicloSearch } from "@/components/atlas/searchUtils";
import { passesCicloFilters, tabFilterCiclo, FILTROS_VAZIOS, isHistorico } from "@/components/atlas/cicloUtils";

/**
 * Pesquisa de máquinas com a mesma barra, filtros e abas das páginas de
 * operação — mas sobre TODOS os ciclos, fechados incluídos. É aqui que fica
 * o histórico que o inventário esconde para não mostrar a mesma série duas vezes.
 */
export default function HistoricoCiclos({ ciclos, getMaquina }) {
  const [activeTab, setActiveTab] = useState("todas");
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState(FILTROS_VAZIOS);

  const handleFilterChange = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  const passesAll = (c) => {
    const m = getMaquina(c);
    return passesCicloFilters(c, m, filters) && matchCicloSearch(c, m, searchQuery);
  };

  const tabCounts = useMemo(() => {
    const counts = {};
    HISTORICO_TABS.forEach((t) => {
      counts[t.key] = ciclos.filter((c) => tabFilterCiclo(t.key, c) && passesAll(c)).length;
    });
    return counts;
  }, [ciclos, filters, searchQuery]);

  // Mais recentes primeiro: num histórico interessa o que aconteceu há pouco.
  const resultados = useMemo(
    () =>
      ciclos
        .filter((c) => tabFilterCiclo(activeTab, c) && passesAll(c))
        .sort(
          (a, b) =>
            new Date(b.data_retorno || b.data_saida || b.data_entrada || b.created_date) -
            new Date(a.data_retorno || a.data_saida || a.data_entrada || a.created_date)
        ),
    [ciclos, activeTab, filters, searchQuery]
  );

  return (
    <div className="glass border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <History className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-slate-300">Pesquisa de máquinas</h3>
        <span className="text-xs text-slate-500">· inclui ciclos fechados</span>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filters={filters}
        onFilterChange={handleFilterChange}
        placeholder="Procurar no histórico: série, modelo, specs, cone, cliente..."
      />

      <div className="flex items-center gap-1 border-b border-slate-700 overflow-x-auto no-scrollbar">
        {HISTORICO_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === tab.key
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${activeTab === tab.key ? "bg-amber-500/20 text-amber-400" : "bg-slate-700 text-slate-500"}`}>
              {tabCounts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {resultados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Package className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm">Nenhuma máquina encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {resultados.map((c) => (
            <div key={c.id} className={isHistorico(c) ? "opacity-75" : ""}>
              {/* Só leitura: o histórico consulta-se, opera-se nas outras páginas. */}
              <CicloCard ciclo={c} maquina={getMaquina(c)} canNotas={false} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
