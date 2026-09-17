import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Download, Upload, Loader2, ShieldCheck } from "lucide-react";

const BACKUP_ENTITIES = ["Maquina", "Ciclo", "EventoCiclo", "Mensagem", "PedidoMaquina", "Pedido", "OrdemServico", "FrotaACP", "Notificacao"];
const BUILTIN_FIELDS = ["id", "created_date", "updated_date", "created_by_id"];

const NATURAL_KEYS = {
  Maquina: (r) => r.serie || null,
  Ciclo: (r) => `${r.maquina_id}|${r.estado}|${r.data_entrada || ""}`,
  EventoCiclo: (r) => `${r.ciclo_id}|${r.de_estado || ""}|${r.para_estado}|${r.nota || ""}`,
  Pedido: (r) => `${r.cliente}|${r.estado}|${r.data_necessaria || ""}`,
  OrdemServico: (r) => `${r.serie}|${r.cliente || ""}`,
  FrotaACP: (r) => r.serie || null,
  Notificacao: (r) => `${r.userId}|${r.message}|${r.osId || ""}`,
  Mensagem: (r) => `${r.destino || r.destino_user_id}|${r.titulo}|${r.ciclo_id || ""}|${r.created_date || ""}`,
  PedidoMaquina: (r) => `${r.ciclo_id}|${r.texto}|${r.comercial_user_id || ""}`,
};

const strip = (rec) => {
  const out = { ...rec };
  BUILTIN_FIELDS.forEach((f) => delete out[f]);
  return out;
};

const chunkCreate = async (name, recs) => {
  const batch = 400;
  for (let i = 0; i < recs.length; i += batch) {
    await base44.entities[name].bulkCreate(recs.slice(i, i + batch));
  }
};

export default function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const fileRef = useRef(null);

  const handleExport = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const entities = {};
      for (const name of BACKUP_ENTITIES) {
        entities[name] = await base44.entities[name].list("-created_date", 5000);
      }
      const payload = { app: "ATLAS", version: 1, exportedAt: new Date().toISOString(), entities };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      const total = Object.values(entities).reduce((s, r) => s + r.length, 0);
      setStatus({ type: "ok", msg: `Backup descarregado: ${total} registos.` });
    } catch (_e) {
      setStatus({ type: "err", msg: "Erro ao gerar o backup." });
    } finally {
      setBusy(false);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data?.entities) throw new Error("formato inválido");
        const summary = {};
        for (const name of BACKUP_ENTITIES) {
          const existing = await base44.entities[name].list("-created_date", 5000);
          const existingKeys = new Set(existing.map(NATURAL_KEYS[name]).filter(Boolean));
          const recs = (data.entities[name] || [])
            .map(strip)
            .filter((r) => {
              const k = NATURAL_KEYS[name](r);
              return k ? !existingKeys.has(k) : true;
            });
          if (recs.length) await chunkCreate(name, recs);
          summary[name] = { noFicheiro: (data.entities[name] || []).length, importados: recs.length, ignorados: (data.entities[name] || []).length - recs.length };
        }
        const total = Object.values(summary).reduce((s, r) => s + r.importados, 0);
        setStatus({ type: "ok", msg: `Restauro concluído: ${total} registos importados (ignorados os já existentes).` });
      } catch (_err) {
        setStatus({ type: "err", msg: "Ficheiro inválido ou erro no restauro." });
      } finally {
        setBusy(false);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="glass border border-amber-500/30 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-200">Sistema de Proteção de Dados</h3>
        <span className="ml-auto text-[10px] uppercase tracking-wide text-amber-500/80 border border-amber-500/30 rounded px-1.5 py-0.5">Admin</span>
      </div>
      <p className="text-xs text-slate-500 mb-4">
        Exporta todas as máquinas, ciclos, eventos, pedidos e restantes dados para um ficheiro, ou restaura a partir de um backup.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleExport}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-sm font-bold disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Descarregar Backup
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-sm font-medium disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Carregar Backup
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleFile} className="hidden" />
      </div>
      {status && (
        <div className={`mt-3 text-xs px-3 py-2 rounded border ${status.type === "ok" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}