import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, CheckSquare, Square, Loader2, Zap, MessageSquarePlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { textoTarefaDoPedido, PEDIDO_ESTADOS_POR_FAZER } from "@/components/atlas/pedidosOS";

const PREDEFINED_TAREFAS = [
  { key: "preparacao", label: "Preparação geral" },
  { key: "revisao", label: "Revisão 3000h" },
  { key: "vps", label: "VPS" },
  { key: "express", label: "EXPRESS" },
];

/**
 * `ciclos` (lista) autoriza várias de uma vez: as tarefas escolhidas aplicam-se
 * a todas e os pedidos aparecem agrupados por máquina. `ciclo` continua a valer
 * para o caso de uma só, que é o caminho de sempre.
 */
export default function TarefasModal({ open, ciclo, ciclos, onClose, onConfirm, authorizing, progresso }) {
  const alvos = ciclos?.length ? ciclos : ciclo ? [ciclo] : [];
  const emMassa = alvos.length > 1;
  const chaveAlvos = alvos.map((c) => c.id).join(",");
  const [selected, setSelected] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [customInput, setCustomInput] = useState("");
  // O que os comerciais pediram nesta máquina. Vem para aqui porque é neste
  // momento — e só neste — que o pedido pode entrar na O.S. do Watcher.
  const [pedidos, setPedidos] = useState([]);
  const [pedidosSel, setPedidosSel] = useState({});
  const [aCarregarPedidos, setACarregarPedidos] = useState(false);

  useEffect(() => {
    if (open) {
      setSelected({});
      setCustomTasks([]);
      setCustomInput("");
    }
  }, [open, chaveAlvos]);

  useEffect(() => {
    if (!open || alvos.length === 0) {
      setPedidos([]);
      setPedidosSel({});
      return;
    }
    let cancelado = false;
    setACarregarPedidos(true);
    (async () => {
      let abertos = [];
      try {
        // Em lote, os pedidos de todas as máquinas — apresentados agrupados,
        // para se ver de quem é cada um antes de o mandar para a O.S.
        const listas = await Promise.all(
          alvos.map((c) => base44.entities.PedidoMaquina.filter({ ciclo_id: c.id }).catch(() => []))
        );
        abertos = listas.flat().filter((p) => PEDIDO_ESTADOS_POR_FAZER.includes(p.estado));
      } catch (_e) {
        // sem pedidos visíveis — a autorização não pode ficar bloqueada por isto
      }
      if (cancelado) return;
      setPedidos(abertos);
      // Vêm marcados: se a gestão está a autorizar, o normal é quererem-nos na O.S.
      setPedidosSel(Object.fromEntries(abertos.map((p) => [p.id, true])));
      setACarregarPedidos(false);
    })();
    return () => { cancelado = true; };
  }, [open, chaveAlvos]);

  const togglePedido = (id) => setPedidosSel((s) => ({ ...s, [id]: !s[id] }));

  const togglePredefined = (key) => setSelected((s) => ({ ...s, [key]: !s[key] }));

  const addCustomTask = () => {
    const text = customInput.trim();
    if (!text) return;
    setCustomTasks((prev) => [...prev, text]);
    setCustomInput("");
  };

  const removeCustomTask = (idx) => setCustomTasks((prev) => prev.filter((_, i) => i !== idx));

  const handleConfirm = () => {
    const tarefas = [];
    if (selected.preparacao) tarefas.push({ texto: "Preparação geral", concluida: false });
    if (selected.revisao) tarefas.push({ texto: "Revisão 3000h", concluida: false });
    if (selected.vps) tarefas.push({ texto: "VPS", concluida: false });
    if (selected.express) tarefas.push({ texto: "EXPRESS", concluida: false });
    // Os pedidos do comercial entram na O.S. como tarefas, com o nome de quem
    // pediu — na oficina, saber a quem perguntar vale mais do que a descrição.
    const migrados = pedidos.filter((p) => pedidosSel[p.id]);
    migrados.forEach((p) => tarefas.push({ texto: textoTarefaDoPedido(p), concluida: false }));
    customTasks.forEach((t) => tarefas.push({ texto: t, concluida: false }));
    onConfirm({ tarefas, isVps: !!selected.vps, isExpress: !!selected.express, pedidosMigrados: migrados, alvos });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-400" />
            {emMassa ? `Autorizar ${alvos.length} máquinas` : "Autorizar — Tarefas da O.S."}
          </DialogTitle>
          <p className="text-sm text-slate-400">
            {emMassa
              ? "As tarefas escolhidas aplicam-se a todas. Cada uma leva os seus próprios pedidos."
              : `NS: ${ciclo?.serie}`}
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Predefined checkboxes */}
          <div className="space-y-2">
            {PREDEFINED_TAREFAS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => togglePredefined(t.key)}
                className={`w-full flex items-center gap-3 p-3 min-h-[48px] rounded-lg border transition-colors text-left ${
                  selected[t.key]
                    ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                    : "bg-slate-900/40 border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                {selected[t.key]
                  ? <CheckSquare className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  : <Square className="w-5 h-5 text-slate-600 flex-shrink-0" />}
                <span className="text-sm font-medium">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Pedidos dos comerciais — seguem para a O.S. com a máquina */}
          {(aCarregarPedidos || pedidos.length > 0) && (
            <div>
              <p className="text-xs text-purple-400 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <MessageSquarePlus className="w-3.5 h-3.5" />
                Pedidos dos comerciais
                {aCarregarPedidos && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
              </p>
              <div className="space-y-2">
                {pedidos.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePedido(p.id)}
                    className={`w-full flex items-start gap-3 p-3 min-h-[48px] rounded-lg border transition-colors text-left ${
                      pedidosSel[p.id]
                        ? "bg-purple-500/15 border-purple-500/50"
                        : "bg-slate-900/40 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    {pedidosSel[p.id]
                      ? <CheckSquare className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      : <Square className="w-5 h-5 text-slate-600 flex-shrink-0 mt-0.5" />}
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium break-words ${pedidosSel[p.id] ? "text-purple-200" : "text-slate-300"}`}>
                        {p.texto}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">
                        {p.comercial || "—"}
                        {emMassa && p.serie && <span className="num text-slate-600"> · {p.serie}</span>}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
              {pedidos.length > 0 && (
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Os marcados entram na O.S. como tarefas e o comercial é avisado. Os que desmarcar ficam
                  no card, por responder.
                </p>
              )}
            </div>
          )}

          {/* Custom task input */}
          <div>
            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Adicionar tarefa personalizada</p>
            <div className="flex gap-2">
              <Input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomTask(); } }}
                placeholder="Nova tarefa..."
                className="bg-slate-900/60 border-slate-700 text-slate-100 text-base"
              />
              <Button onClick={addCustomTask} size="icon" variant="secondary" type="button" className="flex-shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Custom tasks list */}
          {customTasks.length > 0 && (
            <div className="space-y-1.5">
              {customTasks.map((t, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-900/40 border border-slate-700 rounded-lg px-3 py-2 min-h-[40px]">
                  <span className="text-sm text-slate-300 flex-1 break-words">{t}</span>
                  <button onClick={() => removeCustomTask(i)} type="button" className="text-slate-500 hover:text-red-400 flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={authorizing} type="button">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={authorizing} type="button" className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold">
            {authorizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
            {authorizing && progresso?.total
              ? `A AUTORIZAR ${progresso.feito}/${progresso.total}`
              : emMassa ? `AUTORIZAR ${alvos.length}` : "AUTORIZAR"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}