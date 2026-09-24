import { base44 } from "@/api/base44Client";
import { temCone } from "@/components/atlas/cicloUtils";

/**
 * Cone efetivo do ciclo: o que está no pátio, ou null/null quando o ciclo já
 * não ocupa cone (saiu, fechou, ou nunca teve). É o que se envia ao Watcher.
 */
export const coneDoCiclo = (ciclo) =>
  temCone(ciclo)
    ? { cone_cor: ciclo.cone_cor, cone_numero: ciclo.cone_numero }
    : { cone_cor: null, cone_numero: null };

/**
 * Se vale a pena chamar o Watcher para este ciclo: só quando já há O.S. aberta
 * (watcher_os_id). Sem isso o sync_cone no backend não faz nada — e não deve
 * fazer, porque não há onde atualizar o cone.
 */
export const deveSincronizarCiclo = (ciclo) => !!ciclo?.watcher_os_id;

/**
 * Envia o cone do ciclo ao Watcher, para a O.S. mostrar o mesmo cone do ATLAS.
 *
 * É fire-and-forget: não bloqueia a operação que o utilizador acabou de fazer,
 * não mostra toasts de erro. É uma sincronização de melhor-esforço com a O.S.
 * que já está aberta no Watcher — se falhar, o próximo sync ou a próxima
 * autorização repõe a verdade.
 */
export const sincronizarConeNoWatcher = (ciclo_id) => {
  if (!ciclo_id) return;
  try {
    base44.functions
      .invoke("atlasToWatcher", { action: "sync_cone", ciclo_id })
      .catch(() => {
        // silenciado — não é para travar a UI nem assustar o utilizador
      });
  } catch (_e) {
    // silenciado
  }
};