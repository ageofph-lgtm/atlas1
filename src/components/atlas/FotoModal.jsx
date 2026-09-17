import React from "react";
import { X, ExternalLink } from "lucide-react";

/**
 * Abre uma foto guardada em tamanho grande. As fotos das chapas ficam no card
 * como um link discreto — só ocupam o ecrã quando alguém as quer mesmo ver.
 */
export default function FotoModal({ open, onClose, url, titulo }) {
  if (!open || !url) return null;
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      role="dialog"
      aria-label={titulo || "Foto"}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80" />
      <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-bold text-slate-100">{titulo}</span>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <ExternalLink className="w-3 h-3" /> abrir original
          </a>
          <button onClick={onClose} aria-label="Fechar" className="ml-auto p-2 text-slate-300 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <img src={url} alt={titulo || ""} className="w-full max-h-[80vh] object-contain rounded-lg border border-slate-700 bg-slate-900" />
      </div>
    </div>
  );
}
