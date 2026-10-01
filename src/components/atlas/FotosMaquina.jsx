import React, { useState, useRef } from "react";
import { Camera, Loader2, X, Images } from "lucide-react";
import { comprimirFoto, criarMiniatura } from "@/components/atlas/imageUtils";
import { subirFotos, avisoDeFotos, MAX_FOTOS } from "@/components/atlas/fotosMaquina";
import FotoModal from "@/components/atlas/FotoModal";

/**
 * As fotografias do estado da máquina.
 *
 * Trabalha sobre uma lista e um `onGuardar`, sem saber de onde vem nem para
 * onde vai. É o que lhe permite servir os três momentos em que se fotografa uma
 * máquina: no cartão (grava já na máquina), no registo de entrada (a máquina
 * ainda não existe, as fotos ficam à espera de ser criadas com ela) e na saída.
 *
 * Antes só existia no cartão, e para fotografar uma máquina era preciso ir ao
 * inventário procurá-la — mesmo tendo-a à frente no momento em que chega ou sai.
 *
 * Cada foto sobe com uma miniatura (~5 KB), e a grelha mostra a miniatura: a
 * foto inteira só se descarrega quando alguém a abre. `onGuardar` recebe as
 * fotos e as miniaturas novas (`{ urlDaFoto: urlDaMiniatura }`).
 */
export default function FotosMaquina({
  fotos = [], miniaturas = {}, onGuardar, podeGerir = true, titulo = "", subirFicheiro,
  cabecalho = "Fotografias da máquina", rotulo = null, ajuda = null,
}) {
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [aVer, setAVer] = useState(null);
  const inputRef = useRef(null);

  if (!fotos.length && !podeGerir) return null;

  const escolher = async (e) => {
    const ficheiros = [...(e.target.files || [])];
    if (inputRef.current) inputRef.current.value = "";
    if (!ficheiros.length) return;

    setErro("");
    setAGravar(true);
    try {
      const r = await subirFotos(ficheiros, {
        jaTem: fotos.length,
        comprimir: comprimirFoto,
        miniatura: criarMiniatura,
        upload: subirFicheiro,
      });
      if (r.urls.length) await onGuardar([...fotos, ...r.urls], r.miniaturas);
      setErro(avisoDeFotos(r) || "");
    } catch (err) {
      setErro(err?.message || "Não foi possível guardar as fotografias.");
    }
    setAGravar(false);
  };

  const apagar = async (url) => {
    setErro("");
    setAGravar(true);
    try {
      await onGuardar(fotos.filter((u) => u !== url), {});
    } catch (err) {
      setErro(err?.message || "Não foi possível apagar a fotografia.");
    }
    setAGravar(false);
  };

  const cheio = fotos.length >= MAX_FOTOS;

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">{cabecalho}</h4>
        <span className="num text-[10px] text-slate-600">{fotos.length}/{MAX_FOTOS}</span>
        {rotulo && <span className="text-[10px] text-slate-500">· {rotulo}</span>}
        {podeGerir && !cheio && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
            disabled={aGravar}
            className="ml-auto text-[10px] text-amber-400/80 hover:text-amber-400 flex items-center gap-1 disabled:opacity-50"
          >
            {aGravar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
            {aGravar ? "a guardar…" : "tirar foto"}
          </button>
        )}
      </div>

      {fotos.length === 0 ? (
        <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <Images className="w-3.5 h-3.5" /> Ainda sem fotografias.
        </p>
      ) : (
        <div className="grid grid-cols-4 gap-1.5">
          {fotos.map((url) => (
            <div key={url} className="relative">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setAVer(url); }}
                className="block w-full aspect-square rounded overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors"
              >
                <img src={miniaturas[url] || url} alt="Fotografia da máquina" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
              {podeGerir && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); apagar(url); }}
                  disabled={aGravar}
                  aria-label="Apagar esta fotografia"
                  title="Apagar esta fotografia"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border border-slate-600 text-slate-400 hover:text-red-400 hover:border-red-400 flex items-center justify-center disabled:opacity-50"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {ajuda && <p className="text-[10px] text-slate-500 mt-1.5">{ajuda}</p>}
      {erro && <p className="text-[11px] text-amber-400 mt-1.5">{erro}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={escolher}
        className="hidden"
      />
      <FotoModal open={!!aVer} url={aVer} titulo={titulo} onClose={() => setAVer(null)} />
    </div>
  );
}
