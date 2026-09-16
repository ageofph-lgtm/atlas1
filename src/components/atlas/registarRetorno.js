import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";

/** Dias que a máquina esteve alugada, contados a partir da data de saída. */
export const diasAlugada = (ciclo, ate = new Date()) =>
  ciclo?.data_saida ? Math.ceil((new Date(ate) - new Date(ciclo.data_saida)) / (1000 * 60 * 60 * 24)) : 0;

/**
 * Fecha o ciclo no retorno da máquina ao pátio e devolve-lhe o cone.
 * Valida que o cone (cor + nº) está livre antes de gravar; se não estiver,
 * devolve { ok: false, erro } para o chamador mostrar junto ao campo.
 * Partilhado entre o retorno da página de saída e o retorno rápido.
 */
export async function registarRetorno(ciclo, { coneNumero = "", autor, nota } = {}) {
  const cor = CATEGORIA_CONE_MAP[ciclo.categoria] || null;

  if (cor && coneNumero) {
    const result = await validateConeNumber(ciclo.categoria, coneNumero, ciclo.id);
    if (!result.free) {
      return { ok: false, erro: `Cone ${coneNumero} ${cor} já está em uso — NS ${result.conflito.serie}` };
    }
  }

  const now = new Date().toISOString();
  const dias = diasAlugada(ciclo, now);

  await base44.entities.Ciclo.update(ciclo.id, {
    estado: "fechado",
    data_retorno: now,
    dias_alugada: dias,
    cone_cor: cor,
    cone_numero: cor ? coneNumero : null,
  });
  await base44.entities.EventoCiclo.create({
    ciclo_id: ciclo.id,
    serie: ciclo.serie,
    de_estado: "em_aluguer",
    para_estado: "fechado",
    autor,
    nota: nota || `Retorno — ${dias} dias alugada`,
  });

  return { ok: true, dias };
}
