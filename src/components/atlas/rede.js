import { useState, useEffect } from "react";

/**
 * Estado da rede, e o que fazer quando ela não existe.
 *
 * O pátio tem zonas com mau sinal. Antes disto, um registo feito lá fora
 * falhava numa chamada qualquer a meio do caminho — às vezes depois de já ter
 * gravado a máquina e antes de gravar o ciclo, o que é pior do que não gravar
 * nada. Agora recusa-se à entrada, com uma mensagem que diz o que aconteceu.
 */

/** `navigator.onLine` pode não existir (testes em node); na dúvida, assume-se que há rede. */
export const estaOnline = () =>
  typeof navigator === "undefined" || navigator.onLine === undefined ? true : navigator.onLine;

export class ErroSemRede extends Error {
  constructor(acao = "Esta operação") {
    super(`${acao} precisa de ligação à internet. O que escreveu fica guardado — tente outra vez quando houver rede.`);
    this.name = "ErroSemRede";
    this.semRede = true;
  }
}

/**
 * Trava à entrada de quem escreve na base de dados.
 *
 * Recusar antes de começar é melhor do que falhar a meio: uma escrita
 * interrompida deixa registos pela metade, e foi assim que apareceram as
 * máquinas em estados impossíveis.
 */
export function exigirRede(acao) {
  if (!estaOnline()) throw new ErroSemRede(acao);
}

/** Estado da rede para o ecrã, a acompanhar os eventos do browser. */
export function useEstadoRede() {
  const [online, setOnline] = useState(estaOnline);

  useEffect(() => {
    const subiu = () => setOnline(true);
    const caiu = () => setOnline(false);
    window.addEventListener("online", subiu);
    window.addEventListener("offline", caiu);
    return () => {
      window.removeEventListener("online", subiu);
      window.removeEventListener("offline", caiu);
    };
  }, []);

  return online;
}
