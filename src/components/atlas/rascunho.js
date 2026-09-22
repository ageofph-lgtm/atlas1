/**
 * O que está escrito num formulário, guardado no aparelho.
 *
 * O prejuízo real de um registo feito no pátio com mau sinal não é a falha —
 * é escrever tudo outra vez. A série, o modelo, as características, as notas.
 * Isto fica no browser de quem está a escrever, sobrevive a fechar a página e
 * apaga-se assim que o registo passa.
 *
 * Nunca é um dado do pátio: se o armazenamento não estiver disponível, a
 * aplicação funciona na mesma — apenas não se lembra.
 */
const CHAVE = (nome) => `atlas:rascunho:${nome}`;

/** Quanto tempo um rascunho continua a fazer sentido. Ao fim de um dia, já não. */
export const VALIDADE_MS = 24 * 60 * 60 * 1000;

export function guardarRascunho(nome, dados) {
  try {
    localStorage.setItem(CHAVE(nome), JSON.stringify({ em: Date.now(), dados }));
  } catch (_e) {
    // janela privada ou armazenamento cheio — não impede de continuar a escrever
  }
}

export function lerRascunho(nome, { agora = Date.now() } = {}) {
  try {
    const guardado = JSON.parse(localStorage.getItem(CHAVE(nome)) || "null");
    if (!guardado?.dados || typeof guardado.em !== "number") return null;
    // Um rascunho de ontem é mais provável que atrapalhe do que ajude.
    if (agora - guardado.em > VALIDADE_MS) {
      apagarRascunho(nome);
      return null;
    }
    return guardado.dados;
  } catch (_e) {
    return null;
  }
}

export function apagarRascunho(nome) {
  try {
    localStorage.removeItem(CHAVE(nome));
  } catch (_e) {
    // idem
  }
}
