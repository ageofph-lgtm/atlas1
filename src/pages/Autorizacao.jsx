import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Zap, AlertTriangle, Loader2, Check } from "lucide-react";
import { ESTADO_CONFIG, CATEGORIA_CONFIG } from "@/components/atlas/constants";
import TarefasModal from "@/components/atlas/TarefasModal";
import { authorizeCiclo } from "@/components/atlas/authorizeCiclo";
import { useSyncWatcher } from "@/hooks/useSyncWatcher";

export default function Autorizacao({ currentUser, userPermissions }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";
  const canMarcarPronta = currentUser?.perfil === "gestor_frota" || currentUser?.perfil === "administrador";

  const handleMarcarPronta = async (ciclo) => {
    try {
      const now = new Date().toISOString();
      await base44.entities.Ciclo.update(ciclo.id, {
        estado: "pronta",
        data_pronta: now,
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: ciclo.id,
        serie: ciclo.serie,
        de_estado: ciclo.estado,
        para_estado: "pronta",
        autor,
        nota: "Marcada como pronta (sem O.S. no Watcher)",
      });
      toast({ title: "✓ Marcada como pronta", description: `NS: ${ciclo.serie}` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
  };

  const [classificadas, setClassificadas] = useState([]);
  const [emAndamento, setEmAndamento] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [authorizing, setAuthorizing] = useState(null);
  const [tarefasCiclo, setTarefasCiclo] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const cls = await base44.entities.Ciclo.filter({ estado: "classificada" });
      const manut = await base44.entities.Ciclo.filter({ estado: "manutencao" });
      const all = [...cls, ...manut];
      all.sort((a, b) => (b.prioridade ? 1 : 0) - (a.prioridade ? 1 : 0));
      setClassificadas(all);

      const aut = await base44.entities.Ciclo.filter({ estado: "autorizada" });
      const exec = await base44.entities.Ciclo.filter({ estado: "em_execucao" });
      setEmAndamento([...aut, ...exec]);

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

  useSyncWatcher(loadData);

  const maquinaMap = {};
  maquinas.forEach((m) => {
    maquinaMap[m.id] = m;
    if (m.serie) maquinaMap["serie:" + m.serie] = m;
  });
  const getMaquina = (ciclo) =>
    maquinaMap[ciclo.maquina_id] || (ciclo.serie && maquinaMap["serie:" + ciclo.serie]) || null;

  const togglePrioridade = async (ciclo) => {
    try {
      await base44.entities.Ciclo.update(ciclo.id, { prioridade: !ciclo.prioridade });
      setClassificadas((prev) => {
        const updated = prev.map((c) => (c.id === ciclo.id ? { ...c, prioridade: !c.prioridade } : c));
        updated.sort((a, b) => (b.prioridade ? 1 : 0) - (a.prioridade ? 1 : 0));
        return updated;
      });
    } catch (e) {
      toast({ variant: "destructive", title: "Erro", description: e.message });
    }
  };

  const handleAuthorize = (ciclo) => {
    setTarefasCiclo(ciclo);
  };

  const handleTarefasConfirm = async ({ tarefas, isVps, isExpress }) => {
    if (!tarefasCiclo) return;
    setAuthorizing(tarefasCiclo.id);
    try {
      const data = await authorizeCiclo(tarefasCiclo.id, autor, { tarefas, isVps, isExpress });
      toast({ title: "✓ Autorizada", description: `Watcher O.S.: ${data.watcher_os_id}` });
      setTarefasCiclo(null);
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro na autorização", description: err.message });
    }
    setAuthorizing(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("atlasToWatcher", { action: "sync_status", autor });
      const data = res?.data !== undefined ? res.data : res;
      if (data.error) throw new Error(data.error);

      toast({ title: "✓ Sync concluído", description: `${data.updated} atualizações de ${data.synced} máquinas` });
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro no sync", description: err.message });
    }
    setSyncing(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-100">Autorização de Máquinas</h2>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50"
        >
          {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Sincronizar com Watcher
        </button>
      </div>

      {/* Classificadas */}
      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-amber-400 mb-3">
          A Autorizar ({classificadas.length})
        </h3>
        {classificadas.length === 0 ? (
          <p className="text-slate-500 text-sm py-8 text-center">Nenhuma máquina aguardando autorização</p>
        ) : (
          <div className="space-y-3">
            {classificadas.map((c) => {
              const m = getMaquina(c);
              const catCfg = CATEGORIA_CONFIG[c.categoria] || CATEGORIA_CONFIG.nts;
              return (
                <div key={c.id} className={`bg-slate-800/60 border border-slate-700 rounded-lg p-4 ${c.prioridade ? "border-red-500/40" : ""}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-2xl font-black tracking-wider text-slate-100 break-all">{c.serie}</h4>
                      <p className="text-sm text-slate-400">{m?.modelo || "—"} {m?.ano && `· ${m.ano}`}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${catCfg.bg} ${catCfg.text}`}>{catCfg.label}</span>
                        {c.cone_cor && c.cone_numero && (
                          <span className="text-xs text-slate-400">Cone: {c.cone_cor} {c.cone_numero}</span>
                        )}
                        {c.estado === "manutencao" && (
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-600/20 text-amber-300 border border-amber-600/40">
                            EM MANUTENÇÃO
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => togglePrioridade(c)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${
                          c.prioridade
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : "bg-slate-700 text-slate-400 border border-slate-600"
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {c.prioridade ? "PRIORIDADE" : "Marcar prioridade"}
                      </button>
                      {c.categoria !== "sucata" && (
                        <button
                          onClick={() => handleAuthorize(c)}
                          disabled={authorizing === c.id}
                          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                        >
                          {authorizing === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                          AUTORIZAR
                        </button>
                      )}
                      {canMarcarPronta && (
                        <button
                          onClick={() => handleMarcarPronta(c)}
                          className="px-3 py-2 bg-slate-700 hover:bg-green-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          MARCAR PRONTA
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Em andamento no Watcher */}
      {emAndamento.length > 0 && (
        <div className="border-t border-slate-700 pt-4">
          <h3 className="text-sm font-bold uppercase tracking-wide text-purple-400 mb-3">
            No Watcher ({emAndamento.length})
          </h3>
          <div className="space-y-2">
            {emAndamento.map((c) => {
              const cfg = ESTADO_CONFIG[c.estado];
              return (
                <div key={c.id} className="bg-slate-800/40 border border-slate-700 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-200">{c.serie}</h4>
                    <p className="text-xs text-slate-500">Watcher: {c.watcher_os_id?.slice(-8) || "—"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canMarcarPronta && c.estado === "em_execucao" && (
                      <button
                        onClick={() => handleMarcarPronta(c)}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-green-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        MARCAR PRONTA
                      </button>
                    )}
                    <span className={`px-2 py-1 rounded text-xs font-medium ${cfg.bg} ${cfg.text} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TarefasModal
        open={!!tarefasCiclo}
        ciclo={tarefasCiclo}
        onClose={() => setTarefasCiclo(null)}
        onConfirm={handleTarefasConfirm}
        authorizing={authorizing !== null}
      />
    </div>
  );
}