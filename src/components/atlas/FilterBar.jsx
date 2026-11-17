import React, { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";
import { FILTER_OPTIONS, CONE_COLORS, MODELO_FAMILIAS, MODELO_FAMILIA_OUTRAS } from "@/components/atlas/constants";
import { familiaDoModelo, hasFiltrosAtivos } from "@/components/atlas/cicloUtils";
import { capacidadeDoModelo } from "@/lib/modeloSearch";

const TODAS_AS_FAMILIAS = [...MODELO_FAMILIAS, MODELO_FAMILIA_OUTRAS];

const ADVANCED_FILTERS = ["estado", "mastro", "vias_mastro", "tipo_pneu"];

const FILTER_LABELS = {
  estado: "Estado",
  mastro: "Mastro",
  vias_mastro: "Vias",
  tipo_pneu: "Pneu",
};

export default function FilterBar({ searchQuery, onSearchChange, filters, onFilterChange, showCategoria = true, showEstado = true, placeholder, modelosDisponiveis = [] }) {
  const [showFilters, setShowFilters] = useState(false);

  // Páginas cujos painéis já separam por estado escondem esse filtro.
  const advancedFilters = showEstado ? ADVANCED_FILTERS : ADVANCED_FILTERS.filter((k) => k !== "estado");

  const modelos = filters.modelos || [];
  const capacidadesAtivas = filters.capacidades || [];

  const toggleModelo = (value) => {
    onFilterChange("modelos", modelos.includes(value) ? modelos.filter((v) => v !== value) : [...modelos, value]);
    // A capacidade só faz sentido dentro de uma família: ao trocar de família, sai.
    onFilterChange("capacidades", []);
  };

  const toggleCapacidade = (capacidade) =>
    onFilterChange(
      "capacidades",
      capacidadesAtivas.includes(capacidade)
        ? capacidadesAtivas.filter((c) => c !== capacidade)
        : [...capacidadesAtivas, capacidade]
    );

  // Com uma só família escolhida, mostram-se as capacidades que existem nos
  // dados (EXV → 10, 12, 14, 16, 20) e quantas máquinas há em cada uma.
  const familiaAtiva = useMemo(() => {
    if (modelos.length !== 1) return null;
    return TODAS_AS_FAMILIAS.find((f) => f.value === modelos[0]) || null;
  }, [modelos]);

  const capacidades = useMemo(() => {
    if (!familiaAtiva) return [];
    const contagem = new Map();
    modelosDisponiveis.forEach((modelo) => {
      if (familiaDoModelo(modelo) !== familiaAtiva.value) return;
      const capacidade = capacidadeDoModelo(modelo);
      if (!capacidade) return;
      contagem.set(capacidade, (contagem.get(capacidade) || 0) + 1);
    });
    return [...contagem.entries()].sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [familiaAtiva, modelosDisponiveis]);

  const activeAdvancedCount = advancedFilters.filter(
    (key) => filters[key] && filters[key] !== "all"
  ).length;

  const hasAnyFilter = hasFiltrosAtivos(filters);

  const handleClear = () => {
    ADVANCED_FILTERS.forEach((key) => onFilterChange(key, "all"));
    onFilterChange("categoria", "all");
    onFilterChange("coneCor", "all");
    onFilterChange("coneNumero", "");
    onFilterChange("modelos", []);
    onFilterChange("capacidades", []);
  };

  return (
    <div className="space-y-2.5 mb-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={placeholder || "Pesquisar série, modelo, specs, cone, cliente..."}
            className="w-full pl-10 pr-4 py-2.5 glass border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
      </div>

      {/* Quick filters row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            showFilters || activeAdvancedCount > 0
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
              : "bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600"
          }`}
        >
          <Filter className="w-3.5 h-3.5" />
          FILTROS
          {activeAdvancedCount > 0 && (
            <span className="ml-0.5 bg-amber-500 text-slate-900 rounded-full min-w-4 h-4 px-1 flex items-center justify-center text-[10px] font-bold">
              {activeAdvancedCount}
            </span>
          )}
        </button>

        {/* Inline categoria pills */}
        {showCategoria && (
        <div className="flex items-center gap-1 flex-wrap">
          {FILTER_OPTIONS.categoria.map((o) => (
            <button
              key={o.value}
              onClick={() => onFilterChange("categoria", o.value)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filters.categoria === o.value || (!filters.categoria && o.value === "all")
                  ? "bg-amber-500 text-slate-900"
                  : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        )}

        {/* Cone filter — exact match on (cor + nº) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-slate-600">CONE</span>
          <select
            value={filters.coneCor || "all"}
            onChange={(e) => onFilterChange("coneCor", e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs px-2 py-1 focus:border-amber-500 focus:outline-none cursor-pointer"
          >
            <option value="all">Cor</option>
            {CONE_COLORS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            value={filters.coneNumero || ""}
            onChange={(e) => onFilterChange("coneNumero", e.target.value)}
            placeholder="Nº"
            className="w-16 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs px-2 py-1 focus:border-amber-500 focus:outline-none"
          />
        </div>

        {hasAnyFilter && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-amber-400 underline underline-offset-2"
          >
            Limpar filtros
          </button>
        )}

        {/* Famílias de modelo — lado direito, combinam com os restantes filtros */}
        <div className="flex items-center gap-1 flex-wrap sm:ml-auto sm:justify-end">
          {TODAS_AS_FAMILIAS.map((f) => {
            const active = modelos.includes(f.value);
            return (
              <button
                key={f.value}
                onClick={() => toggleModelo(f.value)}
                title={`Modelos ${f.label}`}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide whitespace-nowrap border transition-colors ${
                  active
                    ? "bg-amber-500 text-slate-900 border-amber-500"
                    : "bg-slate-800/60 text-slate-500 border-slate-700 hover:border-slate-600 hover:text-slate-300"
                }`}
              >
                {f.label}
              </button>
            );
          })}

          {/* Capacidades da família escolhida — «EXV → 14 (4)» */}
          {capacidades.length > 1 && (
            <div className="w-full flex items-center gap-1 flex-wrap sm:justify-end pt-1">
              <span className="text-[10px] uppercase tracking-wide text-slate-600">{familiaAtiva.label}</span>
              {capacidades.map(([capacidade, total]) => {
                const ativa = capacidadesAtivas.includes(capacidade);
                return (
                  <button
                    key={capacidade}
                    onClick={() => toggleCapacidade(capacidade)}
                    title={`${familiaAtiva.label} ${capacidade} — ${total} máquina${total === 1 ? "" : "s"}`}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap border transition-colors ${
                      ativa
                        ? "bg-amber-500 text-slate-900 border-amber-500"
                        : "bg-slate-900/60 text-slate-400 border-slate-700 hover:border-slate-600 hover:text-slate-200"
                    }`}
                  >
                    {capacidade}
                    <span className={ativa ? "opacity-70 ml-1" : "opacity-50 ml-1"}>{total}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap pb-1 glass border border-slate-700 rounded-lg px-3 py-2">
          {advancedFilters.map((key) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wide text-slate-600">
                {FILTER_LABELS[key]}
              </span>
              <select
                value={filters[key] || "all"}
                onChange={(e) => onFilterChange(key, e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-xs px-2 py-1 focus:border-amber-500 focus:outline-none cursor-pointer"
              >
                {FILTER_OPTIONS[key].map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}