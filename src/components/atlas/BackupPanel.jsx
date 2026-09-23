import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { listarTudo } from "@/components/atlas/carregarTudo";
import { Download, Upload, Loader2, ShieldCheck, Images } from "lucide-react";
import {
  BACKUP_ENTITIES, recolherBackup, novosRegistos, ficheiroValido,
  urlsDeFotos, recolherFotos, trocarEnderecosDeFoto,
} from "@/components/atlas/backup";
import { construirZip, lerZip, pareceZip } from "@/components/atlas/backupZip";

const chunkCreate = async (name, recs) => {
  const batch = 400;
  for (let i = 0; i < recs.length; i += batch) {
    await base44.entities[name].bulkCreate(recs.slice(i, i + batch));
  }
};

const descarregar = (dados, nome, tipo) => {
  const url = URL.createObjectURL(new Blob([dados], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
};

/** Em MB só quando já há MB para mostrar: "0.0 MB" lê-se como se nada tivesse sido guardado. */
const tamanho = (bytes) =>
  bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Concordância: "1 fotografias ficaram de fora" denuncia texto montado por um programa. */
const fotos = (n) => (n === 1 ? "1 fotografia" : `${n} fotografias`);

/**
 * Uma imagem do armazenamento da app, em bytes.
 *
 * O `res.ok` não chega: um servidor pode responder 200 com uma página de erro
 * em HTML, e sem verificar o tipo guardava-se essa página dentro do ZIP com
 * nome de fotografia. Só se descobria no dia do restauro, com uma imagem
 * partida onde devia estar a placa de características.
 */
const buscarImagem = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const tipo = res.headers.get("content-type") || "";
  if (!tipo.startsWith("image/")) throw new Error(`não é imagem (${tipo.split(";")[0] || "sem tipo"})`);
  return res.arrayBuffer();
};

export default function BackupPanel() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const [progresso, setProgresso] = useState(null);
  const [comFotos, setComFotos] = useState(true);
  const fileRef = useRef(null);

  const handleExport = async () => {
    setBusy(true);
    setStatus(null);
    setProgresso(null);
    try {
      const { payload, total, emFalta } = await recolherBackup(base44);
      const avisos = emFalta.length ? [`${emFalta.join(", ")} não existe na app e ficou de fora.`] : [];
      const dia = new Date().toISOString().slice(0, 10);

      if (!comFotos) {
        descarregar(JSON.stringify(payload, null, 2), `atlas-backup-${dia}.json`, "application/json");
        return setStatus({
          type: avisos.length ? "aviso" : "ok",
          msg: [`Backup descarregado: ${total} registos, sem fotografias.`, ...avisos].join(" "),
        });
      }

      const urls = urlsDeFotos(payload.entities);
      setProgresso({ feitas: 0, total: urls.length });
      const resultado = await recolherFotos(urls, {
        buscar: buscarImagem,
        onProgresso: setProgresso,
      });

      // O mapa vai para dentro do ficheiro; os registos ficam com os endereços
      // originais, para o backup continuar a valer se as imagens se perderem.
      const zip = await construirZip({ ...payload, version: 2, fotos: resultado.mapa }, resultado.ficheiros);
      descarregar(zip, `atlas-backup-${dia}.zip`, "application/zip");

      const guardadas = Object.keys(resultado.ficheiros).length;
      if (resultado.paradoNoLimite) avisos.push(`Parou no limite de tamanho: ${fotos(urls.length - guardadas)} ${urls.length - guardadas === 1 ? "ficou" : "ficaram"} de fora.`);
      else if (resultado.falhadas.length) avisos.push(`${fotos(resultado.falhadas.length)} não ${resultado.falhadas.length === 1 ? "respondeu" : "responderam"} e ${resultado.falhadas.length === 1 ? "ficou" : "ficaram"} de fora.`);

      setStatus({
        type: avisos.length ? "aviso" : "ok",
        msg: [`Backup descarregado: ${total} registos e ${guardadas} de ${urls.length} fotografias (${tamanho(zip.byteLength)}).`, ...avisos].join(" "),
      });
    } catch (e) {
      // A mensagem verdadeira vai para o ecrã. O "Erro ao gerar o backup"
      // genérico escondia exatamente o que era preciso saber — incluindo o
      // aviso de leitura incompleta, que é o mais importante de todos.
      setStatus({ type: "err", msg: e?.message || "Erro ao gerar o backup." });
    } finally {
      setBusy(false);
      setProgresso(null);
    }
  };

  /**
   * Volta a pôr as imagens no armazenamento da app e devolve endereço antigo →
   * novo. Só sobem as que algum registo a importar usa: as outras não servem
   * para nada e cada subida custa tempo.
   */
  const reporFotos = async (ficheiros, mapa, usadas) => {
    const novo = {};
    const porNome = Object.entries(mapa).filter(([url]) => usadas.has(url));
    for (let i = 0; i < porNome.length; i += 1) {
      const [url, nome] = porNome[i];
      setProgresso({ feitas: i, total: porNome.length });
      const bytes = ficheiros[nome];
      if (!bytes) continue;
      try {
        const ficheiro = new File([bytes], nome.split("/").pop(), { type: "image/jpeg" });
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: ficheiro });
        if (file_url) novo[url] = file_url;
      } catch (_e) {
        // sem esta foto o registo fica com o endereço antigo, que é melhor que nada
      }
    }
    return novo;
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setStatus(null);
    setProgresso(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const bytes = new Uint8Array(ev.target.result);
        // Aceita os dois formatos: o ZIP com fotos e o JSON antigo, só registos.
        const { payload, ficheiros } = pareceZip(bytes)
          ? await lerZip(bytes)
          : { payload: JSON.parse(new TextDecoder().decode(bytes)), ficheiros: {} };

        if (!ficheiroValido(payload)) throw new Error("Ficheiro sem dados de backup lá dentro.");

        // Primeiro apura-se o que vai mesmo ser importado, para só subir as
        // fotos desses registos.
        const porEntidade = {};
        const usadas = new Set();
        for (const name of BACKUP_ENTITIES) {
          if (!base44.entities[name]) continue;
          const existing = (await listarTudo(base44.entities[name], { maximo: 50000 })).registos;
          const recs = novosRegistos(payload.entities[name] || [], existing, name);
          porEntidade[name] = recs;
          for (const url of urlsDeFotos({ [name]: recs })) usadas.add(url);
        }

        const mapaFotos = payload.fotos && Object.keys(ficheiros).length
          ? await reporFotos(ficheiros, payload.fotos, usadas)
          : {};

        let total = 0;
        for (const [name, recs] of Object.entries(porEntidade)) {
          const comFoto = recs.map((r) => trocarEnderecosDeFoto(r, name, mapaFotos));
          if (comFoto.length) await chunkCreate(name, comFoto);
          total += comFoto.length;
        }

        const nFotos = Object.keys(mapaFotos).length;
        setStatus({
          type: "ok",
          msg: `Restauro concluído: ${total} registos importados${nFotos ? ` e ${fotos(nFotos)} ${nFotos === 1 ? "reposta" : "repostas"}` : ""} (ignorados os já existentes).`,
        });
      } catch (err) {
        setStatus({ type: "err", msg: err?.message || "Ficheiro inválido ou erro no restauro." });
      } finally {
        setBusy(false);
        setProgresso(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
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

      {/* As fotos das placas são de onde sai o número de série quando a chapa da
          máquina já não se lê. Sem elas, o backup perde o que é insubstituível. */}
      <label className="flex items-start gap-2 mb-4 cursor-pointer">
        <input
          type="checkbox"
          checked={comFotos}
          onChange={(ev) => setComFotos(ev.target.checked)}
          className="mt-0.5 accent-amber-500"
        />
        <span className="text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 font-medium text-slate-300">
            <Images className="w-3.5 h-3.5" /> Incluir as fotografias
          </span>
          <br />
          Gera um <span className="num">.zip</span> com as imagens lá dentro, em vez de um{" "}
          <span className="num">.json</span> só com os endereços. Demora bastante mais e o ficheiro é
          muito maior — mas é a única forma de as placas sobreviverem à app.
        </span>
      </label>

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
        <input ref={fileRef} type="file" accept="application/json,application/zip,.json,.zip" onChange={handleFile} className="hidden" />
      </div>

      {/* Centenas de imagens demoram; sem isto o ecrã parece pendurado. */}
      {progresso && progresso.total > 0 && (
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1">
            <span>Fotografias</span>
            <span className="num">{progresso.feitas} de {progresso.total}</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${Math.round((progresso.feitas / progresso.total) * 100)}%` }}
            />
          </div>
        </div>
      )}

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
