import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { RefreshCw, TrendingUp, TrendingDown, Package, Clock, Calendar } from "lucide-react";
import { format, subDays, startOfDay, isAfter } from "date-fns";
import { useSyncWatcher } from "@/hooks/useSyncWatcher";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const CATEGORIA_COLORS = {
  str: "#f59e0b",
  uts: "#a855f7",
  recon: "#3b82f6",
  indefinida: "#94a3b8",
  sucata: "#64748b",
};

export default function Relatorios({ currentUser, userPermissions }) {
  const [period, setPeriod] = useState(30);
  const [ciclos, setCiclos] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const allCiclos = await base44.entities.Ciclo.list("-created_date", 1000);
      setCiclos(allCiclos);
      const allMaquinas = await base44.entities.Maquina.list("-created_date", 1000);
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

  const maquinaMap = useMemo(() => {
    const map = {};
    maquinas.forEach((m) => {
      map[m.id] = m;
      if (m.serie) map["serie:" + m.serie] = m;
    });
    return map;
  }, [maquinas]);

  const getMaquina = (c) => maquinaMap[c.maquina_id] || (c.serie && maquinaMap["serie:" + c.serie]) || null;

  const periodStart = useMemo(() => {
    if (period === "all") return new Date(0);
    return startOfDay(subDays(new Date(), period));
  }, [period]);

  const stats = useMemo(() => {
    const entradas = ciclos.filter((c) => c.data_entrada && isAfter(new Date(c.data_entrada), periodStart));
    const saidas = ciclos.filter((c) => c.data_saida && isAfter(new Date(c.data_saida), periodStart));

    const activeByCategoria = {
      str: ciclos.filter((c) => c.categoria === "str" && c.estado !== "fechado").length,
      uts: ciclos.filter((c) => c.categoria === "uts" && c.estado !== "fechado").length,
      recon: ciclos.filter((c) => c.categoria === "recon" && c.estado !== "fechado").length,
      indefinida: ciclos.filter((c) => c.categoria === "indefinida" && c.estado !== "fechado").length,
      sucata: ciclos.filter((c) => c.categoria === "sucata" && c.estado !== "fechado").length,
    };

    const closedWithDias = ciclos.filter((c) => c.dias_alugada != null && c.dias_alugada > 0);
    const mediaDias = closedWithDias.length > 0
      ? Math.round((closedWithDias.reduce((s, c) => s + c.dias_alugada, 0) / closedWithDias.length) * 10) / 10
      : 0;

    const withPrateleira = ciclos.filter((c) => c.data_pronta && c.data_saida);
    const mediaPrateleira = withPrateleira.length > 0
      ? Math.round((withPrateleira.reduce((s, c) => s + (new Date(c.data_saida) - new Date(c.data_pronta)), 0) / withPrateleira.length / (1000 * 60 * 60 * 24)) * 10) / 10
      : 0;

    const withFila = ciclos.filter((c) => c.data_entrada && c.data_autorizacao);
    const mediaFila = withFila.length > 0
      ? Math.round((withFila.reduce((s, c) => s + (new Date(c.data_autorizacao) - new Date(c.data_entrada)), 0) / withFila.length / (1000 * 60 * 60 * 24)) * 10) / 10
      : 0;

    return { entradas, saidas, activeByCategoria, mediaDias, mediaPrateleira, mediaFila };
  }, [ciclos, periodStart]);

  // Daily chart data
  const dailyData = useMemo(() => {
    const days = {};
    const numDays = period === "all" ? 90 : period;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = startOfDay(subDays(new Date(), i));
      const key = format(d, "yyyy-MM-dd");
      days[key] = { day: format(d, "dd/MM"), entradas: 0, saidas: 0 };
    }
    stats.entradas.forEach((c) => {
      const key = format(new Date(c.data_entrada), "yyyy-MM-dd");
      if (days[key]) days[key].entradas++;
    });
    stats.saidas.forEach((c) => {
      const key = format(new Date(c.data_saida), "yyyy-MM-dd");
      if (days[key]) days[key].saidas++;
    });
    return Object.values(days);
  }, [stats, periodStart]);

  // Categoria donut data
  const categoriaData = useMemo(() => [
    { name: "STR", value: stats.activeByCategoria.str, fill: CATEGORIA_COLORS.str },
    { name: "UTS", value: stats.activeByCategoria.uts, fill: CATEGORIA_COLORS.uts },
    { name: "RECON", value: stats.activeByCategoria.recon, fill: CATEGORIA_COLORS.recon },
    { name: "INDEF.", value: stats.activeByCategoria.indefinida, fill: CATEGORIA_COLORS.indefinida },
    { name: "SUCATA", value: stats.activeByCategoria.sucata, fill: CATEGORIA_COLORS.sucata },
  ], [stats]);

  // Top máquinas por dias alugados
  const topMaquinasData = useMemo(() => {
    return ciclos
      .filter((c) => c.dias_alugada != null && c.dias_alugada > 0)
      .sort((a, b) => b.dias_alugada - a.dias_alugada)
      .slice(0, 10)
      .map((c) => ({ name: c.serie, dias: c.dias_alugada }));
  }, [ciclos]);

  // Histórico de saídas
  const historicoSaidas = useMemo(() => {
    return stats.saidas
      .sort((a, b) => new Date(b.data_saida) - new Date(a.data_saida))
      .map((c) => {
        const m = getMaquina(c);
        return {
          ...c,
          modelo: m?.modelo || "—",
        };
      });
  }, [stats, maquinas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: "Entradas", value: stats.entradas.length, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Saídas", value: stats.saidas.length, icon: TrendingDown, color: "text-cyan-400", bg: "bg-cyan-500/10" },
    { label: "Média dias alugada", value: stats.mediaDias, icon: Calendar, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Méd. prateleira (dias)", value: stats.mediaPrateleira, icon: Clock, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Méd. fila (dias)", value: stats.mediaFila, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Period selector + refresh */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[7, 30, "all"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                period === p ? "bg-amber-500 text-slate-900" : "bg-slate-800 text-slate-400 border border-slate-700"
              }`}
            >
              {p === "all" ? "Tudo" : `${p} dias`}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
              <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-100">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Active by categoria (inline stat) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(stats.activeByCategoria).map(([cat, count]) => (
          <div key={cat} className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ background: CATEGORIA_COLORS[cat] }} />
            <div>
              <p className="text-lg font-bold text-slate-100">{count}</p>
              <p className="text-xs text-slate-500 uppercase">{cat}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Entradas vs saídas por dia */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Entradas vs Saídas por dia</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="day" stroke="#64748b" fontSize={10} angle={-45} textAnchor="end" height={50} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="entradas" fill="#22c55e" name="Entradas" radius={[4, 4, 0, 0]} />
              <Bar dataKey="saidas" fill="#06b6d4" name="Saídas" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por categoria */}
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Distribuição por categoria (ativas)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoriaData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                {categoriaData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top máquinas por dias alugados */}
      {topMaquinasData.length > 0 && (
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Top máquinas por dias alugados</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topMaquinasData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" stroke="#64748b" fontSize={11} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={10} width={100} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} />
              <Bar dataKey="dias" fill="#f59e0b" name="Dias" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Histórico de saídas table */}
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden">
        <h3 className="text-sm font-bold text-slate-300 p-4 border-b border-slate-700">Histórico de saídas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-slate-500 text-xs uppercase">
                <th className="text-left p-3 font-medium">NS</th>
                <th className="text-left p-3 font-medium">Modelo</th>
                <th className="text-left p-3 font-medium">Cliente</th>
                <th className="text-left p-3 font-medium">Data saída</th>
                <th className="text-left p-3 font-medium">Data retorno</th>
                <th className="text-right p-3 font-medium">Dias</th>
              </tr>
            </thead>
            <tbody>
              {historicoSaidas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">Sem saídas no período</td>
                </tr>
              ) : (
                historicoSaidas.map((c) => (
                  <tr key={c.id} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="p-3 font-bold text-slate-200">{c.serie}</td>
                    <td className="p-3 text-slate-400">{c.modelo}</td>
                    <td className="p-3 text-slate-400">{c.reserva_cliente || "—"}</td>
                    <td className="p-3 text-slate-400">{c.data_saida ? format(new Date(c.data_saida), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-3 text-slate-400">{c.data_retorno ? format(new Date(c.data_retorno), "dd/MM/yyyy") : "—"}</td>
                    <td className="p-3 text-right text-amber-400 font-medium">{c.dias_alugada ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}