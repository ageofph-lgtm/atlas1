import React, { useState } from "react";
import { History } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { exigirRede } from "@/components/atlas/rede";
import {
  fotosDe, fotosAnterioresDe, miniaturaDe, podarMiniaturas, descreverConjunto, camposDaSubstituicao,
} from "@/components/atlas/fotosMaquina";
import FotosMaquina from "@/components/atlas/FotosMaquina";
import FotoModal from "@/components/atlas/FotoModal";

/** Sobe um ficheiro para o armazenamento da aplicação. */
export const subirParaOArmazenamento = (file) =>
  base44.integrations.Core.UploadPublicFile({ file });

/**
 * As fotografias de uma máquina que já existe: grava na hora.
 *
 * Usado no cartão do inventário. No registo de entrada e na saída as fotos são
 * de um movimento e rodam (ver `rodarFotos`); aqui, no pátio, "tirar foto"
 * junta-se às atuais — é para a foto que faltou. Para um conjunto novo há o
 * "substituir": roda como num movimento, e as atuais ficam como anteriores.
 *
 * Por baixo, o conjunto anterior: só se descarrega quando alguém pede para o
 * ver, que é quando se quer comparar como a máquina saiu com como voltou.
 */
export default function FotosDaMaquina({ maquina, podeGerir, onAtualizado }) {
  const [verAnteriores, setVerAnteriores] = useState(false);
  const [aVer, setAVer] = useState(null);
  const anteriores = fotosAnterioresDe(maquina);
  const rotuloAnteriores = descreverConjunto(maquina?.fotos_anteriores_momento, maquina?.fotos_anteriores_data);

  const guardar = async (fotos, miniaturasNovas = {}) => {
    exigirRede("Guardar fotografias");
    await base44.entities.Maquina.update(maquina.id, {
      fotos,
      miniaturas: podarMiniaturas({ ...(maquina?.miniaturas || {}), ...miniaturasNovas }, [...fotos, ...anteriores]),
    });
    onAtualizado?.();
  };

  const substituir = async (novas, miniaturasNovas = {}) => {
    exigirRede("Substituir as fotografias");
    const campos = camposDaSubstituicao(maquina, novas, miniaturasNovas);
    if (Object.keys(campos).length) await base44.entities.Maquina.update(maquina.id, campos);
    onAtualizado?.();
  };

  return (
    <div>
      <FotosMaquina
        fotos={fotosDe(maquina)}
        miniaturas={maquina?.miniaturas || {}}
        rotulo={descreverConjunto(maquina?.fotos_momento, maquina?.fotos_data)}
        onGuardar={guardar}
        onSubstituir={substituir}
        podeGerir={podeGerir && !!maquina?.id}
        titulo={`Máquina ${maquina?.serie || ""}`}
        subirFicheiro={subirParaOArmazenamento}
      />

      {anteriores.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setVerAnteriores((v) => !v); }}
            aria-expanded={verAnteriores}
            className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-amber-400"
          >
            <History className="w-3.5 h-3.5" />
            {verAnteriores ? "Esconder as anteriores" : "Ver as anteriores"}
            {rotuloAnteriores && <span className="text-slate-500">({rotuloAnteriores})</span>}
          </button>

          {verAnteriores && (
            <div className="grid grid-cols-4 gap-1.5 mt-1.5">
              {anteriores.map((url) => (
                <button
                  key={url}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setAVer(url); }}
                  className="block w-full aspect-square rounded overflow-hidden border border-slate-700 hover:border-amber-500 opacity-90 transition-colors"
                >
                  <img src={miniaturaDe(maquina, url)} alt="Fotografia anterior da máquina" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <FotoModal
        open={!!aVer}
        url={aVer}
        titulo={`Máquina ${maquina?.serie || ""} — anteriores${rotuloAnteriores ? ` (${rotuloAnteriores})` : ""}`}
        onClose={() => setAVer(null)}
      />
    </div>
  );
}
