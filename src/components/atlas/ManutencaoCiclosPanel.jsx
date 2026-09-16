import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wrench, Loader2, Search, AlertTriangle, Trash2, CheckSquare, Square, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { ESTADO_CONFIG, CATEGORIA_CONFIG } from "@/components/atlas/constants";
import { estadoEfetivo, classificarCiclosAbertos } from "@/components/atlas/cicloUtils";

const fmt = (d) => (d ? format(new Date(d), "dd/MM/yy HH:mm") : "—");

/**
 * Limpeza de ciclos criados por engano — nomeadamente os duplicados que o bug
 * da trava de entrada deixou passar, com entradas e saídas que nunca
 * aconteceram e que falseiam as contagens dos relatórios.
 *
 * Só diagnostica até lhe mandarem apagar: mostra todos os ciclos de uma série
 * (ou as séries com mais de um ciclo aberto), e só remove o que for escolhido
 * à mão e confirmado. Apagar é definitivo — faça um backup antes, no painel
 * acima.
 */
export default function ManutencaoCiclosPanel() {
  const [serie, setSerie] = useState("");
  const [busy, setBusy] = useState(false);
  const [ciclos, setCiclos] = useState(null);
  const [contexto, setContexto] = useState("");
  const [selecionados, setSelecionados] = useState({});
  const [confirmar, setConfirmar] = useState(false);
  const [status, setStatus] = useState(null);

  const reset = () => {
    setSelecionados({});
    setConfirmar(false);
    setStatus(null);
  };

  /** Conta os eventos de cada ciclo, para se saber o que desaparece com ele. */
  const comEventos = async (lista) =>
    Promise.all(
      lista.map(async (c) => {
        try {
          const evs = await base44.entities.EventoCiclo.filter({ ciclo_id: c.id });
          return { ...c, nEventos: evs.length };
        } catch (_e) {
          return { ...c, nEventos: null };
        }
      })
    );

  const diagnosticarSerie = async () => {
    const ns = serie.trim();
    if (!ns) return;
    setBusy(true);
    reset();
    try {
      const encontrados = await base44.entities.Ciclo.filter({ serie: ns });
      const ordenados = [...encontrados].sort(
        (a, b) => new Date(a.data_entrada || a.created_date) - new Date(b.data_entrada || b.created_date)
      );
      setCiclos(await comEventos(ordenados));
      const { noPatio, fora } = classificarCiclosAbertos(encontrados);
      const abertos = [noPatio, fora].filter(Boolean).length;
      setContexto(
        `${encontrados.length} ciclo(s) para ${ns} · ${abertos} por fechar` +
          (abertos > 1 ? " — há mais do que um ciclo aberto, o que não devia acontecer." : "")
      );
    } catch (e) {
      setStatus({ type: "err", msg: `Erro ao ler os ciclos: ${e.message}` });
    }
    setBusy(false);
  };

  const procurarAnomalias = async () => {
    setBusy(true);
    reset();
    setSerie("");
    try {
      const todos = await base44.entities.Ciclo.list("-created_date", 1000);
      const porSerie = {};
      todos.forEach((c) => {
        if (!c.serie) return;
        (porSerie[c.serie] = porSerie[c.serie] || []).push(c);
      });
      const problematicas = Object.entries(porSerie).filter(([, lista]) => {
        const { noPatio, fora } = classificarCiclosAbertos(lista);
        return !!noPatio && !!fora;
      });
      if (problematicas.length === 0) {
        setCiclos([]);
        setContexto("Nenhuma série com mais de um ciclo aberto. Nada a corrigir.");
      } else {
        const lista = problematicas.flatMap(([, l]) => l);
        setCiclos(await comEventos(lista.sort((a, b) => String(a.serie).localeCompare(String(b.serie)))));
        setContexto(
          `${problematicas.length} série(s) com mais de um ciclo aberto: ${problematicas.map(([s]) => s).join(", ")}`
        );
      }
    } catch (e) {
      setStatus({ type: "err", msg: `Erro ao procurar anomalias: ${e.message}` });
    }
    setBusy(false);
  };

  const toggle = (id) => {
    setConfirmar(false);
    setSelecionados((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const escolhidos = (ciclos || []).filter((c) => selecionados[c.id]);
  const eventosAfetados = escolhidos.reduce((s, c) => s + (c.nEventos || 0), 0);

  const eliminar = async () => {
    if (escolhidos.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      let nEventos = 0;
      for (const c of escolhidos) {
        const evs = await base44.entities.EventoCiclo.filter({ ciclo_id: c.id });
        for (const ev of evs) {
          await base44.entities.EventoCiclo.delete(ev.id);
          nEventos++;
        }
        await base44.entities.Ciclo.delete(c.id);
      }
      setStatus({
        type: "ok",
        msg: `${escolhidos.length} ciclo(s) e ${nEventos} evento(s) eliminados. A máquina fica só com os ciclos que sobraram.`,
      });
      setCiclos((prev) => prev.filter((c) => !selecionados[c.id]));
      setSelecionados({});
      setConfirmar(false);
    } catch (e) {
      setStatus({ type: "err", msg: `Erro ao eliminar: ${e.message}. Verifique o que ficou antes de repetir.` });
    }
    setBusy(false);
  };

  return (
    <div className="glass border border-slate-700 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-bold text-slate-300">Manutenção de ciclos</h3>
        <span className="text-xs text-slate-500">· admin</span>
      </div>

      <p className="text-xs text-slate-500">
        Remove ciclos criados por engano — entradas e saídas que nunca aconteceram e que falseiam as
        contagens. Mostra tudo primeiro; só apaga o que escolher. <span className="text-amber-400/80">Apagar é
        definitivo — exporte um backup antes.</span>
      </p>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && diagnosticarSerie()}
            placeholder="Número de série"
            className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
          />
        </div>
        <button
          onClick={diagnosticarSerie}
          disabled={busy || !serie.trim()}
          className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-bold disabled:opacity-50"
        >
          VER CICLOS
        </button>
        <button
          onClick={procurarAnomalias}
          disabled={busy}
          className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />}
          PROCURAR DUPLICADOS
        </button>
      </div>

      {contexto && <p className="text-xs text-slate-400">{contexto}</p>}

      {ciclos && ciclos.length > 0 && (
        <>
          <div className="overflow-x-auto border border-slate-700 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 text-slate-500 uppercase text-[10px]">
                  <th className="p-2 w-8" />
                  <th className="text-left p-2 font-medium">NS</th>
                  <th className="text-left p-2 font-medium">Estado</th>
                  <th className="text-left p-2 font-medium">Cat.</th>
                  <th className="text-left p-2 font-medium">Cone</th>
                  <th className="text-left p-2 font-medium">Entrada</th>
                  <th className="text-left p-2 font-medium">Saída</th>
                  <th className="text-left p-2 font-medium">Retorno</th>
                  <th className="text-right p-2 font-medium">Dias</th>
                  <th className="text-right p-2 font-medium">Ev.</th>
                </tr>
              </thead>
              <tbody>
                {ciclos.map((c) => {
                  const estado = estadoEfetivo(c);
                  const cfg = ESTADO_CONFIG[estado] || ESTADO_CONFIG.entrada;
                  const cat = CATEGORIA_CONFIG[c.categoria];
                  const marcado = !!selecionados[c.id];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      className={`border-b border-slate-700/50 cursor-pointer ${marcado ? "bg-red-500/10" : "hover:bg-slate-700/20"}`}
                    >
                      <td className="p-2">
                        {marcado ? <CheckSquare className="w-4 h-4 text-red-400" /> : <Square className="w-4 h-4 text-slate-600" />}
                      </td>
                      <td className="p-2 num font-bold text-slate-200">{c.serie}</td>
                      <td className="p-2">
                        <span className={`px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </td>
                      <td className="p-2 text-slate-400">{cat?.label || c.categoria || "—"}</td>
                      <td className="p-2 text-slate-400">{c.cone_numero ? `${c.cone_cor || ""} ${c.cone_numero}` : "—"}</td>
                      <td className="p-2 text-slate-400 whitespace-nowrap">{fmt(c.data_entrada)}</td>
                      <td className="p-2 text-slate-400 whitespace-nowrap">{fmt(c.data_saida)}</td>
                      <td className="p-2 text-slate-400 whitespace-nowrap">{fmt(c.data_retorno)}</td>
                      <td className="p-2 text-right text-slate-400">{c.dias_alugada ?? "—"}</td>
                      <td className="p-2 text-right text-slate-500">{c.nEventos ?? "?"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {escolhidos.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/40 rounded-lg p-3 space-y-2">
              <div className="flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  Vai eliminar <span className="font-bold">{escolhidos.length} ciclo(s)</span> e{" "}
                  <span className="font-bold">{eventosAfetados} evento(s)</span> de histórico:{" "}
                  {escolhidos.map((c) => `${c.serie} (${estadoEfetivo(c)})`).join(", ")}. Não há como desfazer.
                </p>
              </div>
              {confirmar ? (
                <div className="flex gap-2">
                  <button
                    onClick={eliminar}
                    disabled={busy}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    CONFIRMAR ELIMINAÇÃO
                  </button>
                  <button
                    onClick={() => setConfirmar(false)}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmar(true)}
                  className="px-3 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-300 border border-red-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ELIMINAR SELECIONADOS
                </button>
              )}
            </div>
          )}
        </>
      )}

      {status && (
        <p className={`text-xs ${status.type === "ok" ? "text-green-400" : "text-red-400"}`}>{status.msg}</p>
      )}
    </div>
  );
}
