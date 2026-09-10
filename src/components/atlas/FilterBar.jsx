import React from "react";
import { Search } from "lucide-react";
import { FILTER_OPTIONS } from "@/components/atlas/constants";

const FILTER_LABELS = {
  categoria: "Categoria",
  estado: "Estado",
  mastro: "Mastro",
  vias_mastro: "Vias",
  tipo_pneu: "Pneu",
};

export default function FilterBar({ searchQuery, onSearchChange, filters, onFilterChange }) {
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

      {/* Filter pills */}
      <div className="space-y-1.5">
        {Object.entries(FILTER_OPTIONS).map(([key, options]) => (
          <div key={key} className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[10px] uppercase tracking-wide text-slate-600 flex-shrink-0 w-12">
              {FILTER_LABELS[key]}
            </span>
            <div className="flex gap-1.5 flex-nowrap">
              {options.map((o) => (
                <button
                  key={o.value}
                  onClick={() => onFilterChange(key, o.value)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    filters[key] === o.value
                      ? "bg-amber-500 text-slate-900"
                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}