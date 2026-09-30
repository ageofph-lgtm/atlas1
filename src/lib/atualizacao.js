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

/**
 * Quanto se espera que o service worker novo assuma, antes de recarregar na
 * mesma. Não é o caminho normal — é o que impede o botão de ficar sem efeito
 * se o evento nunca chegar.
 */
export const ESPERA_TROCA = 3000;

/**
 * Cria o que o botão faz: pôr a versão nova a mandar e recarregar UMA vez.
 *
 * Recarregar sozinho não chega. Com `registerType: 'prompt'` o worker novo fica
 * à espera até todos os separadores fecharem — e uma recarga não fecha o
 * separador. Medido em browser com um separador só: a página recarregava na
 * versão nova, mas o worker velho continuava a mandar, a barra voltava a
 * aparecer a cada arranque e, sem rede, a página ficava em branco (o worker
 * velho não tem os ficheiros da versão nova).
 *
 * Por isso pede-se primeiro ao worker à espera que salte a espera
 * (`pedirTroca`) e só se recarrega quando ele assume o controlo. Todas as vias
 * de recarregar passam pela mesma guarda, de modo que a página recarrega uma
 * vez e só uma — foi a falta disto que já deu 94 recargas seguidas ao
 * juntar a troca com uma recarga imediata.
 *
 * Sem worker à espera não há nada para trocar: recarrega-se logo, porque o
 * `index.html` vem sempre da rede e traz a versão nova.
 */
export function criarTrocaDeVersao({
  obterAEspera,
  pedirTroca,
  recarregar,
  contentor,
  esperar = (fn, ms) => setTimeout(fn, ms),
  esperaMs = ESPERA_TROCA,
} = {}) {
  let feito = false;
  let pedida = false;
  const recarregarUmaVez = () => {
    if (feito) return false;
    feito = true;
    recarregar?.();
    return true;
  };

  const trocar = async () => {
    let aEspera = null;
    try {
      aEspera = await obterAEspera?.();
    } catch (_e) {
      // sem forma de saber: recarrega-se, que é o que menos pode correr mal
    }
    if (!aEspera || typeof pedirTroca !== "function") return recarregarUmaVez();

    pedida = true;
    contentor?.addEventListener?.("controllerchange", recarregarUmaVez, { once: true });
    esperar(recarregarUmaVez, esperaMs);
    try {
      await pedirTroca();
    } catch (_e) {
      // o temporizador trata disso
    }
    return true;
  };

  /**
   * Para o aviso do próprio registo ("o worker novo assumiu").
   *
   * Esse aviso chega a TODOS os separadores quando um deles troca de versão.
   * Só se recarrega aquele onde se carregou no botão: os outros podem estar a
   * meio de um registo, e continuam na versão deles até a pessoa escolher —
   * a barra continua lá a lembrá-lo.
   */
  const recarregarSePedida = () => (pedida ? recarregarUmaVez() : false);

  return { trocar, recarregarUmaVez, recarregarSePedida };
}

/** Só para os testes: repõe o estado entre casos. */
export function reporAtualizacao() {
  estado = { disponivel: false, aplicar: null };
  ouvintes.clear();
}
