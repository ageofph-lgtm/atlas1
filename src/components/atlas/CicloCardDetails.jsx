import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { SPEC_LABELS } from "./constants";

const fmt = (d) => (d ? format(new Date(d), "dd/MM HH:mm") : null);

function SpecRow({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 text-right truncate">{value || "—"}</span>
    </div>
  );
}

export default function CicloCardDetails({ ciclo, maquina }) {
  const [eventos, setEventos] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    base44.entities.EventoCiclo.filter({ ciclo_id: ciclo.id })
      .then((data) => {
        if (cancelled) return;
        const sorted = [...data].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        setEventos(sorted);
      })
      .catch(() => { if (!cancelled) setEventos([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ciclo.id]);

  const dateEntries = [
    { label: "Entrada", value: ciclo.data_entrada },
    { label: "Classificação", value: ciclo.data_classificacao },
    { label: "Autorização", value: ciclo.data_autorizacao },
    { label: "Execução início", value: ciclo.previsao_inicio },
    { label: "Previsão fim", value: ciclo.previsao_fim },
    { label: "Pronta", value: ciclo.data_pronta },
    { label: "Saída", value: ciclo.data_saida, extra: [ciclo.tipo_saida, ciclo.reserva_cliente].filter(Boolean).join(" · ") || null },
    { label: "Retorno", value: ciclo.data_retorno, extra: ciclo.dias_alugada != null ? `${ciclo.dias_alugada} dias alugada` : null },
  ].filter((e) => e.value);

  return (
    <div className="space-y-4 pt-3 mt-2 border-t border-slate-700/60">
      {/* Características Completas */}
      <div>
        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-2">Características Completas</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <SpecRow label="Modelo" value={maquina?.modelo} />
          <SpecRow label="Ano" value={maquina?.ano} />
          <SpecRow label="Mastro" value={maquina?.mastro ? `${SPEC_LABELS.mastro?.[maquina.mastro] || maquina.mastro}${maquina.vias_mastro ? ` ${maquina.vias_mastro}V` : ""}` : null} />
          <SpecRow label="H3" value={maquina?.h3 ? `${maquina.h3}mm` : null} />
          <SpecRow label="Bateria" value={maquina?.bateria ? (SPEC_LABELS.bateria?.[maquina.bateria] || maquina.bateria) : null} />
          <SpecRow label="Joystick" value={maquina?.joystick ? (SPEC_LABELS.joystick?.[maquina.joystick] || maquina.joystick) : null} />
          <SpecRow label="Pneus" value={maquina?.tipo_pneu ? (SPEC_LABELS.tipo_pneu?.[maquina.tipo_pneu] || maquina.tipo_pneu) : null} />
        </div>
        <div className="mt-2 text-xs">
          <span className="text-slate-500">Acessórios: </span>
          <span className="text-slate-200">{maquina?.acessorios?.length ? maquina.acessorios.map((a) => SPEC_LABELS.acessorios?.[a] || a).join(", ") : "—"}</span>
        </div>
      </div>

      {/* Datas do Ciclo */}
      {dateEntries.length > 0 && (
        <div>
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-2">Datas do Ciclo</h4>
          <div className="space-y-1">
            {dateEntries.map((e, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-slate-500">{e.label}</span>
                <span className="text-slate-200">
                  {fmt(e.value)}
                  {e.extra && <span className="text-slate-500 ml-1">· {e.extra}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Observações */}
      {ciclo.observacoes && (
        <div>
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1">Observações</h4>
          <p className="text-xs text-slate-300 whitespace-pre-wrap">{ciclo.observacoes}</p>
        </div>
      )}

      {/* Ligação Watcher */}
      {ciclo.watcher_os_id && (
        <div>
          <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1">Ligação Watcher</h4>
          <p className="text-xs text-purple-400 font-mono break-all">{ciclo.watcher_os_id}</p>
        </div>
      )}

      {/* Histórico */}
      <div>
        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-2">Histórico</h4>
        {loading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
          </div>
        ) : eventos && eventos.length > 0 ? (
          <div>
            {eventos.map((ev, i) => (
              <div key={ev.id || i} className="flex gap-2 text-xs">
                <div className="flex flex-col items-center pt-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  {i < eventos.length - 1 && <div className="w-px flex-1 bg-slate-700 min-h-[20px]" />}
                </div>
                <div className="pb-3 flex-1">
                  <p className="text-slate-300">
                    <span className="text-slate-500">{ev.de_estado || "início"}</span>
                    <span className="mx-1 text-amber-400">→</span>
                    <span className="text-slate-100 font-medium">{ev.para_estado}</span>
                  </p>
                  {ev.nota && <p className="text-slate-500 mt-0.5">{ev.nota}</p>}
                  <p className="text-slate-600 mt-0.5">
                    {ev.autor || "—"} · {ev.created_date ? format(new Date(ev.created_date), "dd/MM HH:mm") : "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-600">Sem eventos registados.</p>
        )}
      </div>
    </div>
  );
}