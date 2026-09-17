import React, { useState, useRef } from "react";
import { Camera, Loader2, Check, X, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { prepareImage, cleanSerie } from "./imageUtils";

/**
 * Leitor genérico de chapa de características: fotografa, a IA lê o número de
 * série e guarda a foto. Mesmo esquema de duas passadas do registo de máquinas
 * (contraste + binarização), aqui numa caixa pequena para caber ao lado de
 * outra — a saída regista bateria e carregador lado a lado.
 *
 * O NS fica sempre editável: a leitura acerta quase sempre, mas quem está no
 * pátio tem de poder corrigir sem ficar preso.
 */
export default function PlacaScanner({ titulo, valor, fotoUrl, onChange, disabled = false }) {
  const [estado, setEstado] = useState("idle"); // idle | a-ler
  const [erro, setErro] = useState("");
  const inputRef = useRef(null);

  const ler = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setEstado("a-ler");
    setErro("");
    try {
      const [contraste, binaria] = await Promise.all([
        prepareImage(file, "contrast"),
        prepareImage(file, "threshold"),
      ]);
      const [upA, upB] = await Promise.all([
        base44.integrations.Core.UploadPublicFile({ file: contraste }),
        base44.integrations.Core.UploadPublicFile({ file: binaria }),
      ]);
      const schema = {
        type: "object",
        properties: {
          serie: {
            type: "string",
            description: `Número de série do ${titulo.toLowerCase()} na chapa de características. Apenas alfanuméricos maiúsculos, sem espaços nem barras.`,
          },
        },
      };
      const [rA, rB] = await Promise.all([
        base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: upA.file_url, json_schema: schema }),
        base44.integrations.Core.ExtractDataFromUploadedFile({ file_url: upB.file_url, json_schema: schema }),
      ]);
      // Fica a leitura mais longa das duas: a que ficou truncada é a pior.
      const lidos = [rA, rB]
        .filter((r) => r?.status === "success" && r.output?.serie)
        .map((r) => cleanSerie(r.output.serie))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length);

      onChange({ ns: lidos[0] || valor || "", foto_url: upA.file_url });
      if (lidos.length === 0) setErro("Não deu para ler o número — escreva-o à mão.");
    } catch (_e) {
      setErro("Falhou a leitura. Tente outra vez ou escreva o número.");
    }
    setEstado("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const aLer = estado === "a-ler";

  return (
    <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-2.5 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-slate-300">{titulo}</span>
        {fotoUrl && (
          <span className="text-[10px] text-green-400 flex items-center gap-1">
            <Check className="w-3 h-3" /> foto
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={ler}
        className="absolute opacity-0 pointer-events-none"
        style={{ left: "-9999px", top: 0, width: 1, height: 1 }}
      />

      <div className="flex gap-2">
        {fotoUrl ? (
          <img src={fotoUrl} alt="" className="w-12 h-12 rounded border border-slate-600 object-cover flex-shrink-0" />
        ) : null}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={aLer || disabled}
          className="flex-1 border-2 border-dashed border-slate-600 rounded-lg py-2 px-2 text-center hover:border-amber-500 hover:bg-amber-500/5 transition-colors disabled:opacity-50"
        >
          {aLer ? (
            <span className="text-xs text-slate-300 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> A ler…
            </span>
          ) : (
            <span className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
              {fotoUrl ? <RefreshCw className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {fotoUrl ? "Repetir foto" : "Fotografar chapa"}
            </span>
          )}
        </button>
      </div>

      <input
        type="text"
        value={valor || ""}
        onChange={(e) => onChange({ ns: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""), foto_url: fotoUrl })}
        placeholder="Nº de série"
        disabled={disabled}
        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 placeholder-slate-600 focus:border-amber-500 focus:outline-none text-xs num tracking-wider"
      />

      {erro && <p className="text-[10px] text-amber-400">{erro}</p>}
      {(valor || fotoUrl) && !disabled && (
        <button
          type="button"
          onClick={() => onChange({ ns: "", foto_url: "" })}
          className="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
        >
          <X className="w-3 h-3" /> limpar
        </button>
      )}
    </div>
  );
}
