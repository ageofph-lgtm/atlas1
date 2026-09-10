import React, { useState } from "react";
import { Search, Filter } from "lucide-react";
import { FILTER_OPTIONS } from "@/components/atlas/constants";

const ADVANCED_FILTERS = ["estado", "mastro", "vias_mastro", "tipo_pneu"];

const FILTER_LABELS = {
  estado: "Estado",
  mastro: "Mastro",
  vias_mastro: "Vias",
  tipo_pneu: "Pneu",
};

export default function FilterBar({ searchQuery, onSearchChange, filters, onFilterChange }) {
  const [showFilters, setShowFilters] = useState(false);

  const activeAdvancedCount = ADVANCED_FILTERS.filter(
    (key) => filters[key] && filters[key] !== "all"
  ).length;

  const hasAnyFilter = activeAdvancedCount > 0 || (filters.categoria && filters.categoria !== "all");

  const handleClear = () => {
    ADVANCED_FILTERS.forEach((key) => onFilterChange(key, "all"));
    onFilterChange("categoria", "all");
  };

  return (
    <div className="space-y-2.5 mb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Pesquisar série, modelo, specs, cone, cliente..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
        />
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

        {hasAnyFilter && (
          <button
            onClick={handleClear}
            className="text-xs text-slate-500 hover:text-amber-400 underline underline-offset-2 ml-auto"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Advanced filters panel */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap pb-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2">
          {ADVANCED_FILTERS.map((key) => (
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