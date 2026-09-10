import React, { useState, useRef } from "react";
import { Camera, Loader2, AlertCircle, Zap, RefreshCw, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function PhotoCapture({ onSuccess }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setRetryCount(0);
    }
  };

  const processImage = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });

      const extractionResult = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: file_url,
        json_schema: {
          type: "object",
          properties: {
            "serie": { "type": "string", "description": "O número de série da máquina" },
            "modelo": { "type": "string", "description": "O modelo da máquina" },
            "ano": { "type": "string", "description": "O ano de fabrico da máquina" }
          }
        },
      });

      if (extractionResult.status === 'success' && extractionResult.output) {
        onSuccess({ ...extractionResult.output, foto_url: file_url });
      } else {
        throw new Error(extractionResult.details || "A extração falhou.");
      }
    } catch (err) {
      let msg = "Não foi possível processar a imagem. Use a entrada manual.";
      if (err.message?.includes('timeout') || err.message?.includes('DatabaseTimeout')) {
        msg = "O processamento demorou muito. Tente com uma imagem menor ou use a entrada manual.";
      }
      setError(msg);
    }

    setIsProcessing(false);
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      processImage();
    } else {
      setError("O processamento falhou várias vezes. Use a entrada manual.");
    }
  };

  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setRetryCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="absolute opacity-0 pointer-events-none"
        style={{ left: '-9999px', top: '0', width: '1px', height: '1px' }}
        capture="environment"
      />

      {!selectedFile ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-amber-500 hover:bg-amber-500/5 transition-colors"
        >
          <Camera className="w-10 h-10 mx-auto text-slate-500 mb-3" />
          <p className="text-slate-300 font-medium text-sm">Fotografar placa de identificação</p>
          <p className="text-xs text-slate-500 mt-1">IA lê série, modelo e ano</p>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-600">
            <img src={previewUrl} alt="Preview" className="w-full h-40 object-cover" />
            {!isProcessing && (
              <button
                onClick={reset}
                className="absolute top-2 right-2 bg-slate-900/80 p-1.5 rounded-full text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {error ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {retryCount < 3 && (
                <button
                  onClick={handleRetry}
                  className="w-full py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> Tentar novamente
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={processImage}
              disabled={isProcessing}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  A processar...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Extrair dados
                </>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}