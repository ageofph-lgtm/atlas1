import React from "react";
import { base44 } from "@/api/base44Client";
import { exigirRede } from "@/components/atlas/rede";
import { fotosDe } from "@/components/atlas/fotosMaquina";
import FotosMaquina from "@/components/atlas/FotosMaquina";

/** Sobe um ficheiro para o armazenamento da aplicação. */
export const subirParaOArmazenamento = (file) =>
  base44.integrations.Core.UploadPublicFile({ file });

/**
 * As fotografias de uma máquina que já existe: grava na hora.
 *
 * Usado no cartão do inventário e na saída. No registo de entrada a máquina
 * ainda não tem id, por isso lá usa-se o `FotosMaquina` diretamente, com as
 * fotos em memória até a máquina ser criada.
 */
export default function FotosDaMaquina({ maquina, podeGerir, onAtualizado }) {
  const guardar = async (fotos) => {
    exigirRede("Guardar fotografias");
    await base44.entities.Maquina.update(maquina.id, { fotos });
    onAtualizado?.();
  };

  return (
    <FotosMaquina
      fotos={fotosDe(maquina)}
      onGuardar={guardar}
      podeGerir={podeGerir && !!maquina?.id}
      titulo={`Máquina ${maquina?.serie || ""}`}
      subirFicheiro={subirParaOArmazenamento}
    />
  );
}
