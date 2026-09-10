import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Search, RefreshCw, Package } from "lucide-react";
import CicloCard from "@/components/atlas/CicloCard";
import { ESTADO_CONFIG, ESTADO_ORDER, CATEGORIA_CONFIG } from "@/components/atlas/constants";

export default function Inventario() {
  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allCiclos = await base44.entities.Ciclo.list("-created_date", 500);
      const active = allCiclos.filter((c) => c.estado !== "fechado");
      const allMaquinas = await base44.entities.Maquina.list("-created_date", 500);
      setCiclos(active);
      setMaquinas(allMaquinas);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const maquinaMap = {};
  maquinas.forEach((m) => {
    maquinaMap[m.id] = m;
    if (m.serie) maquinaMap["serie:" + m.serie] = m;
  });

  const getMaquina = (ciclo) => {
    if (ciclo.maquina_id && maquinaMap[ciclo.maquina_id]) return maquinaMap[ciclo.maquina_id];
    if (ciclo.serie && maquinaMap["serie:" + ciclo.serie]) return maquinaMap["serie:" + ciclo.serie];
    return null;
  };

  const filtered = ciclos.filter((c) => {
    if (categoriaFilter !== "all" && c.categoria !== categoriaFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const m = getMaquina(c);
      if (!c.serie?.toLowerCase().includes(q) && !m?.modelo?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const grouped = {};
  ESTADO_ORDER.forEach((estado) => {
    grouped[estado] = filtered.filter((c) => c.estado === estado && c.categoria !== "sucata");
  });
  const sucataCiclos = filtered.filter((c) => c.categoria === "sucata");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Pesquisar série ou modelo..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoriaFilter("all")}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium ${categoriaFilter === "all" ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
          >
            Todas
          </button>
          {Object.entries(CATEGORIA_CONFIG).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => setCategoriaFilter(key)}
              className={`px-3 py-2.5 rounded-lg text-sm font-medium ${categoriaFilter === key ? `${cfg.bg} ${cfg.text} ${cfg.border} border-2` : "bg-slate-800 text-slate-400 border border-slate-700"}`}
            >
              {cfg.label}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Estado sections */}
      {ESTADO_ORDER.map((estado) => {
        const items = grouped[estado];
        if (items.length === 0) return null;
        const cfg = ESTADO_CONFIG[estado];
        return (
          <div key={estado}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">{cfg.label}</h2>
              <span className="text-xs text-slate-500">({items.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((c) => (
                <CicloCard key={c.id} ciclo={c} maquina={getMaquina(c)} />
              ))}
            </div>
          </div>
        );
      })}

      {/* Sucata section */}
      {sucataCiclos.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">Sucata</h2>
            <span className="text-xs text-slate-500">({sucataCiclos.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sucataCiclos.map((c) => (
              <CicloCard key={c.id} ciclo={c} maquina={getMaquina(c)} />
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Package className="w-12 h-12 mb-3 opacity-30" />
          <p>Nenhuma máquina encontrada</p>
        </div>
      )}
    </div>
  );
}