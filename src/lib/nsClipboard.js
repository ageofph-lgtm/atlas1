/**
 * Cópia de números de série (NS) à mão cheia.
 *
 * A seleção vive aqui, fora do React, por uma razão simples: quem copia NS está
 * a saltar entre ecrãs, cards e modais, e cada um desses sítios tem de ver a
 * mesma lista. Um contexto React obrigaria a embrulhar a aplicação toda para
 * guardar um punhado de números.
 *
 * A ordem é a dos cliques — é a ordem em que a pessoa quer a lista colada. Não
 * há duplicados porque um conjunto não os guarda, e clicar outra vez no mesmo
 * NS retira-o.
 */

const selecionados = new Set();
const ouvintes = new Set();

const avisar = () => ouvintes.forEach((fn) => fn([...selecionados]));

/** A lista atual, pela ordem em que os NS foram clicados. */
export const nsSelecionados = () => [...selecionados];

/** Avisa sempre que a seleção muda. Devolve a função para cancelar. */
export const subscreverNS = (fn) => {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
};

/** Junta ou tira um NS e devolve a lista já atualizada. */
export const alternarNS = (serie) => {
  const ns = String(serie ?? "").trim();
  if (!ns) return nsSelecionados();
  if (selecionados.has(ns)) selecionados.delete(ns);
  else selecionados.add(ns);
  avisar();
  return nsSelecionados();
};

/** Esquece a seleção. Não toca na área de transferência. */
export const limparNS = () => {
  if (!selecionados.size) return;
  selecionados.clear();
  avisar();
};

/** Um NS por linha é o que cola bem numa folha de cálculo ou num email. */
export const textoDosNS = (lista = []) => lista.join("\n");

/**
 * Copia texto simples. `navigator.clipboard` só existe em contexto seguro e
 * com permissão; o textarea é a rede para os casos em que falha.
 */
export const copiarTexto = async (texto) => {
  const valor = String(texto ?? "");
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(valor);
      return true;
    }
  } catch (_e) {
    // cai para o método antigo
  }
  try {
    const area = document.createElement("textarea");
    area.value = valor;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch (_e) {
    return false;
  }
};

/** O nó está dentro de um NS, ou contém um? */
const mexeEmNS = (no) => {
  const el = no?.nodeType === 1 ? no : no?.parentElement;
  if (!el) return false;
  if (el.closest?.("[data-ns]")) return true;
  return false;
};

/**
 * Copiar um NS à mão saía com a fonte gigante e a negrito, porque o browser
 * leva o HTML e os estilos junto com o texto. Quem cola no Outlook ou no Excel
 * ficava com um número em título.
 *
 * Este ouvinte apanha a cópia quando a seleção toca num NS e deixa lá só texto
 * simples — nada de HTML.
 */
const aoCopiar = (e) => {
  const sel = window.getSelection?.();
  if (!sel || sel.rangeCount === 0 || !e.clipboardData) return;
  const texto = sel.toString().trim();
  if (!texto) return;

  const range = sel.getRangeAt(0);
  let toca = mexeEmNS(range.commonAncestorContainer);
  if (!toca) {
    // A seleção pode começar fora do NS e apanhá-lo pelo caminho.
    const fragmento = range.cloneContents();
    toca = !!fragmento.querySelector?.("[data-ns]");
  }
  if (!toca) return;

  e.preventDefault();
  e.clipboardData.clearData();
  e.clipboardData.setData("text/plain", texto);
};

let instalado = false;

/** Instala o ouvinte uma vez. Chamado pelo CopyableNS ao carregar. */
export const instalarCopiaNS = () => {
  if (instalado || typeof document === "undefined") return;
  document.addEventListener("copy", aoCopiar);
  instalado = true;
};