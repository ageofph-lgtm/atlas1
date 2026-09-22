import {
  estadoEfetivo,
  ESTADOS_FORA_DO_PATIO,
  ESTADOS_AGUARDAM_AUTORIZACAO,
  ESTADOS_EM_PREPARACAO,
  isHistorico,
  isVenda,
  isAluguer,
} from "@/components/atlas/cicloUtils";

/**
 * Quantas máquinas estão mesmo nas instalações, agora.
 *
 * Até aqui não havia esta conta. O que se mostrava era "ciclos não fechados",
 * que **inclui as máquinas que saíram para aluguer** — elas continuam com o
 * ciclo aberto até voltarem. Quem via 312 estava a ver o parque inteiro, com
 * as alugadas lá dentro, e tinha de subtrair de cabeça.
 *
 * A diferença entre as três contas:
 *  - `noPatio` — está fisicamente cá. É o número que se conta a olho no pátio.
 *  - `fora`    — saiu e há-de voltar (aluguer ou a caminho do retorno).
 *  - `total`   — o parque sob gestão: as duas somadas.
 *
 * Uma venda não conta para nenhuma: o ciclo fecha e a máquina deixa de ser
 * nossa. Só o aluguer mantém o ciclo aberto.
 */
export function ocupacaoPatio(ciclos = []) {
  const abertos = ciclos.filter((c) => !isHistorico(c));

  const fora = abertos.filter((c) => ESTADOS_FORA_DO_PATIO.includes(estadoEfetivo(c)));
  const noPatio = abertos.filter((c) => !ESTADOS_FORA_DO_PATIO.includes(estadoEfetivo(c)));

  const prontas = noPatio.filter((c) => estadoEfetivo(c) === "pronta");
  const disponiveis = prontas.filter((c) => !c.reserva_cliente);
  const reservadas = prontas.filter((c) => !!c.reserva_cliente);
  const indefinidas = noPatio.filter((c) => estadoEfetivo(c) === "indefinido");

  // "Em preparação" é só o que está mesmo a ser preparado — com O.S. aberta no
  // Watcher. O que está classificado aguarda uma decisão da gestão e ainda não
  // entrou na oficina; contá-lo como preparação dizia que havia trabalho a
  // decorrer onde há trabalho à espera de começar.
  const emPreparacao = noPatio.filter((c) => ESTADOS_EM_PREPARACAO.includes(estadoEfetivo(c)));
  const aguardamAutorizacao = noPatio.filter((c) => ESTADOS_AGUARDAM_AUTORIZACAO.includes(estadoEfetivo(c)));

  return {
    noPatio: noPatio.length,
    fora: fora.length,
    total: noPatio.length + fora.length,
    prontas: prontas.length,
    disponiveis: disponiveis.length,
    reservadas: reservadas.length,
    aguardamAutorizacao: aguardamAutorizacao.length,
    emPreparacao: emPreparacao.length,
    indefinidas: indefinidas.length,
    listas: { noPatio, fora, disponiveis, aguardamAutorizacao, emPreparacao },
  };
}

/**
 * Quanto do parque está a render.
 *
 * Uma máquina parada no pátio é capital parado; uma alugada está a pagar-se.
 * Sem parque não há taxa — devolve null em vez de zero, para o ecrã poder
 * mostrar "—" em vez de fingir 0%.
 */
export function taxaUtilizacao({ fora, total }) {
  if (!total) return null;
  return Math.round((fora / total) * 1000) / 10;
}

/**
 * O que entrou menos o que saiu, no período.
 *
 * É a conta que faltava: com 312 e 8 saídas, dizer quanto é que o pátio
 * cresceu ou encolheu sem obrigar ninguém a subtrair de cabeça.
 */
export function balancoPeriodo(ciclos = [], desde) {
  const depoisDe = (d) => d && new Date(d) >= desde;
  const entradas = ciclos.filter((c) => depoisDe(c.data_entrada)).length;
  const saidasCiclos = ciclos.filter((c) => depoisDe(c.data_saida));
  return {
    entradas,
    saidas: saidasCiclos.length,
    vendidas: saidasCiclos.filter(isVenda).length,
    alugadas: saidasCiclos.filter(isAluguer).length,
    balanco: entradas - saidasCiclos.length,
  };
}

/** Dias que uma máquina já leva no estado em que está — sem data, null. */
export const diasDesde = (data, agora = Date.now()) =>
  data ? Math.floor((agora - new Date(data).getTime()) / 86400000) : null;

/**
 * Máquinas prontas há muito tempo e ainda cá.
 *
 * É capital parado com um número em cima: uma máquina preparada que ninguém
 * alugou há seis semanas custou o trabalho da preparação e não rendeu nada.
 */
export function paradasHaMuito(ciclos = [], { dias = 30, agora = Date.now() } = {}) {
  const { listas } = ocupacaoPatio(ciclos);
  return listas.noPatio
    .filter((c) => estadoEfetivo(c) === "pronta")
    .map((c) => ({ ciclo: c, dias: diasDesde(c.data_pronta, agora) }))
    .filter((x) => x.dias != null && x.dias >= dias)
    .sort((a, b) => b.dias - a.dias);
}
