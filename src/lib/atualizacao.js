/**
 * Aviso de versão nova, com botão para aplicar.
 *
 * Sem isto, quem deixa o separador aberto o dia todo continua a correr o código
 * antigo até se lembrar de recarregar — e ninguém se lembra, porque nada lhe
 * diz que há motivo. Passa a haver uma barra a dizê-lo e um botão que trata
 * disso.
 *
 * **Nunca se atualiza sozinho.** Uma recarga automática a meio de um registo de
 * entrada perde os três passos que a pessoa já preencheu. O clique é o que
 * garante que a troca acontece quando dá jeito a quem está a usar.
 *
 * Este módulo é só o estado partilhado: quem sabe da existência de uma versão
 * nova é o registo do service worker, no `main.jsx`, e quem a mostra é um
 * componente React. Ficam ligados por aqui, e assim a lógica testa-se sem
 * browser e sem os módulos virtuais do Vite.
 */

/**
 * De quanto em quanto tempo se pergunta ao servidor se há versão nova.
 *
 * O browser só procura sozinho quando a página carrega. Quem nunca recarrega —
 * que é exatamente quem este aviso serve — nunca veria nada sem isto. Meia hora
 * é frequente o suficiente para a notícia chegar no mesmo turno e raro o
 * suficiente para não pesar.
 */
export const INTERVALO_VERIFICACAO = 30 * 60 * 1000;

let estado = { disponivel: false, aplicar: null };
const ouvintes = new Set();

const avisarOuvintes = () => {
  for (const ouvinte of [...ouvintes]) {
    try {
      ouvinte(estado);
    } catch (_e) {
      // um ouvinte que rebenta não pode impedir os outros de saber
    }
  }
};

export const estadoDaAtualizacao = () => estado;

/** Devolve a função de cancelar, como manda o `useSyncExternalStore`. */
export function subscreverAtualizacao(ouvinte) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

/**
 * Chamado pelo registo do service worker quando há uma versão à espera.
 *
 * `aplicar` é o que troca de versão e recarrega. Guarda-se em vez de se
 * executar: é o utilizador que decide quando.
 */
export function anunciarVersaoNova(aplicar) {
  if (typeof aplicar !== "function") return false;
  estado = { disponivel: true, aplicar };
  avisarOuvintes();
  return true;
}

/**
 * Aplica a versão nova.
 *
 * Marca como indisponível antes de aplicar, para dois cliques seguidos não
 * dispararem duas trocas — o botão desaparece assim que se carrega nele.
 */
export function aplicarVersaoNova() {
  const { disponivel, aplicar } = estado;
  if (!disponivel || !aplicar) return false;
  estado = { disponivel: false, aplicar: null };
  avisarOuvintes();
  aplicar();
  return true;
}

/** Só para os testes: repõe o estado entre casos. */
export function reporAtualizacao() {
  estado = { disponivel: false, aplicar: null };
  ouvintes.clear();
}
