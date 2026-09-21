import { base44 } from "@/api/base44Client";
import { estadoEfetivo, isCategoriaSemEstado } from "@/components/atlas/cicloUtils";
import { notificarPronta } from "@/components/atlas/mensagens";
import { exigirRede } from "@/components/atlas/rede";

/**
 * As operações que se fazem a uma máquina, numa implementação só.
 *
 * Existiam dentro do `Autorizacao.jsx` e em mais lado nenhum. Ao chegar as
 * ações em massa, mantê-las lá dentro obrigaria a escrever uma segunda versão
 * de cada uma — e seria a terceira vez neste projeto que duas implementações da
 * mesma coisa divergem. Agora o card individual e o lote chamam isto.
 */

/** Estados em que o backend aceita criar a O.S. (ver `atlasToWatcher`). */
export const podeAutorizar = (ciclo) => {
  const estado = estadoEfetivo(ciclo);
  return estado === "classificada" || estado === "manutencao";
};

/**
 * Marcar pronta só faz sentido dentro do fluxo de preparação: sucata e
 * indefinida não o seguem, e o que já está pronto não se marca outra vez.
 */
export const podeMarcarPronta = (ciclo) =>
  !isCategoriaSemEstado(ciclo?.categoria) && estadoEfetivo(ciclo) !== "pronta";

/** Liga ou desliga a prioridade. Devolve o ciclo como ficou. */
export async function definirPrioridade(ciclo, valor) {
  exigirRede("Alterar a prioridade");
  await base44.entities.Ciclo.update(ciclo.id, { prioridade: valor });
  return { ...ciclo, prioridade: valor };
}

/**
 * Marca a máquina como pronta sem passar pelo Watcher.
 *
 * Grava o estado, deixa rasto no histórico e avisa quem estava à espera dela —
 * a logística, a gestão e os comerciais com reserva ou pedido nesta máquina.
 */
export async function marcarPronta(ciclo, { autor }) {
  exigirRede("Marcar como pronta");
  const now = new Date().toISOString();
  await base44.entities.Ciclo.update(ciclo.id, { estado: "pronta", data_pronta: now });
  await base44.entities.EventoCiclo.create({
    ciclo_id: ciclo.id,
    serie: ciclo.serie,
    de_estado: ciclo.estado,
    para_estado: "pronta",
    autor,
    nota: "Marcada como pronta (sem O.S. no Watcher)",
  });
  await notificarPronta(ciclo, { autor });
  return { ...ciclo, estado: "pronta", data_pronta: now };
}
