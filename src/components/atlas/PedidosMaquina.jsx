import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { MessageSquarePlus, Loader2, Check, X, Plus, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { notificarPedido, notificarRespostaPedido } from "@/components/atlas/mensagens";

const ESTADO_PEDIDO = {
  aberto: { label: "ABERTO", cls: "bg-amber-500/15 text-amber-300 border-amber-500/40" },
  em_execucao: { label: "EM CURSO", cls: "bg-cyan-500/15 text-cyan-300 border-cyan-500/40" },
  concluido: { label: "CONCLUÍDO", cls: "bg-green-500/15 text-green-300 border-green-500/40" },
  cancelado: { label: "CANCELADO", cls: "bg-slate-600/20 text-slate-400 border-slate-600/40" },
};

const SUGESTOES = ["Bluespot frontal", "Posicionador de garfos", "Sideshift", "Espelho panorâmico", "Farol de trabalho"];

/**
 * Pedidos específicos de uma máquina, dentro do próprio card.
 * O comercial escreve o que a máquina precisa; a gestão recebe na caixa,
 * responde e faz chegar à oficina. Cada pedido guarda o comercial que o fez,
 * para a resposta voltar só a ele.
 */
export default function PedidosMaquina({ ciclo, currentUser, canPedir, canResponder }) {
  const [pedidos, setPedidos] = useState(null);
  const [texto, setTexto] = useState("");
  const [aEscrever, setAEscrever] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aResponder, setAResponder] = useState(null);
  const [resposta, setResposta] = useState("");

  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const load = useCallback(async () => {
    if (!ciclo?.id) return;
    try {
      const lista = await base44.entities.PedidoMaquina.filter({ ciclo_id: ciclo.id });
      setPedidos([...lista].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (_e) {
      setPedidos([]);
    }
  }, [ciclo?.id]);

  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    const t = texto.trim();
    if (!t) return;
    setSaving(true);
    try {
      await base44.entities.PedidoMaquina.create({
        ciclo_id: ciclo.id,
        serie: ciclo.serie,
        texto: t,
        comercial: autor,
        comercial_user_id: currentUser?.id || "",
        estado: "aberto",
      });
      await notificarPedido(ciclo, { autor, texto: t });
      setTexto("");
      setAEscrever(false);
      load();
    } catch (_e) {
      // erro a gravar — o texto fica no campo para não se perder
    }
    setSaving(false);
  };

  const responder = async (pedido, estado) => {
    setSaving(true);
    try {
      await base44.entities.PedidoMaquina.update(pedido.id, {
        estado,
        resposta: resposta.trim(),
        respondido_por: autor,
      });
      await notificarRespostaPedido(pedido, { autor, resposta: resposta.trim(), estado });
      setAResponder(null);
      setResposta("");
      load();
    } catch (_e) {
      // ignorado
    }
    setSaving(false);
  };

  const temPedidos = pedidos && pedidos.length > 0;
  if (!canPedir && !temPedidos) return null;

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
        <MessageSquarePlus className="w-3 h-3" />
        Pedidos para esta máquina
      </h4>

      {pedidos === null ? (
        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
      ) : (
        <div className="space-y-1.5">
          {pedidos.map((p) => {
            const cfg = ESTADO_PEDIDO[p.estado] || ESTADO_PEDIDO.aberto;
            return (
              <div key={p.id} className="bg-slate-900/60 border border-slate-700 rounded-md px-2.5 py-2">
                <div className="flex items-start gap-2">
                  <p className="text-xs text-slate-200 flex-1 break-words">{p.texto}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <p className="text-[10px] text-slate-600 mt-1">
                  {p.comercial || "—"}
                  {p.created_date && ` · ${format(new Date(p.created_date), "dd/MM HH:mm")}`}
                </p>
                {p.resposta && (
                  <p className="text-[11px] text-slate-400 mt-1 border-l-2 border-slate-700 pl-2">
                    {p.resposta} <span className="text-slate-600">— {p.respondido_por}</span>
                  </p>
                )}

                {canResponder && p.estado !== "concluido" && p.estado !== "cancelado" && (
                  aResponder === p.id ? (
                    <div className="mt-2 space-y-1.5">
                      <textarea
                        value={resposta}
                        onChange={(e) => setResposta(e.target.value)}
                        placeholder="Resposta ao comercial (opcional)..."
                        rows={2}
                        autoFocus
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none text-xs resize-y"
                      />
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => responder(p, "em_execucao")} disabled={saving} className="px-2 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-[10px] font-bold disabled:opacity-50">
                          PASSAR À OFICINA
                        </button>
                        <button onClick={() => responder(p, "concluido")} disabled={saving} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-bold disabled:opacity-50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> CONCLUÍDO
                        </button>
                        <button onClick={() => responder(p, "cancelado")} disabled={saving} className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-[10px]">
                          RECUSAR
                        </button>
                        <button onClick={() => { setAResponder(null); setResposta(""); }} className="px-2 py-1 text-slate-500 hover:text-slate-300 rounded text-[10px]">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAResponder(p.id); setResposta(p.resposta || ""); }}
                      className="text-[10px] text-amber-400/80 hover:text-amber-400 mt-1.5"
                    >
                      Responder
                    </button>
                  )
                )}
              </div>
            );
          })}

          {!temPedidos && !aEscrever && <p className="text-xs text-slate-600">Sem pedidos.</p>}

          {canPedir && (
            aEscrever ? (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-1 flex-wrap">
                  {SUGESTOES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setTexto((t) => (t ? `${t}, ${s}` : s))}
                      className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="O que esta máquina precisa? ex. bluespot frontal, posicionador..."
                  rows={2}
                  autoFocus
                  className="w-full px-2.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none text-xs resize-y"
                />
                <div className="flex gap-2">
                  <button
                    onClick={criar}
                    disabled={saving || !texto.trim()}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-900 rounded text-xs font-bold disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Enviar à gestão
                  </button>
                  <button
                    onClick={() => { setAEscrever(false); setTexto(""); }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs"
                  >
                    <X className="w-3 h-3" /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAEscrever(true)}
                className="flex items-center gap-1.5 text-xs text-amber-400/80 hover:text-amber-400 pt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Fazer pedido
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
