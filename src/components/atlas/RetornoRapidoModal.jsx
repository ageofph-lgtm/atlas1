import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CATEGORIA_CONFIG, CATEGORIA_CONE_MAP, CONE_COLORS } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { registarRetorno, diasAlugada } from "@/components/atlas/registarRetorno";

/**
 * Espelho do SaidaRapidaModal para a ponta oposta do ciclo: fotografa a placa,
 * a IA lê a série, encontra a máquina em aluguer e fecha o ciclo com o cone
 * que lhe voltar a ser atribuído.
 */
export default function RetornoRapidoModal({ open, onClose, preselectedCiclo, currentUser, onDone }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [phase, setPhase] = useState("camera");
  const [processing, setProcessing] = useState(false);
  const [foundCiclo, setFoundCiclo] = useState(null);
  const [maquina, setMaquina] = useState(null);
  const [alugadasList, setAlugadasList] = useState([]);
  const [coneNumero, setConeNumero] = useState("");
  const [coneError, setConeError] = useState("");
  const [acting, setActing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setConeNumero("");
    setConeError("");
    if (preselectedCiclo) {
      setFoundCiclo(preselectedCiclo);
      setPhase("confirm");
      loadMaquina(preselectedCiclo);
    } else {
      setPhase("camera");
      setFoundCiclo(null);
      setMaquina(null);
    }
  }, [open, preselectedCiclo]);

  const loadMaquina = async (ciclo) => {
    if (!ciclo) return;
    try {
      if (ciclo.maquina_id) {
        setMaquina(await base44.entities.Maquina.get(ciclo.maquina_id));
      } else if (ciclo.serie) {
        const results = await base44.entities.Maquina.filter({ serie: ciclo.serie });
        setMaquina(results[0] || null);
      }
    } catch (_e) {
      // sem máquina ligada — o retorno continua a funcionar pela série
    }
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            serie: { type: "string", description: "O número de série da máquina" },
          },
        },
      });
      if (extractionResult.status === "success" && extractionResult.output?.serie) {
        const ns = extractionResult.output.serie.trim();
        const results = await base44.entities.Ciclo.filter({ serie: ns, estado: "em_aluguer" });
        if (results.length > 0) {
          setFoundCiclo(results[0]);
          loadMaquina(results[0]);
          setPhase("confirm");
        } else {
          setAlugadasList(await base44.entities.Ciclo.filter({ estado: "em_aluguer" }));
          setPhase("notfound");
        }
      } else {
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível ler a série da placa" });
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleManualPick = (ciclo) => {
    setFoundCiclo(ciclo);
    loadMaquina(ciclo);
    setConeNumero("");
    setConeError("");
    setPhase("confirm");
  };

  const cor = foundCiclo ? CATEGORIA_CONE_MAP[foundCiclo.categoria] : null;

  const validateCone = async () => {
    if (!foundCiclo || !cor || !coneNumero) { setConeError(""); return; }
    const result = await validateConeNumber(foundCiclo.categoria, coneNumero, foundCiclo.id);
    setConeError(result.free ? "" : `Cone ${coneNumero} ${cor} já está em uso — NS ${result.conflito.serie}`);
  };

  const handleConfirm = async () => {
    if (!foundCiclo) return;
    setActing(true);
    try {
      const res = await registarRetorno(foundCiclo, { coneNumero, autor, nota: null });
      if (!res.ok) {
        setConeError(res.erro);
        setActing(false);
        return;
      }
      toast({ title: "✓ Retorno registado", description: `${foundCiclo.serie} — ${res.dias} dias` });
      onDone?.();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setActing(false);
  };

  const catCfg = foundCiclo ? CATEGORIA_CONFIG[foundCiclo.categoria] : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <ArrowLeft className="w-5 h-5 text-cyan-400" />
            Retorno Rápido
          </DialogTitle>
        </DialogHeader>

        {phase === "camera" && (
          <div className="py-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="absolute opacity-0 pointer-events-none"
              style={{ left: "-9999px", top: "0", width: "1px", height: "1px" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className="w-full border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-cyan-500 hover:bg-cyan-500/5 transition-colors disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-10 h-10 mx-auto text-cyan-500 mb-3 animate-spin" />
                  <p className="text-slate-300 font-medium text-sm">A processar...</p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 mx-auto text-slate-500 mb-3" />
                  <p className="text-slate-300 font-medium text-sm">Fotografar placa de identificação</p>
                  <p className="text-xs text-slate-500 mt-1">IA lê a série e encontra a máquina em aluguer</p>
                </>
              )}
            </button>
          </div>
        )}

        {phase === "notfound" && (
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Máquina não encontrada ou não está em aluguer</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Ou selecione manualmente:</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {alugadasList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleManualPick(c)}
                    className="w-full text-left p-2.5 bg-slate-900 border border-slate-700 rounded-lg hover:border-cyan-500 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-200">{c.serie}</span>
                    {c.reserva_cliente && <span className="text-xs text-cyan-400 ml-2">· {c.reserva_cliente}</span>}
                  </button>
                ))}
                {alugadasList.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhuma máquina em aluguer</p>
                )}
              </div>
            </div>
            <button
              onClick={() => setPhase("camera")}
              className="w-full py-2.5 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Tentar novamente
            </button>
          </div>
        )}

        {phase === "confirm" && foundCiclo && (
          <div className="py-2 space-y-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <h3 className="num text-2xl font-black tracking-wider text-slate-100 break-all mb-1">{foundCiclo.serie}</h3>
              <p className="text-sm text-slate-400">{maquina?.modelo || "—"} {maquina?.ano && `· ${maquina.ano}`}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {catCfg && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
                    {catCfg.label}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  {diasAlugada(foundCiclo)} dias alugada
                </span>
              </div>
              {foundCiclo.reserva_cliente && (
                <p className="text-xs text-cyan-400/70 mt-2">Cliente: {foundCiclo.reserva_cliente}</p>
              )}
            </div>

            {cor && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-400">CONE:</span>
                  <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-slate-700/50 text-slate-200 text-sm font-bold uppercase">
                    <span className={`w-3 h-3 rounded-full ${CONE_COLORS.find((c) => c.value === cor)?.bg}`} />
                    {cor}
                  </span>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 mb-1.5 block">Nº do cone (número físico)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={coneNumero}
                    onChange={(e) => { setConeNumero(e.target.value); setConeError(""); }}
                    onBlur={validateCone}
                    placeholder="Nº do cone"
                    className={`w-full px-3 py-2.5 bg-slate-900 border rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none text-sm ${coneError ? "border-red-500" : "border-slate-700 focus:border-cyan-500"}`}
                  />
                  {coneError && <p className="text-xs text-red-400 mt-1">{coneError}</p>}
                </div>
              </div>
            )}

            <p className="text-xs text-slate-500">A máquina fica fechada e o cone fica disponível para reutilização.</p>

            <button
              onClick={handleConfirm}
              disabled={acting || !!coneError}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeft className="w-4 h-4" />}
              CONFIRMAR RETORNO
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
