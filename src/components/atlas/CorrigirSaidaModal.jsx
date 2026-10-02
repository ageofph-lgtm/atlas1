import React, { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { planearCorrecao, aplicarCorrecao, tipoDaSaida, NOME_TIPO_SAIDA } from "@/components/atlas/corrigirSaida";

const ROTULO = { alugada: "ALUGUER", vendida: "VENDA" };
const COR = { alugada: "bg-cyan-500/15 text-cyan-300", vendida: "bg-purple-500/15 text-purple-300" };

/**
 * Passar uma saída de aluguer a venda, ou ao contrário — só para o administrador.
 *
 * Diz antes de gravar tudo o que muda, porque uma correção destas pode apagar
 * o ciclo que um retorno abriu no pátio (ver `corrigirSaida.js`).
 */
export default function CorrigirSaidaModal({ ciclo, ciclos = [], autor, onClose, onCorrigida }) {
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");

  const de = ciclo ? tipoDaSaida(ciclo) : null;
  const para = de === "vendida" ? "alugada" : "vendida";
  const plano = useMemo(() => {
    if (!ciclo) return null;
    const daSerie = ciclos.filter((c) => (ciclo.maquina_id && c.maquina_id === ciclo.maquina_id) || c.serie === ciclo.serie);
    return planearCorrecao(ciclo, daSerie, para);
  }, [ciclo, ciclos, para]);

  const fechar = () => {
    if (aGravar) return;
    setErro("");
    onClose();
  };

  const confirmar = async () => {
    setAGravar(true);
    setErro("");
    try {
      await aplicarCorrecao(ciclo, plano, { autor });
      onCorrigida?.(plano);
      onClose();
    } catch (e) {
      setErro(`${e.message} Verifique o histórico antes de repetir.`);
    }
    setAGravar(false);
  };

  return (
    <Dialog open={!!ciclo} onOpenChange={fechar}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Corrigir saída — {ciclo?.serie}</DialogTitle>
        </DialogHeader>

        {ciclo && (
          <div className="space-y-4 py-1">
            <p className="text-xs text-slate-400">
              Saída de {ciclo.data_saida ? format(new Date(ciclo.data_saida), "dd/MM/yyyy HH:mm") : "—"}
              {ciclo.reserva_cliente ? ` · ${ciclo.reserva_cliente}` : ""}
            </p>

            <div className="flex items-center justify-center gap-3">
              <span className={`px-2.5 py-1 rounded text-sm font-bold ${COR[de]}`}>{ROTULO[de]}</span>
              <ArrowRight className="w-4 h-4 text-slate-500" />
              <span className={`px-2.5 py-1 rounded text-sm font-bold ${COR[para]}`}>{ROTULO[para]}</span>
            </div>

            {plano?.ok ? (
              <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-3">
                <p className="text-xs font-medium text-slate-300 mb-1.5">Ao confirmar:</p>
                <ul className="space-y-1 text-xs text-slate-400 list-disc pl-4">
                  {plano.explicacao.map((linha) => <li key={linha}>{linha}</li>)}
                  <li>Fica na história da máquina: “{plano.nota}”.</li>
                </ul>
              </div>
            ) : (
              <div className="flex items-start gap-2 text-amber-300 text-xs bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{plano?.motivo}</span>
              </div>
            )}

            {erro && <p className="text-xs text-red-400">{erro}</p>}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={fechar} disabled={aGravar} className="text-slate-400">
            Cancelar
          </Button>
          <Button
            onClick={confirmar}
            disabled={!plano?.ok || aGravar}
            className={para === "vendida" ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-cyan-600 hover:bg-cyan-700 text-white"}
          >
            {aGravar && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
            Passar a {NOME_TIPO_SAIDA[para]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
