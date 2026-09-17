import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, Loader2, AlertCircle, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { estadoEfetivo } from "@/components/atlas/cicloUtils";

/**
 * Encontra a máquina pela placa e entrega-a — não regista nada.
 *
 * Antes havia dois modais que fotografavam E gravavam por sua conta, em
 * paralelo com o fluxo do card. Divergiram: o card pedia tipo de saída e as
 * chapas da bateria e do carregador, o caminho rápido não. Agora a fotografia
 * é só uma forma de procurar; quem regista é sempre o mesmo modal do card.
 */
export default function LocalizarMaquinaModal({ open, onClose, onEncontrada, titulo, estadoAlvo, vazioTexto, Icone = Search, cor = "amber" }) {
  const { toast } = useToast();
  const [fase, setFase] = useState("camera"); // camera | lista
  const [processing, setProcessing] = useState(false);
  const [candidatas, setCandidatas] = useState([]);
  const [procura, setProcura] = useState("");
  const fileInputRef = useRef(null);

  // Nomes de classe completos: o Tailwind lê o código à procura deles, por isso
  // construí-los com template strings não gera nada.
  const T = cor === "cyan"
    ? { texto: "text-cyan-400", spin: "text-cyan-500", borda: "hover:border-cyan-500", fundo: "hover:bg-cyan-500/5" }
    : { texto: "text-amber-400", spin: "text-amber-500", borda: "hover:border-amber-500", fundo: "hover:bg-amber-500/5" };

  useEffect(() => {
    if (!open) return;
    setFase("camera");
    setProcura("");
    setCandidatas([]);
  }, [open]);

  const elegiveis = async () => {
    const lista = await base44.entities.Ciclo.filter({ estado: estadoAlvo });
    return lista.filter((c) => estadoEfetivo(c) === estadoAlvo);
  };

  const mostrarLista = async () => {
    try {
      setCandidatas(await elegiveis());
    } catch (_e) {
      setCandidatas([]);
    }
    setFase("lista");
  };

  const handlePhotoSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProcessing(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
      const res = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: { serie: { type: "string", description: "O número de série da máquina" } },
        },
      });
      if (res.status === "success" && res.output?.serie) {
        const ns = res.output.serie.trim();
        const achadas = (await elegiveis()).filter((c) => c.serie === ns);
        if (achadas.length > 0) {
          onEncontrada(achadas[0]);
          onClose();
        } else {
          setProcura(ns);
          await mostrarLista();
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

  const filtradas = candidatas.filter((c) =>
    !procura.trim() ? true : `${c.serie} ${c.reserva_cliente || ""}`.toLowerCase().includes(procura.trim().toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-slate-700 text-slate-100 max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-slate-100 flex items-center gap-2">
            <Icone className={`w-5 h-5 ${T.texto}`} />
            {titulo}
          </DialogTitle>
          <p className="text-xs text-slate-500">Encontre a máquina — o registo faz-se a seguir, no mesmo ecrã de sempre.</p>
        </DialogHeader>

        {fase === "camera" && (
          <div className="py-2 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="absolute opacity-0 pointer-events-none"
              style={{ left: "-9999px", top: 0, width: 1, height: 1 }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={processing}
              className={`w-full border-2 border-dashed border-slate-600 rounded-lg p-8 text-center ${T.borda} ${T.fundo} transition-colors disabled:opacity-50`}
            >
              {processing ? (
                <>
                  <Loader2 className={`w-10 h-10 mx-auto ${T.spin} mb-3 animate-spin`} />
                  <p className="text-slate-300 font-medium text-sm">A processar…</p>
                </>
              ) : (
                <>
                  <Camera className="w-10 h-10 mx-auto text-slate-500 mb-3" />
                  <p className="text-slate-300 font-medium text-sm">Fotografar placa de identificação</p>
                  <p className="text-xs text-slate-500 mt-1">A IA lê a série e encontra a máquina</p>
                </>
              )}
            </button>
            <button
              onClick={mostrarLista}
              className="w-full py-2.5 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" /> Procurar pela lista
            </button>
          </div>
        )}

        {fase === "lista" && (
          <div className="py-2 space-y-3">
            {procura && candidatas.length > 0 && filtradas.length === 0 && (
              <div className="flex items-start gap-2 text-amber-400 text-sm bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Li <span className="num font-bold">{procura}</span>, mas não é uma das máquinas elegíveis.</span>
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={procura}
                onChange={(e) => setProcura(e.target.value)}
                placeholder="Série ou cliente…"
                autoFocus
                className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none text-sm"
              />
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1.5">
              {filtradas.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onEncontrada(c); onClose(); }}
                  className={`w-full text-left p-2.5 bg-slate-900 border border-slate-700 rounded-lg ${T.borda} transition-colors`}
                >
                  <span className="num text-sm font-bold text-slate-200">{c.serie}</span>
                  {c.cone_numero && <span className="text-xs text-slate-500 ml-2">cone {c.cone_cor} {c.cone_numero}</span>}
                  {c.reserva_cliente && <span className="text-xs text-cyan-400 ml-2">· {c.reserva_cliente}</span>}
                </button>
              ))}
              {filtradas.length === 0 && <p className="text-sm text-slate-500 text-center py-4">{vazioTexto}</p>}
            </div>
            <button
              onClick={() => setFase("camera")}
              className="w-full py-2.5 border border-slate-700 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" /> Voltar à fotografia
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
