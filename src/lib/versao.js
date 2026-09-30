/**
 * Saber se o servidor já tem uma versão nova — sem depender do service worker.
 *
 * O aviso de versão nova vinha só do service worker, que o browser procura ao
 * abrir a página e depois de 30 em 30 minutos. Na prática aparecia ao fechar e
 * abrir a aplicação, e não durante o uso. Pior: medido em browser, depois de
 * atualizar em "/Inventario", abrir pelo ícone ("/") trazia a versão velha da
 * cache do browser — e sem aviso nenhum, porque o service worker já era o novo.
 * Quando os ficheiros velhos já não existiam, a página ficava em branco.
 *
 * Aqui pergunta-se ao servidor, no arranque, de 2 em 2 minutos e sempre que se
 * volta à aplicação, que `index.html` está publicado, e compara-se o ficheiro
 * de arranque que ele pede (`/assets/index-<hash>.js`) com o desta página. O
 * pedido vai com `no-store` e um endereço sempre novo, para nenhuma cache poder
 * responder por ele.
 */

export const INTERVALO_VERSAO = 2 * 60 * 1000;

/** Entre duas verificações disparadas por eventos (voltar ao separador, etc.). */
export const INTERVALO_MINIMO = 30 * 1000;

/** O marcador que torna o endereço novo para a cache. O `index.html` tira-o logo. */
export const PARAMETRO_SEM_CACHE = "_v";

export const CHAVE_AUTOMATICA = "atlas:atualizacao-automatica";

/**
 * Uma atualização automática por versão, e só uma a cada 10 minutos.
 *
 * Se depois de recarregar a página continuar na versão velha (um servidor que
 * ainda não propagou a publicação, por exemplo), recarregar outra vez não
 * resolvia nada e dava um ciclo. Aí fica o aviso, e a pessoa escolhe.
 */
export const JANELA_AUTOMATICA = 10 * 60 * 1000;

const caminhoDe = (url) => {
  try {
    return new URL(url, "http://local").pathname;
  } catch (_e) {
    return null;
  }
};

/** O ficheiro de arranque que um `index.html` pede: o script módulo de `/assets/`. */
export function entradaDoHtml(html) {
  const etiquetas = String(html || "").match(/<script\b[^>]*>/gi) || [];
  for (const etiqueta of etiquetas) {
    if (!/\btype\s*=\s*["']?module\b/i.test(etiqueta)) continue;
    const src = etiqueta.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1];
    if (src && src.includes("/assets/")) return caminhoDe(src);
  }
  return null;
}

/** O ficheiro de arranque da página aberta — o do `index.html` que o browser usou. */
export function entradaDoDocumento(doc) {
  const scripts = doc?.querySelectorAll?.('script[type="module"][src]') || [];
  for (const s of scripts) {
    const src = s.getAttribute("src");
    if (src && src.includes("/assets/")) return caminhoDe(src);
  }
  return null;
}

/** Só há versão nova quando se sabem as duas e são diferentes: na dúvida, não se incomoda ninguém. */
export const versaoMudou = (atual, publicada) => !!atual && !!publicada && atual !== publicada;

/** O mesmo endereço, com um marcador que nenhuma cache conhece. É o que o Ctrl+Shift+R fazia à mão. */
export function enderecoSemCache(href, agora = Date.now()) {
  const u = new URL(href);
  u.searchParams.set(PARAMETRO_SEM_CACHE, String(agora));
  return `${u.pathname}${u.search}${u.hash}`;
}

/** Se ainda se pode atualizar sozinho para esta versão (ver JANELA_AUTOMATICA). */
export function podeAtualizarSozinho(armazenamento, alvo, agora = Date.now()) {
  if (!armazenamento?.getItem || !alvo) return false;
  try {
    const marca = JSON.parse(armazenamento.getItem(CHAVE_AUTOMATICA) || "null");
    if (!marca || marca.alvo !== alvo) return true;
    return agora - Number(marca.quando) >= JANELA_AUTOMATICA;
  } catch (_e) {
    return false;
  }
}

/**
 * A página arrancou na versão para onde se tinha atualizado sozinho: a marca
 * cumpriu-se e sai. Assim a próxima versão velha que apareça (outro endereço
 * guardado pelo browser, noutro dia) também se atualiza sozinha.
 */
export function esquecerSeJaChegou(armazenamento, entradaAtual) {
  try {
    const marca = JSON.parse(armazenamento?.getItem?.(CHAVE_AUTOMATICA) || "null");
    if (marca && entradaAtual && marca.alvo === entradaAtual) armazenamento.removeItem(CHAVE_AUTOMATICA);
  } catch (_e) {
    // marca ilegível: fica, e o `podeAtualizarSozinho` trata-a como "não"
  }
}

export function marcarAtualizacaoAutomatica(armazenamento, alvo, agora = Date.now()) {
  try {
    armazenamento?.setItem(CHAVE_AUTOMATICA, JSON.stringify({ alvo, quando: agora }));
  } catch (_e) {
    // sem armazenamento, o `podeAtualizarSozinho` já disse que não
  }
}

/**
 * O que fazer quando o servidor tem uma versão mais nova do que a da página.
 *
 * No arranque, antes de a pessoa mexer em alguma coisa, atualiza-se sozinho:
 * é o caso da página velha que veio da cache, e ninguém perde nada. Depois de
 * começar a trabalhar, só se avisa — recarregar a meio de um registo perdia-o.
 */
export function decidir({ noArranque, interagiu, podeSozinho }) {
  return noArranque && !interagiu && podeSozinho ? "atualizar" : "avisar";
}

/**
 * Vigia a versão publicada: agora, de `intervalo` em `intervalo` com a página
 * à vista, e ao voltar a ela (separador, janela, rede).
 *
 * As dependências vêm de fora para se poder testar sem browser.
 */
export function vigiarVersao({
  consultar,
  entradaAtual,
  aoDetetar,
  documento,
  janela,
  intervalo = INTERVALO_VERSAO,
  minimo = INTERVALO_MINIMO,
  agendar = (fn, ms) => setInterval(fn, ms),
  agora = () => Date.now(),
}) {
  let aVerificar = false;
  let ultima = 0;

  const verificar = async ({ noArranque = false } = {}) => {
    if (aVerificar) return;
    aVerificar = true;
    ultima = agora();
    try {
      const publicada = await consultar();
      if (versaoMudou(entradaAtual, publicada)) aoDetetar({ publicada, noArranque });
    } catch (_e) {
      // sem rede ou servidor calado: tenta-se na próxima
    } finally {
      aVerificar = false;
    }
  };

  const aoVoltar = () => {
    if (documento?.visibilityState === "hidden") return;
    if (agora() - ultima < minimo) return;
    verificar();
  };

  verificar({ noArranque: true });
  agendar(() => {
    if (documento?.visibilityState !== "hidden") verificar();
  }, intervalo);
  documento?.addEventListener?.("visibilitychange", aoVoltar);
  janela?.addEventListener?.("focus", aoVoltar);
  janela?.addEventListener?.("online", aoVoltar);

  return { verificar };
}
