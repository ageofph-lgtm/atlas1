import React, { useState, useRef } from "react";
import { Camera, Loader2, X, Images, RefreshCw, History } from "lucide-react";
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
 *
 * Nos movimentos (`destaque`) o botão é grande. Medido a 07/10/2026: numa
 * reentrada, ninguém deu pelo "tirar foto" pequeno no fim das características,
 * e a máquina voltou com as fotos da saída. `atuais` mostra as fotos que o
 * cartão tem agora, que passam a anteriores quando se tirarem as novas — sem
 * isso não se percebia que tirar fotos as substituía.
 *
 * `onSubstituir` (só no cartão) tira um conjunto novo de uma vez: as atuais
 * passam a anteriores, sem as apagar uma a uma.
 */
export default function FotosMaquina({
  fotos = [], miniaturas = {}, onGuardar, onSubstituir, podeGerir = true, titulo = "", subirFicheiro,
  cabecalho = "Fotografias da máquina", rotulo = null, ajuda = null, destaque = false, atuais = null,
}) {
  const [aGravar, setAGravar] = useState(false);
  const [erro, setErro] = useState("");
  const [aVer, setAVer] = useState(null);
  const inputRef = useRef(null);
  // O mesmo seletor de ficheiros serve para juntar e para substituir.
  const modoRef = useRef("juntar");

  const fotosAtuais = (atuais?.fotos || []).filter((u) => !fotos.includes(u));
  if (!fotos.length && !podeGerir && !fotosAtuais.length) return null;

  const abrir = (modo) => (e) => {
    e.stopPropagation();
    modoRef.current = modo;
    inputRef.current?.click();
  };

  const escolher = async (e) => {
    const ficheiros = [...(e.target.files || [])];
    if (inputRef.current) inputRef.current.value = "";
    if (!ficheiros.length) return;
    const substituir = modoRef.current === "substituir";

    setErro("");
    setAGravar(true);
    try {
      const r = await subirFotos(ficheiros, {
        jaTem: substituir ? 0 : fotos.length,
        comprimir: comprimirFoto,
        miniatura: criarMiniatura,
        upload: subirFicheiro,
      });
      if (r.urls.length) {
        if (substituir) await onSubstituir(r.urls, r.miniaturas);
        else await onGuardar([...fotos, ...r.urls], r.miniaturas);
      }
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
  const podeSubstituir = podeGerir && !!onSubstituir && fotos.length > 0;

  return (
    <div>
      <div className="flex items-center gap-x-2 gap-y-0.5 mb-2 flex-wrap">
        <h4 className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">{cabecalho}</h4>
        <span className="num text-[10px] text-slate-600">{fotos.length}/{MAX_FOTOS}</span>
        {rotulo && <span className="text-[10px] text-slate-500">· {rotulo}</span>}
      </div>

      {/* No cartão, dois botões à vista: juntar a foto que faltou, ou trocar o
          conjunto todo. Como links pequenos no cabeçalho passavam despercebidos. */}
      {podeGerir && !destaque && (!cheio || podeSubstituir) && (
        <div className="flex gap-2 mb-2">
          {!cheio && (
            <button
              type="button"
              onClick={abrir("juntar")}
              disabled={aGravar}
              className="flex-1 py-1.5 rounded-md border border-amber-500/40 text-xs font-medium text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {aGravar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
              Tirar foto
            </button>
          )}
          {podeSubstituir && (
            <button
              type="button"
              onClick={abrir("substituir")}
              disabled={aGravar}
              title="Tirar fotos novas: as que lá estão ficam guardadas como anteriores"
              className="flex-1 py-1.5 rounded-md border border-amber-500/40 text-xs font-medium text-amber-300 hover:bg-amber-500/10 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {aGravar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Substituir fotos
            </button>
          )}
        </div>
      )}

      {destaque && podeGerir && !cheio && (
        <button
          type="button"
          onClick={abrir("juntar")}
          disabled={aGravar}
          className="w-full mb-2 py-3 rounded-lg border-2 border-dashed border-amber-500/60 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {aGravar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          {aGravar ? "A guardar…" : fotos.length ? `Tirar mais (cabem ${MAX_FOTOS - fotos.length})` : `Tirar fotos (até ${MAX_FOTOS})`}
        </button>
      )}

      {fotos.length === 0 ? (
        !destaque && (
          <p className="flex items-center gap-1.5 text-[11px] text-slate-600">
            <Images className="w-3.5 h-3.5" /> Ainda sem fotografias.
          </p>
        )
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

      {/* As que o cartão tem agora. Não se apagam: ao gravar com fotos novas
          passam a ser as anteriores, para comparar. */}
      {fotosAtuais.length > 0 && (
        <div className="mt-2 rounded-lg border border-slate-700/80 bg-slate-900/40 p-2">
          <p className="flex items-start gap-1.5 text-[11px] text-slate-400 mb-1.5">
            <History className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
            <span>
              {fotos.length
                ? "Estas saem do cartão e ficam guardadas como anteriores"
                : "No cartão estão estas — ao tirar as novas, passam a anteriores"}
              {atuais?.rotulo ? ` (${atuais.rotulo})` : ""}.
            </span>
          </p>
          <div className={`grid grid-cols-4 gap-1.5 ${fotos.length ? "opacity-50" : "opacity-80"}`}>
            {fotosAtuais.map((url) => (
              <button
                key={url}
                type="button"
                onClick={(e) => { e.stopPropagation(); setAVer(url); }}
                className="block w-full aspect-square rounded overflow-hidden border border-slate-700 hover:border-amber-500 transition-colors"
              >
                <img src={atuais?.miniaturas?.[url] || url} alt="Fotografia atual do cartão" loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
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
