import React, { useState, useRef } from "react";
import { Camera, Loader2, X, Images } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { comprimirFoto } from "@/components/atlas/imageUtils";
import { exigirRede } from "@/components/atlas/rede";
import { fotosDe, juntarFotos, removerFoto, podeAdicionar, lugaresLivres, MAX_FOTOS } from "@/components/atlas/fotosMaquina";
import FotoModal from "@/components/atlas/FotoModal";

/**
 * As fotografias do estado da máquina, guardadas no cartão.
 *
 * Quem as tira é quem anda no pátio — a logística — e o administrador. Toda a
 * gente as vê: é para isso que existem, para não ser preciso ir lá fora saber
 * como está a máquina.
 */
export default function FotosMaquina({ maquina, podeGerir, onAtualizado }) {
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [aVer, setAVer] = useState(null);
  const inputRef = useRef(null);

  const fotos = fotosDe(maquina);
  if (!fotos.length && !podeGerir) return null;

  const escolher = async (e) => {
    const ficheiros = [...(e.target.files || [])];
    if (inputRef.current) inputRef.current.value = "";
    if (!ficheiros.length) return;

    setErro("");
    setAGravar(true);
    try {
      exigirRede("Guardar fotografias");
      // Só se sobem as que cabem: subir seis para descartar duas seria gastar
      // os dados de quem está no pátio com o telemóvel.
      const cabem = ficheiros.slice(0, lugaresLivres(maquina));
      const excedente = ficheiros.length - cabem.length;

      const urls = [];
      for (const ficheiro of cabem) {
        const comprimido = await comprimirFoto(ficheiro);
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file: comprimido });
        if (file_url) urls.push(file_url);
      }

      const { fotos: novas } = juntarFotos(maquina, urls);
      await base44.entities.Maquina.update(maquina.id, { fotos: novas });
      if (excedente > 0) setErro(`Só cabem ${MAX_FOTOS} fotografias — ${excedente} não ${excedente === 1 ? "foi guardada" : "foram guardadas"}.`);
      onAtualizado?.();
    } catch (err) {
      setErro(err?.message || "Não foi possível guardar as fotografias.");
    }
    setAGravar(false);
  };

  const apagar = async (url) => {
    setErro("");
    setAGravar(true);
    try {
      exigirRede("Apagar a fotografia");
      await base44.entities.Maquina.update(maquina.id, { fotos: removerFoto(maquina, url) });
      onAtualizado?.();
    } catch (err) {
      setErro(err?.message || "Não foi possível apagar a fotografia.");
    }
    setAGravar(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">Fotografias da máquina</h4>
        <span className="num text-[10px] text-slate-600">{fotos.length}/{MAX_FOTOS}</span>
        {podeGerir && podeAdicionar(maquina) && (
          <button
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
            <div key={url} className="relative group">
              <button
                onClick={(e) => { e.stopPropagation(); setAVer(url); }}
                className="block w-full aspect-square rounded overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors"
              >
                <img src={url} alt="Fotografia da máquina" loading="lazy" className="w-full h-full object-cover" />
              </button>
              {podeGerir && (
                <button
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

      {erro && <p className="text-[11px] text-red-400 mt-1.5">{erro}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={escolher}
        className="hidden"
      />
      <FotoModal open={!!aVer} url={aVer} titulo={`Máquina ${maquina?.serie || ""}`} onClose={() => setAVer(null)} />
    </div>
  );
}
