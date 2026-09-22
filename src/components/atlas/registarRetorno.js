import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONE_MAP } from "@/components/atlas/constants";
import { validateConeNumber } from "@/components/atlas/coneUtils";
import { exigirRede } from "@/components/atlas/rede";

/** Dias que a máquina esteve alugada, contados a partir da data de saída. */
export const diasAlugada = (ciclo, ate = new Date()) =>
  ciclo?.data_saida ? Math.ceil((new Date(ate) - new Date(ciclo.data_saida)) / (1000 * 60 * 60 * 24)) : 0;

/**
 * Retorno de uma máquina que estava alugada.
 *
 * O ciclo do aluguer FECHA — é história, com os dias contados — e abre-se um
 * ciclo novo com a máquina de volta ao pátio. Sem esse segundo passo a máquina
 * ficava só com um ciclo fechado e desaparecia do inventário: voltava
 * fisicamente mas não existia no sistema.
 *
 * O cone que se lhe atribui no retorno pertence ao ciclo novo, não ao que fecha.
 *
 * `reabrir: false` para quem já trata do ciclo novo por sua conta — é o caso da
 * reentrada pela página de Entrada, que recolhe categoria, cone e notas de raiz.
 */
export async function registarRetorno(ciclo, { coneNumero = "", autor, nota, reabrir = true, estadoRegresso = "classificada" } = {}) {
  exigirRede("Registar o retorno");
  const cor = CATEGORIA_CONE_MAP[ciclo.categoria] || null;

  if (reabrir && cor && coneNumero) {
    const result = await validateConeNumber(ciclo.categoria, coneNumero, ciclo.id);
    if (!result.free) {
      return { ok: false, erro: `Cone ${coneNumero} ${cor} já está em uso — NS ${result.conflito.serie}` };
    }
  }

  const now = new Date().toISOString();
  const dias = diasAlugada(ciclo, now);

  // 1. Fecha o aluguer. O cone sai daqui: vai com a máquina para o ciclo novo.
  await base44.entities.Ciclo.update(ciclo.id, {
    estado: "fechado",
    data_retorno: now,
    dias_alugada: dias,
    cone_cor: null,
    cone_numero: null,
  });
  await base44.entities.EventoCiclo.create({
    ciclo_id: ciclo.id,
    serie: ciclo.serie,
    de_estado: "em_aluguer",
    para_estado: "fechado",
    autor,
    nota: nota || `Retorno — ${dias} dias alugada`,
  });

  if (!reabrir) return { ok: true, dias, novoCicloId: null };

  // 2. A máquina está de volta ao pátio: precisa de um ciclo aberto para
  //    aparecer no inventário e poder voltar a ser preparada.
  const novo = await base44.entities.Ciclo.create({
    maquina_id: ciclo.maquina_id,
    serie: ciclo.serie,
    categoria: ciclo.categoria,
    cone_cor: cor,
    cone_numero: cor ? coneNumero : null,
    estado: estadoRegresso,
    data_entrada: now,
    data_classificacao: now,
    ...(estadoRegresso === "pronta" ? { data_pronta: now } : {}),
    prioridade: false,
  });
  await base44.entities.EventoCiclo.create({
    ciclo_id: novo.id,
    serie: ciclo.serie,
    de_estado: null,
    para_estado: estadoRegresso,
    autor,
    nota: `Regresso ao pátio após ${dias} dias de aluguer`,
  });

  return { ok: true, dias, novoCicloId: novo.id };
}
