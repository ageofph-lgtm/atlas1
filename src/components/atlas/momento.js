/**
 * Quando é que um acontecimento se deu.
 *
 * Normalmente é a data de criação do registo: o evento do histórico, a
 * mensagem e o pedido são gravados no instante em que acontecem. Mas o Base44
 * não deixa escrever `created_date` — fica sempre a hora da gravação —, e há
 * registos que chegam depois do facto: o histórico importado de outro sistema
 * numa instalação nova, ou os dados de demonstração. Esses trazem a data real
 * em `ocorrido_em`, e é essa que conta.
 */
export const momentoDe = (registo) => registo?.ocorrido_em || registo?.created_date || null;

/** Para `sort`: do mais recente para o mais antigo, os sem data no fim. */
export const maisRecentePrimeiro = (a, b) =>
  new Date(momentoDe(b) || 0) - new Date(momentoDe(a) || 0);
