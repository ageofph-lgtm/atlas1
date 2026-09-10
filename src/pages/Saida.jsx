import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, ArrowRight, ArrowLeft, Loader2, Package, User, Zap } from "lucide-react";
import SaidaRapidaModal from "@/components/atlas/SaidaRapidaModal";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { CATEGORIA_CONE_MAP, CONE_COLORS } from "@/components/atlas/constants";
import { format } from "date-fns";

export default function Saida({ currentUser }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [prontas, setProntas] = useState([]);
  const [alugadas, setAlugadas] = useState([]);
  const [maquinas, setMaquinas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [saidaModal, setSaidaModal] = useState(null); // ciclo being given saída
  const [cliente, setCliente] = useState("");
  const [saidaRapidaOpen, setSaidaRapidaOpen] = useState(false);
  const [retornoModal, setRetornoModal] = useState(null);
  const [retornoConeNumero, setRetornoConeNumero] = useState("");
  const [retornoConeError, setRetornoConeError] = useState("");

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

  const maquinaMap = useMemo(() => {
    const map = {};
    maquinas.forEach((m) => {
      map[m.id] = m;
      if (m.serie) map["serie:" + m.serie] = m;
    });
    return map;
  }, [maquinas]);

  const getMaquina = (c) => maquinaMap[c.maquina_id] || (c.serie && maquinaMap["serie:" + c.serie]) || null;

  const openSaidaModal = (ciclo) => {
    setSaidaModal(ciclo);
    setCliente(ciclo.reserva_cliente || "");
  };

  const handleDarSaida = async () => {
    if (!saidaModal) return;
    setActing(saidaModal.id);
    try {
      const now = new Date().toISOString();
      const updateData = {
        estado: "em_aluguer",
        data_saida: now,
      };
      // Update reserva_cliente if changed or set
      if (cliente && cliente !== saidaModal.reserva_cliente) {
        updateData.reserva_cliente = cliente;
      }
      await base44.entities.Ciclo.update(saidaModal.id, updateData);
      await base44.entities.EventoCiclo.create({
        ciclo_id: saidaModal.id,
        serie: saidaModal.serie,
        de_estado: "pronta",
        para_estado: "em_aluguer",
        autor,
        nota: cliente ? `Saída para ${cliente}` : "Saída para aluguer",
      });
      toast({ title: "✓ Saída registada", description: `NS: ${saidaModal.serie}` });
      setSaidaModal(null);
      setCliente("");
      loadData();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setActing(null);
  };

  const openRetornoModal = (ciclo) => {
    setRetornoModal(ciclo);
    setRetornoConeNumero("");
    setRetornoConeError("");
  };

  const validateRetornoCone = async () => {
    if (!retornoModal) return;
    const cor = CATEGORIA_CONE_MAP[retornoModal.categoria];
    if (!cor || !retornoConeNumero) { setRetornoConeError(""); return; }
    const result = await validateConeNumber(retornoModal.categoria, retornoConeNumero, retornoModal.id);
    if (!result.free) {
      setRetornoConeError(`Cone ${retornoConeNumero} ${cor} já está em uso — NS ${result.conflito.serie}`);
    } else {
      setRetornoConeError("");
    }
  };

  const handleRetorno = async () => {
    if (!retornoModal || retornoConeError) return;
    setActing(retornoModal.id);
    try {
      const now = new Date().toISOString();
      const dias = retornoModal.data_saida
        ? Math.ceil((new Date(now) - new Date(retornoModal.data_saida)) / (1000 * 60 * 60 * 24))
        : 0;
      const cor = CATEGORIA_CONE_MAP[retornoModal.categoria];
      const coneNumero = cor ? retornoConeNumero : null;
      await base44.entities.Ciclo.update(retornoModal.id, {
        estado: "fechado",
        data_retorno: now,
        dias_alugada: dias,
        cone_cor: cor,
        cone_numero: coneNumero,
      });
      await base44.entities.EventoCiclo.create({
        ciclo_id: retornoModal.id,
        serie: retornoModal.serie,
        de_estado: "em_aluguer",
        para_estado: "fechado",
        autor,
        nota: `Retorno — ${dias} dias alugada`,
      });
      toast({ title: "✓ Retorno registado", description: `${retornoModal.serie} — ${dias} dias` });
      setRetornoModal(null);
      setRetornoConeNumero("");
      setRetornoConeError("");
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
      {/* SAÍDA RÁPIDA */}
      <div className="lg:col-span-2">
        <button
          onClick={() => setSaidaRapidaOpen(true)}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
        >
          <Zap className="w-5 h-5" />
          SAÍDA RÁPIDA
        </button>
      </div>

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
                  <div className="mb-2">
                    <h3 className="text-2xl font-black tracking-wider text-slate-100 break-all">{c.serie}</h3>
                    <p className="text-sm text-slate-400">{m?.modelo || "—"} {m?.ano && `· ${m.ano}`}</p>
                    {c.data_pronta && (
                      <p className="text-xs text-slate-500 mt-1">Pronta desde: {format(new Date(c.data_pronta), "dd/MM HH:mm")}</p>
                    )}
                  </div>
                  {c.reserva_cliente && (
                    <div className="mb-2 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-1 text-xs text-cyan-400">
                      RESERVADA · {c.reserva_cliente}
                      {c.reserva_data && ` · ${format(new Date(c.reserva_data), "dd/MM")}`}
                    </div>
                  )}
                  <button
                    onClick={() => openSaidaModal(c)}
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
                  <div className="mb-2">
                    <h3 className="text-2xl font-black tracking-wider text-slate-100 break-all">{c.serie}</h3>
                    <p className="text-sm text-slate-400">{m?.modelo || "—"} {m?.ano && `· ${m.ano}`}</p>
                    <p className="text-xs text-cyan-400 mt-1">
                      Saída: {c.data_saida ? format(new Date(c.data_saida), "dd/MM HH:mm") : "—"} · {dias} dias
                    </p>
                    {c.reserva_cliente && (
                      <p className="text-xs text-cyan-400/70 mt-0.5">Cliente: {c.reserva_cliente}</p>
                    )}
                  </div>
                  <button
                    onClick={() => openRetornoModal(c)}
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

      {/* Retorno modal */}
      <Dialog open={!!retornoModal} onOpenChange={() => setRetornoModal(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Registar Retorno — {retornoModal?.serie}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {retornoModal && CATEGORIA_CONE_MAP[retornoModal.categoria] && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">CONE:</span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-slate-200 text-sm font-bold uppercase">
                    <span className={`w-3 h-3 rounded-full ${CONE_COLORS.find((c) => c.value === CATEGORIA_CONE_MAP[retornoModal.categoria])?.bg}`} />
                    {CATEGORIA_CONE_MAP[retornoModal.categoria]}
                  </span>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs mb-1.5 block">Nº do cone (número físico)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={retornoConeNumero}
                    onChange={(e) => { setRetornoConeNumero(e.target.value); setRetornoConeError(""); }}
                    onBlur={validateRetornoCone}
                    placeholder="Nº do cone"
                    className={`bg-slate-900 border-slate-700 text-slate-100 ${retornoConeError ? "border-red-500" : ""}`}
                  />
                  {retornoConeError && (
                    <p className="text-xs text-red-400 mt-1">{retornoConeError}</p>
                  )}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500">A máquina fica fechada e o cone fica disponível para reutilização.</p>
          </div>
          <DialogFooter>
            <Button
              onClick={handleRetorno}
              disabled={acting === retornoModal?.id || !!retornoConeError}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              {acting === retornoModal?.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowLeft className="w-4 h-4 mr-1" />}
              Confirmar Retorno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saída rápida modal */}
      <SaidaRapidaModal
        open={saidaRapidaOpen}
        preselectedCiclo={null}
        currentUser={currentUser}
        onClose={() => setSaidaRapidaOpen(false)}
        onDone={loadData}
      />

      {/* Saída modal */}
      <Dialog open={!!saidaModal} onOpenChange={() => setSaidaModal(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Dar Saída — {saidaModal?.serie}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-slate-400 text-xs mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Cliente
              </Label>
              <Input
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente"
                className="bg-slate-900 border-slate-700 text-slate-100"
                autoFocus
              />
              {saidaModal?.reserva_cliente && (
                <p className="text-xs text-cyan-400/70 mt-1">Pré-preenchido da reserva</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleDarSaida}
              disabled={acting === saidaModal?.id}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {acting === saidaModal?.id ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ArrowRight className="w-4 h-4 mr-1" />}
              Confirmar Saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}