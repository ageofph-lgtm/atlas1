import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, ArrowRight, ArrowLeft, Loader2, Package } from "lucide-react";
import { format } from "date-fns";

export default function Saida({ currentUser }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [prontas, setProntas] = useState([]);
  const [alugadas, setAlugadas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acting, setActing] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const p = await base44.entities.Ciclo.filter({ estado: "pronta" });
      setProntas(p);
      const a = await base44.entities.Ciclo.filter({ estado: "em_aluguer" });
      setAlugadas(a);
      const allMaquinas = await base44.entities.Maquina.list("-created_date", 500);
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
  const getMaquina = (c) => maquinaMap[c.maquina_id] || (c.serie && maquinaMap["serie:" + c.serie]) || null;

  const handleDarSaida = async (ciclo) => {
    setActing(ciclo.id);
    try {
      const now = new Date().toISOString();
      await base44.entities.Ciclo.update(ciclo.id, {
        estado: "em_aluguer",
        data_saida: now,
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: ciclo.id,
        serie: ciclo.serie,
        de_estado: "pronta",
        para_estado: "em_aluguer",
        autor,
        nota: "Saída para aluguer",
      });
      toast({ title: "✓ Saída registada", description: `NS: ${ciclo.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setActing(null);
  };

  const handleRetorno = async (ciclo) => {
    setActing(ciclo.id);
    try {
      const now = new Date().toISOString();
      const dias = ciclo.data_saida
        ? Math.ceil((new Date(now) - new Date(ciclo.data_saida)) / (1000 * 60 * 60 * 24))
        : 0;
      await base44.entities.Ciclo.update(ciclo.id, {
        estado: "fechado",
        data_retorno: now,
        dias_alugada: dias,
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: ciclo.id,
        serie: ciclo.serie,
        de_estado: "em_aluguer",
        para_estado: "fechado",
        autor,
        nota: `Retorno — ${dias} dias alugada`,
      });
      toast({ title: "✓ Retorno registado", description: `${ciclo.serie} — ${dias} dias` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setActing(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Panel A: Prontas */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-green-400">Prontas para Saída</h2>
            <span className="text-xs text-slate-500">({prontas.length})</span>
          </div>
          <button onClick={loadData} className="p-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-amber-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {prontas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Package className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma máquina pronta</p>
          </div>
        ) : (
          <div className="space-y-3">
            {prontas.map((c) => {
              const m = getMaquina(c);
              return (
                <div key={c.id} className="bg-slate-800/60 border border-green-500/20 rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="text-2xl font-black tracking-wider text-slate-100 break-all">{c.serie}</h3>
                    <p className="text-sm text-slate-400">{m?.modelo || "—"} {m?.ano && `· ${m.ano}`}</p>
                    {c.data_pronta && (
                      <p className="text-xs text-slate-500 mt-1">Pronta desde: {format(new Date(c.data_pronta), "dd/MM HH:mm")}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDarSaida(c)}
                    disabled={acting === c.id}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {acting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    Dar Saída
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panel B: Em Aluguer */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <h2 className="text-sm font-bold uppercase tracking-wide text-cyan-400">Em Aluguer — Aguardando Retorno</h2>
            <span className="text-xs text-slate-500">({alugadas.length})</span>
          </div>
        </div>

        {alugadas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Package className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma máquina em aluguer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alugadas.map((c) => {
              const m = getMaquina(c);
              const dias = c.data_saida ? Math.ceil((new Date() - new Date(c.data_saida)) / (1000 * 60 * 60 * 24)) : 0;
              return (
                <div key={c.id} className="bg-slate-800/60 border border-cyan-500/20 rounded-lg p-4">
                  <div className="mb-3">
                    <h3 className="text-2xl font-black tracking-wider text-slate-100 break-all">{c.serie}</h3>
                    <p className="text-sm text-slate-400">{m?.modelo || "—"} {m?.ano && `· ${m.ano}`}</p>
                    <p className="text-xs text-cyan-400 mt-1">
                      Saída: {c.data_saida ? format(new Date(c.data_saida), "dd/MM HH:mm") : "—"} · {dias} dias
                    </p>
                  </div>
                  <button
                    onClick={() => handleRetorno(c)}
                    disabled={acting === c.id}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {acting === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
                    Registar Retorno
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}