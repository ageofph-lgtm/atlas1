import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2, AlertCircle, Check, Truck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CATEGORIA_CONFIG, CONE_COLORS } from "@/components/atlas/constants";

export default function SaidaRapidaModal({ open, onClose, preselectedCiclo, currentUser, onDone }) {
  const { toast } = useToast();
  const autor = currentUser?.full_name || currentUser?.perfil || "system";

  const [phase, setPhase] = useState("camera");
  const [processing, setProcessing] = useState(false);
  const [foundCiclo, setFoundCiclo] = useState(null);
  const [maquina, setMaquina] = useState(null);
  const [fotoSaida, setFotoSaida] = useState(null);
  const [acting, setActing] = useState(false);
  const [prontasList, setProntasList] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (open) {
      if (preselectedCiclo) {
        setFoundCiclo(preselectedCiclo);
        setFotoSaida(null);
        setPhase("confirm");
        loadMaquina(preselectedCiclo);
      } else {
        setPhase("camera");
        setFoundCiclo(null);
        setFotoSaida(null);
        setMaquina(null);
      }
    }
  }, [open, preselectedCiclo]);

  const loadMaquina = async (ciclo) => {
    if (!ciclo) return;
    try {
      if (ciclo.maquina_id) {
        const m = await base44.entities.Maquina.get(ciclo.maquina_id);
        setMaquina(m);
      } else if (ciclo.serie) {
        const results = await base44.entities.Maquina.filter({ serie: ciclo.serie });
        setMaquina(results[0] || null);
      }
    } catch (_e) {}
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      setFotoSaida(file_url);
      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            serie: { type: "string", description: "O número de série da máquina" },
          },
        },
      });
      if (extractionResult.status === "success" && extractionResult.output?.serie) {
        const ns = extractionResult.output.serie.trim();
        const results = await base44.entities.Ciclo.filter({ serie: ns, estado: "pronta" });
        if (results.length > 0) {
          setFoundCiclo(results[0]);
          loadMaquina(results[0]);
          setPhase("confirm");
        } else {
          const allProntas = await base44.entities.Ciclo.filter({ estado: "pronta" });
          setProntasList(allProntas);
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

  const handleConfirm = async (tipoSaida) => {
    if (!foundCiclo) return;
    setActing(true);
    try {
      const now = new Date().toISOString();
      const updateData = {
        data_saida: now,
        tipo_saida: tipoSaida,
        foto_saida: fotoSaida || null,
      };
      let nota;
      if (tipoSaida === "alugada") {
        updateData.estado = "em_aluguer";
        nota = `Saída rápida — alugada${foundCiclo.reserva_cliente ? " para " + foundCiclo.reserva_cliente : ""}`;
      } else {
        updateData.estado = "fechado";
        nota = "Saída rápida — vendida";
      }
      await base44.entities.Ciclo.update(foundCiclo.id, updateData);
      await base44.entities.EventoCiclo.create({
        ciclo_id: foundCiclo.id,
        serie: foundCiclo.serie,
        de_estado: "pronta",
        para_estado: tipoSaida === "alugada" ? "em_aluguer" : "fechado",
        autor,
        nota,
      });
      toast({ title: "✓ Saída registada", description: `${foundCiclo.serie} — ${tipoSaida === "alugada" ? "Alugada" : "Vendida"}` });
      onDone?.();
      onClose();
    } catch (err) {
      toast({ variant: "destructive", title: "Erro", description: err.message });
    }
    setActing(false);
  };

  const handleManualPick = (ciclo) => {
    setFoundCiclo(ciclo);
    loadMaquina(ciclo);
    setPhase("confirm");
  };

  const catCfg = foundCiclo ? CATEGORIA_CONFIG[foundCiclo.categoria] : null;
  const coneColor = foundCiclo ? CONE_COLORS.find((c) => c.value === foundCiclo.cone_cor) : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            Saída Rápida
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
              className="w-full border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-amber-500 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
            >
              {processing ? (
                <>
                  <Loader2 className="w-10 h-10 mx-auto text-amber-500 mb-3 animate-spin" />
                  <p className="text-slate-300 font-medium text-sm">A processar...</p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 mx-auto text-slate-500 mb-3" />
                  <p className="text-slate-300 font-medium text-sm">Fotografar placa de identificação</p>
                  <p className="text-xs text-slate-500 mt-1">IA lê a série e encontra a máquina</p>
                </>
              )}
            </button>
          </div>
        )}

        {phase === "notfound" && (
          <div className="py-2 space-y-3">
            <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Máquina não encontrada ou não está pronta</span>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-2">Ou selecione manualmente:</p>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {prontasList.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleManualPick(c)}
                    className="w-full text-left p-2.5 bg-slate-900 border border-slate-700 rounded-lg hover:border-amber-500 transition-colors"
                  >
                    <span className="text-sm font-bold text-slate-200">{c.serie}</span>
                    {c.reserva_cliente && (
                      <span className="text-xs text-cyan-400 ml-2">· {c.reserva_cliente}</span>
                    )}
                  </button>
                ))}
                {prontasList.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">Nenhuma máquina pronta</p>
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
              <h3 className="text-2xl font-black tracking-wider text-slate-100 break-all mb-1">{foundCiclo.serie}</h3>
              <p className="text-sm text-slate-400">{maquina?.modelo || "—"} {maquina?.ano && `· ${maquina.ano}`}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {catCfg && (
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${catCfg.bg} ${catCfg.text} ${catCfg.border} border`}>
                    {catCfg.label}
                  </span>
                )}
                {coneColor && foundCiclo.cone_numero && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-slate-700/50 text-slate-300">
                    <span className={`w-2.5 h-2.5 rounded-full ${coneColor.bg}`} />
                    {foundCiclo.cone_numero}
                  </span>
                )}
              </div>
              {foundCiclo.reserva_cliente && (
                <div className="mt-2 bg-cyan-500/10 border border-cyan-500/30 rounded px-2 py-1 text-xs text-cyan-400">
                  RESERVADA · {foundCiclo.reserva_cliente}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-slate-300 mb-2">Tipo de saída</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleConfirm("alugada")}
                  disabled={acting}
                  className="py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  ALUGADA
                </button>
                <button
                  onClick={() => handleConfirm("vendida")}
                  disabled={acting}
                  className="py-3 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {acting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  VENDIDA
                </button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}