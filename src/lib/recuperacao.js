/**
 * Recuperação de uma versão presa em cache.
 *
 * O ATLAS é uma PWA: um service worker guarda a aplicação para ela abrir sem
 * rede. O preço disso é que, ao publicar uma versão nova, um browser pode ficar
 * com a mistura errada — o `index.html` velho, que aponta para ficheiros
 * `index-<hash>.js` que já não existem nem no servidor nem na cache, porque o
 * service worker novo já os apagou.
 *
 * Quando isso acontece a página não desenha nada e fica no círculo a rodar para
 * sempre. Não há erro visível, e a única saída é limpar o armazenamento do site
 * à mão — coisa que ninguém no pátio tem de saber fazer.
 *
 * Este módulo é a rede de segurança: deteta o sintoma e limpa-se a si próprio,
 * uma vez. As funções recebem as dependências de fora para poderem ser testadas
 * sem browser nenhum.
 */

/** Marca que já se tentou recuperar, para nunca entrar em ciclo de recargas. */
export const CHAVE_TENTATIVA = "atlas:recuperacao";

/**
 * Quanto tempo tem de passar até se poder tentar recuperar outra vez.
 *
 * A primeira versão guardava só um "já tentei" e limpava-o no arranque
 * seguinte, o que não travava nada: falha → recarrega → arranca → limpa a marca
 * → falha → recarrega, sem fim. Foi medido em browser, 88 recargas.
 *
 * Com uma hora de intervalo, um problema passageiro recupera-se à primeira e um
 * problema persistente para na primeira tentativa — a pessoa fica com o ecrã de
 * falha, que explica e tem botões, em vez de um separador a piscar.
 */
export const JANELA_RECUPERACAO = 60 * 60 * 1000;

/**
 * Se vale a pena tentar recuperar agora.
 *
 * Só uma vez por separador. Uma segunda tentativa seguida significaria que
 * limpar a cache não resolveu — e aí recarregar outra vez só daria um ciclo
 * infinito, que é pior do que o ecrã preso: pelo menos o ecrã preso deixa ler
 * uma mensagem.
 */
export function podeTentarRecuperar(armazenamento, agora = Date.now()) {
  // Sem armazenamento nenhum não se tenta. O `?.` sozinho não chegava: devolvia
  // `undefined`, que é diferente de uma marca válida e portanto dizia que sim —
  // justamente o lado que abre a porta ao ciclo de recargas.
  if (!armazenamento?.getItem) return false;
  try {
    const marca = Number(armazenamento.getItem(CHAVE_TENTATIVA));
    if (!Number.isFinite(marca) || marca <= 0) return true;
    return agora - marca >= JANELA_RECUPERACAO;
  } catch (_e) {
    // Sem armazenamento não há como saber se já se tentou. Não tentar é o lado
    // seguro: um ciclo de recargas é pior do que um ecrã parado.
    return false;
  }
}

export function marcarTentativa(armazenamento, agora = Date.now()) {
  try {
    armazenamento?.setItem(CHAVE_TENTATIVA, String(agora));
  } catch (_e) {
    // se não se consegue marcar, o `podeTentarRecuperar` já devolveu false
  }
}

/**
 * Apaga a marca.
 *
 * NÃO se chama no arranque: era isso que anulava o travão. O código do arranque
 * corre antes de a aplicação desenhar seja o que for, por isso "arrancou" ali
 * não quer dizer nada — e limpar a marca aí transformava a proteção numa
 * decoração.
 */
export function limparTentativa(armazenamento) {
  try {
    armazenamento?.removeItem(CHAVE_TENTATIVA);
  } catch (_e) {
    // nada a fazer
  }
}

/**
 * Deita fora o service worker e tudo o que ele guardou.
 *
 * Os dois têm de cair juntos: só desregistar o service worker deixa a cache
 * para trás e a próxima visita volta a servir os mesmos ficheiros velhos.
 *
 * Nunca toca no `localStorage` — é lá que estão a sessão e as preferências, e
 * apagá-las obrigaria toda a gente a entrar outra vez por causa de um problema
 * que não é delas.
 */
export async function limparAplicacaoEmCache({ serviceWorker, caches } = {}) {
  const feito = { workers: 0, caches: 0 };

  try {
    const registos = (await serviceWorker?.getRegistrations?.()) || [];
    for (const registo of registos) {
      if (await registo.unregister()) feito.workers += 1;
    }
  } catch (_e) {
    // sem service worker, ou sem permissão: segue para as caches
  }

  try {
    const nomes = (await caches?.keys?.()) || [];
    for (const nome of nomes) {
      if (await caches.delete(nome)) feito.caches += 1;
    }
  } catch (_e) {
    // idem
  }

  return feito;
}

/**
 * Limpa e recarrega, uma vez só.
 *
 * Devolve `false` quando já se tinha tentado — quem chama usa isso para mostrar
 * uma mensagem em vez de insistir.
 */
export async function recuperarERecarregar({ serviceWorker, caches, armazenamento, recarregar, agora = Date.now() } = {}) {
  if (!podeTentarRecuperar(armazenamento, agora)) return false;
  marcarTentativa(armazenamento, agora);
  await limparAplicacaoEmCache({ serviceWorker, caches });
  recarregar?.();
  return true;
}

/**
 * Os erros que denunciam uma versão presa em cache.
 *
 * São sempre falhas a ir buscar um pedaço de código que devia existir: o
 * `index.html` velho pede um `index-<hash>.js` que já foi apagado. O texto
 * muda de browser para browser, por isso reconhece-se por várias formas.
 */
export function eErroDeVersaoPresa(erro) {
  const texto = `${erro?.message || erro || ""} ${erro?.name || ""}`.toLowerCase();
  if (!texto.trim()) return false;
  return (
    texto.includes("failed to fetch dynamically imported module") ||
    texto.includes("error loading dynamically imported module") ||
    texto.includes("importing a module script failed") ||
    texto.includes("unable to preload") ||
    (texto.includes("chunkloaderror") && true)
  );
}
