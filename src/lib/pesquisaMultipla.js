/**
 * Pesquisa de várias séries (NS) de uma vez.
 *
 * Aceita uma lista colada do Excel, de um e-mail ou lida de uma fotografia:
 * «F20321Y00397, 516225N00592; W40185V00016» ou uma por linha. Também serve o
 * fim da série («00592, 00845»), como a pesquisa normal.
 *
 * Uma máquina aparece se a série dela corresponder a QUALQUER um dos NS.
 */

/** Maiúsculas, só letras e dígitos: «f2032-1y 00397» → «F20321Y00397». */
export const normalizarSerie = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const SEPARADORES = /[,;\n\r\t|]+/;
const MIN_PEDACO = 4; // menos que isto apanha meia frota

/** Parece um NS (ou o fim de um): tem dígitos e pelo menos 4 caracteres. */
const pareceSerie = (t) => t.length >= MIN_PEDACO && /\d/.test(t);
/** Um NS inteiro: 8+ caracteres com letras e dígitos (F20321Y00397, 516225N00592). */
const pareceSerieInteira = (t) => t.length >= 8 && /\d/.test(t) && /[A-Z]/.test(t);

/**
 * A lista de NS que a pesquisa pede, ou null quando é uma pesquisa normal.
 *
 * - Com vírgula, ponto e vírgula, mudança de linha, tab ou «|»: cada parte é
 *   um NS (os espaços dentro da parte saem: «F20321 Y00397» é um só).
 * - Só com espaços: tem de haver 2+ palavras e todas serem NS inteiros, para
 *   não roubar pesquisas como «exv 14», «amarelo 12» ou «triplex 4500».
 * Duplicados saem. Com menos de 2 NS válidos não é pesquisa múltipla.
 */
export const listaDeSeries = (query) => {
  const texto = String(query || "").trim();
  if (!texto) return null;
  let partes;
  if (SEPARADORES.test(texto)) {
    partes = texto.split(SEPARADORES).map(normalizarSerie).filter(pareceSerie);
  } else {
    const palavras = texto.split(/\s+/).map(normalizarSerie).filter(Boolean);
    if (palavras.length < 2 || !palavras.every(pareceSerieInteira)) return null;
    partes = palavras;
  }
  const unicas = [...new Set(partes)];
  return unicas.length >= 2 ? unicas : null;
};

/** A série corresponde ao NS pedido (inteiro ou pedaço, sem ligar a símbolos). */
export const serieCorresponde = (serie, ns) => {
  const s = normalizarSerie(serie);
  return !!s && !!ns && s.includes(ns);
};

/**
 * Para cada NS pedido, quantas máquinas da lista lhe correspondem.
 * `ciclos` = o universo da página ANTES da pesquisa (com os filtros aplicados).
 * Devolve [{ ns, encontradas }] pela ordem em que foram pedidos.
 */
export const resumoDaPesquisaMultipla = (lista, ciclos) =>
  (lista || []).map((ns) => ({
    ns,
    encontradas: (ciclos || []).filter((c) => serieCorresponde(c?.serie, ns)).length,
  }));