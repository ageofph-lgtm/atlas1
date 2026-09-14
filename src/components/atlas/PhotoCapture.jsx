import React, { useState, useRef } from "react";
import { Camera, Loader2, AlertCircle, Zap, RefreshCw, X, Check, ScanLine } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { prepareImage, cleanSerie, serieConfidence } from "./imageUtils";

const SCHEMA_A = {
  type: "object",
  properties: {
    serie: { type: "string", description: "O número de série da máquina. Apenas alfanuméricos maiúsculos, sem barras, espaços ou pontos." },
    modelo: { type: "string", description: "O modelo da máquina" },
    ano: { type: "string", description: "O ano de fabrico da máquina" },
  },
};
const SCHEMA_B = {
  type: "object",
  properties: {
    serie: { type: "string", description: "Imagem binarizada da placa. Lê o número de série. Apenas alfanuméricos maiúsculos, sem barras ou espaços." },
    modelo: { type: "string", description: "O modelo da máquina" },
    ano: { type: "string", description: "O ano de fabrico" },
  },
};

const extractPass = (file_url, json_schema) =>
  base44.integrations.Core.ExtractDataFromUploadedFile({ file_url, json_schema });

export default function PhotoCapture({ onSuccess }) {
  const [stage, setStage] = useState("select"); // select | scanning | review | error
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [scanStatus, setScanStatus] = useState("");
  const [error, setError] = useState(null);

  const [serie, setSerie] = useState("");
  const [modelo, setModelo] = useState("");
  const [ano, setAno] = useState("");
  const [fotoUrl, setFotoUrl] = useState("");
  const [confidence, setConfidence] = useState("none");

  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setStage("select");
    }
  };

  const onSerieChange = (e) => {
    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setSerie(v);
    setConfidence(serieConfidence(v));
  };

  const processImage = async () => {
    if (!selectedFile) return;
    setStage("scanning");
    setError(null);
    try {
      setScanStatus("A preparar imagem…");
      const [contrastFile, thresholdFile] = await Promise.all([
        prepareImage(selectedFile, "contrast"),
        prepareImage(selectedFile, "threshold"),
      ]);

      setScanStatus("A ler a placa (2 passadas)…");
      const [upA, upB] = await Promise.all([
        base44.integrations.Core.UploadPublicFile({ file: contrastFile }),
        base44.integrations.Core.UploadPublicFile({ file: thresholdFile }),
      ]);

      const [rA, rB] = await Promise.all([
        extractPass(upA.file_url, SCHEMA_A),
        extractPass(upB.file_url, SCHEMA_B),
      ]);

      setScanStatus("A validar resultado…");
      const candidates = [rA, rB]
        .filter((r) => r && r.status === "success" && r.output)
        .map((r) => ({
          serie: cleanSerie(r.output.serie),
          modelo: (r.output.modelo || "").trim(),
          ano: (r.output.ano || "").trim(),
          file_url: upA.file_url,
        }));

      const score = (c) => {
        const conf = serieConfidence(c.serie);
        return (conf === "high" ? 3 : conf === "medium" ? 2 : conf === "low" ? 1 : 0) + c.serie.length / 100;
      };
      candidates.sort((a, b) => score(b) - score(a));
      const best = candidates[0] || { serie: "", modelo: "", ano: "", file_url: upA.file_url };

      setSerie(best.serie);
      setModelo(best.modelo);
      setAno(best.ano);
      setFotoUrl(best.file_url);
      setConfidence(serieConfidence(best.serie));
      setStage("review");
    } catch (err) {
      let msg = "Não foi possível processar a imagem. Use a entrada manual.";
      if (err?.message?.includes("timeout") || err?.message?.includes("DatabaseTimeout")) {
        msg = "O processamento demorou muito. Tente com uma imagem menor ou use a entrada manual.";
      }
      setError(msg);
      setStage("error");
    }
  };

  const confirm = () => {
    onSuccess({ serie: serie.trim(), modelo: modelo.trim(), ano: ano.trim(), foto_url: fotoUrl });
    reset();
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setSerie(""); setModelo(""); setAno(""); setFotoUrl(""); setConfidence("none");
    setStage("select");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const confColor =
    confidence === "high" ? "text-green-400 border-green-500/40 bg-green-500/10"
    : confidence === "medium" ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : "text-red-400 border-red-500/40 bg-red-500/10";
  const confLabel =
    confidence === "high" ? "Padrão válido"
    : confidence === "medium" ? "Provável — verifique"
    : "Suspeito — corrija";

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute opacity-0 pointer-events-none"
        style={{ left: "-9999px", top: "0", width: "1px", height: "1px" }}
        capture="environment"
      />

      {stage === "select" && !selectedFile && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-amber-500 hover:bg-amber-500/5 transition-colors"
        >
          <Camera className="w-10 h-10 mx-auto text-slate-500 mb-3" />
          <p className="text-slate-300 font-medium text-sm">Fotografar placa de identificação</p>
          <p className="text-xs text-slate-500 mt-1">IA lê série, modelo e ano</p>
        </button>
      )}

      {selectedFile && stage === "select" && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-600">
            <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
            <button onClick={reset} className="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={processImage}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Zap className="w-5 h-5" /> Extrair dados
          </button>
        </div>
      )}

      {stage === "scanning" && (
        <div className="space-y-4 py-6 text-center">
          <div className="relative rounded-lg overflow-hidden border border-slate-600 mx-auto max-w-xs">
            <img src={previewUrl} alt="A analisar" className="w-full h-40 object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center">
              <ScanLine className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 text-amber-400 text-sm font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            {scanStatus}
          </div>
          <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: "65%" }} />
          </div>
        </div>
      )}

      {stage === "error" && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={processImage} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </button>
            <button onClick={reset} className="py-2.5 px-4 border border-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-700/50">
              Nova foto
            </button>
          </div>
        </div>
      )}

      {stage === "review" && (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-600">
            <img src={previewUrl} alt="Placa" className="w-full h-32 object-cover" />
            <button onClick={reset} className="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">Número de Série (NS) — confirme</label>
            <input
              type="text"
              value={serie}
              onChange={onSerieChange}
              onFocus={(e) => e.target.select()}
              className={`w-full px-3 py-3 bg-slate-900 border-2 rounded-lg text-slate-100 focus:outline-none text-lg font-mono tracking-wider ${
                confidence === "high" ? "border-green-500/50" : confidence === "medium" ? "border-amber-500/50" : "border-red-500/50"
              }`}
            />
            <p className={`text-xs mt-1.5 px-2 py-0.5 rounded border inline-block ${confColor}`}>{confLabel}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Modelo</label>
              <input type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 mb-1.5 block">Ano</label>
              <input type="text" value={ano} onChange={(e) => setAno(e.target.value)} className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 text-sm" />
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={processImage} className="px-4 py-3 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center gap-2">
              <RefreshCw className="w-4 h-4" /> Re-extrair
            </button>
            <button onClick={confirm} disabled={!serie.trim()} className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
              <Check className="w-5 h-5" /> Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}