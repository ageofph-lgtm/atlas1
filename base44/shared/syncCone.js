/**
 * Sincronização do cone do ciclo com a O.S. no Watcher.
 *
 * A regra do cone é a mesma do frontend (`temCone` em cicloUtils.js), mas o
 * backend não pode importar de `src/` — por isso a regra está replicada aqui.
 * Só chegam a esta função ciclos com `watcher_os_id` (ou seja, já autorizados e
 * com O.S. aberta no Watcher), e esses são sempre str/uts/recon: para essas
 * categorias o `estadoEfetivo` é o próprio `estado`, pelo que a replicação é
 * exata.
 */

// Cores de cone válidas (espelha CONE_COLORS em src/components/atlas/constants.jsx).
const CONE_COLORS_VALUES = ["vermelho", "azul", "verde", "amarelo", "branco", "preto"];

// Estados em que a máquina está fora do pátio mas o ciclo continua aberto.
const ESTADOS_FORA_DO_PATIO = ["em_aluguer", "retorno"];

/** Um ciclo fechado é histórico — já não ocupa cone. */
const isHistorico = (ciclo) => ciclo?.estado === "fechado";

/** Se este ciclo ainda ocupa o cone que lhe foi dado. */
const cicloOcupaCone = (ciclo) =>
  !isHistorico(ciclo) && !ESTADOS_FORA_DO_PATIO.includes(ciclo?.estado);

/** Se há cone para mostrar: ocupa um, tem cor conhecida e tem número. */
const temCone = (ciclo) =>
  cicloOcupaCone(ciclo) &&
  CONE_COLORS_VALUES.includes(ciclo?.cone_cor) &&
  !!ciclo?.cone_numero;

/**
 * Cone efetivo do ciclo: o que está no pátio, ou null/null quando o ciclo já
 * não ocupa cone (saiu, fechou, ou nunca teve).
 */
export const coneDoCiclo = (ciclo) =>
  temCone(ciclo)
    ? { cone_cor: ciclo.cone_cor, cone_numero: ciclo.cone_numero }
    : { cone_cor: null, cone_numero: null };

/**
 * Envia ao Watcher o cone atual do ciclo, para a O.S. mostrar o mesmo cone.
 *
 * Só age se o ciclo já tiver `watcher_os_id` (O.S. aberta no Watcher); caso
 * contrário devolve `skipped: 'sem_os'` sem chamar o Watcher. Aceita null nos
 * dois campos do cone para o libertar (saída, retorno, fecho).
 *
 * Um 404 do Watcher significa que a O.S. já não existe lá — não é erro, devolve
 * `skipped: 'os_nao_encontrada'`.
 */
export async function executarSyncCone({ ciclo_id, base44, watcherUrl, bridgeSecret, fetchImpl = fetch }) {
  if (!ciclo_id) return { ok: false, error: "ciclo_id obrigatório" };

  const ciclo = await base44.asServiceRole.entities.Ciclo.get(ciclo_id);
  if (!ciclo) return { ok: false, error: "Ciclo não encontrado" };

  if (!ciclo.watcher_os_id) return { ok: true, skipped: "sem_os" };

  const cone = coneDoCiclo(ciclo);

  const resp = await fetchImpl(watcherUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-atlas-secret": bridgeSecret,
    },
    body: JSON.stringify({
      action: "update_cone",
      data: {
        atlas_ciclo_id: ciclo.id,
        serie: ciclo.serie,
        cone_cor: cone.cone_cor,
        cone_numero: cone.cone_numero,
      },
    }),
  });

  if (resp.status === 404) return { ok: true, skipped: "os_nao_encontrada" };

  const watcher = await resp.json();
  return { ok: true, watcher };
}