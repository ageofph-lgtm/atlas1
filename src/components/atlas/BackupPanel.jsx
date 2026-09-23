import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { listarTudo } from "@/components/atlas/carregarTudo";
import { Download, Upload, Loader2, ShieldCheck, ImageOff } from "lucide-react";
import {
  BACKUP_ENTITIES, recolherBackup, novosRegistos, ficheiroValido,
} from "@/components/atlas/backup";

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
      const { payload, total, emFalta } = await recolherBackup(base44);
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({
        type: emFalta.length ? "aviso" : "ok",
        msg: emFalta.length
          ? `Backup descarregado: ${total} registos. Atenção: ${emFalta.join(", ")} não existe na app e ficou de fora.`
          : `Backup descarregado: ${total} registos.`,
      });
    } catch (e) {
      // A mensagem verdadeira vai para o ecrã. O "Erro ao gerar o backup"
      // genérico escondia exatamente o que era preciso saber — incluindo o
      // aviso de leitura incompleta, que é o mais importante de todos.
      setStatus({ type: "err", msg: e?.message || "Erro ao gerar o backup." });
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
        if (!ficheiroValido(data)) throw new Error("Ficheiro sem dados de backup lá dentro.");
        const summary = {};
        for (const name of BACKUP_ENTITIES) {
          if (!base44.entities[name]) continue;
          const existing = (await listarTudo(base44.entities[name], { maximo: 50000 })).registos;
          const doFicheiro = data.entities[name] || [];
          const recs = novosRegistos(doFicheiro, existing, name);
          if (recs.length) await chunkCreate(name, recs);
          summary[name] = { importados: recs.length, ignorados: doFicheiro.length - recs.length };
        }
        const total = Object.values(summary).reduce((s2, r) => s2 + r.importados, 0);
        setStatus({ type: "ok", msg: `Restauro concluído: ${total} registos importados (ignorados os já existentes).` });
      } catch (err) {
        setStatus({ type: "err", msg: err?.message || "Ficheiro inválido ou erro no restauro." });
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
      <p className="text-xs text-slate-500 mb-3">
        Exporta as máquinas, ciclos, eventos, mensagens e pedidos para um ficheiro, ou restaura a partir de um backup.
      </p>
      {/* Uma limitação que só se descobriria no dia do restauro, com as fotos
          todas em branco. Mais vale sabê-la antes. */}
      <p className="flex items-start gap-1.5 text-[11px] text-slate-500 mb-4">
        <ImageOff className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
        As fotografias não vão dentro do ficheiro — guarda-se o endereço de cada uma, que só funciona
        enquanto a app existir. Um restauro noutra app traz os registos, não as imagens.
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
        <div className={`mt-3 text-xs px-3 py-2 rounded border ${
          status.type === "ok" ? "bg-green-500/10 border-green-500/30 text-green-400"
            : status.type === "aviso" ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
            : "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          {status.msg}
        </div>
      )}
    </div>
  );
}