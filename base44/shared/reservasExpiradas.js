/**
 * Regras da reserva de uma máquina: quando é que ela ainda vale e quando é que
 * expira por não ter sido usada.
 *
 * Vive em `base44/shared` porque o frontend e a função `expirarReservas`
 * precisam exatamente da mesma conta — e o backend não pode importar de `src/`.
 * O prazo é contado desde `reserva_criada_em`, não desde a data prevista de
 * saída: o que se mede é há quanto tempo a máquina está prometida a alguém.
 */

const DIA_MS = 24 * 60 * 60 * 1000;

/** Três semanas. É o prazo combinado para uma reserva ser usada. */
export const PRAZO_RESERVA_DIAS = 21;

const isHistorico = (ciclo) => ciclo?.estado === "fechado";

const dataValida = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Tem reserva de pé: há cliente e o ciclo não fechou.
 *
 * Uma máquina que já saiu (tem `data_saida`) conta como reserva usada — é o que
 * a saída significa. Por isso `reservaAtiva` e o motor de expiração usam a mesma
 * condição: o que aparece na aba RESERVADAS é exatamente o que pode expirar.
 */
export const reservaAtiva = (ciclo) => !!ciclo?.reserva_cliente && !isHistorico(ciclo) && !ciclo?.data_saida;

/** Quando a reserva foi feita. Nulo nos registos antigos, anteriores a este campo. */
export const reservaCriadaEm = (ciclo) => dataValida(ciclo?.reserva_criada_em);

/** Dias inteiros desde que a reserva foi feita. Nulo quando não há relógio. */
export function diasDeReserva(ciclo, agora = new Date()) {
  const inicio = reservaCriadaEm(ciclo);
  if (!inicio) return null;
  return Math.max(0, Math.floor((agora.getTime() - inicio.getTime()) / DIA_MS));
}

/** Dias que faltam para o prazo acabar. Negativo = já passou. Nulo sem relógio. */
export function diasParaExpirar(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  if (dias === null) return null;
  return PRAZO_RESERVA_DIAS - dias;
}

/** A reserva passou o prazo sem a máquina ter saído. */
export function reservaExpirada(ciclo, agora = new Date()) {
  if (!reservaAtiva(ciclo)) return false;
  return diasDeReserva(ciclo, agora) >= PRAZO_RESERVA_DIAS;
}

/**
 * O que mostrar no cartão, em três palavras: o prazo a acabar, o prazo acabado,
 * ou nada quando não há relógio ou ainda falta muito.
 */
export function avisoDoPrazo(ciclo, agora = new Date()) {
  if (!reservaAtiva(ciclo)) return null;
  const faltam = diasParaExpirar(ciclo, agora);
  if (faltam === null) return null;
  if (faltam < 0) return { tom: "expirada", texto: "reserva fora do prazo" };
  if (faltam === 0) return { tom: "ultimo", texto: "expira hoje" };
  if (faltam <= 3) return { tom: "ultimo", texto: `expira em ${faltam} dia${faltam === 1 ? "" : "s"}` };
  return { tom: "ok", texto: `expira em ${faltam} dias` };
}

/** O que vai para o histórico da máquina quando a reserva cai. */
export function notaDaExpiracao(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  const cliente = ciclo?.reserva_cliente || "cliente";
  return `Reserva de ${cliente} expirou: ${dias} dias sem saída (prazo ${PRAZO_RESERVA_DIAS} dias).`;
}

/** Texto do aviso à gestão e ao comercial. */
export function corpoDoAviso(ciclo, agora = new Date()) {
  const dias = diasDeReserva(ciclo, agora);
  const cliente = ciclo?.reserva_cliente || "—";
  const comercial = ciclo?.reserva_comercial || "—";
  return `A reserva de ${ciclo?.serie} para ${cliente} expirou ao fim de ${dias} dias sem saída (comercial: ${comercial}). A máquina volta a estar disponível.`;
}
