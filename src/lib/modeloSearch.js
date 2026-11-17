/**
 * Pesquisa por modelo de máquina.
 *
 * Os 347 modelos da frota estão escritos de muitas maneiras: «EXV 14»,
 * «EXV 14C - i», «Exv 14i C», «EXV14C», «RX20-16C», «RX 20-16», «Rx2016»,
 * «FM-X 14», «EXH20 SF», «RX 60-50/600»… Uma pesquisa por «contém» sobre o
 * texto do modelo (o que existia antes) deixava passar tudo o que tivesse a
 * palavra: procurar «exv 14» devolvia EXV 12, 16 e EXV SF.
 *
 * Aqui o modelo é reduzido a uma sequência de tokens — letras, dígitos,
 * letras… — e a pesquisa é comparada posição a posição:
 *
 *   «EXV 14C - i»  → [exv, 14, ci]
 *   «EXV – SF 14I» → [exvsf, 14, i]
 *   «Rx2016»       → [rx, 20, 16]      (a série são os 2 primeiros dígitos)
 *   «EXH20 SF»     → [exhsf, 20]       (alias do sufixo SF/S)
 *
 * Assim «exv 14» encaixa em [exv, 14, …] e nunca em [exvsf, 14] nem em
 * [exv, 12, …]. Este módulo não depende de nada da app: é regra pura, para
 * poder ser testada fora do ecrã.
 */

/** Sem acentos: «Águia» e «Aguia» são a mesma palavra. */
const semAcentos = (texto) => String(texto).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/**
 * Alias do sufixo: família+número+«sf»/«s» no fim passa a família+«sf»/«s»+número.
 *
 * «exh20sf» → «exhsf20»; «exv14s» → «exvs14». Sem isto, «EXH20 SF» e
 * «EXH-SF20» — a mesma máquina escrita de duas formas — davam famílias
 * diferentes e não se encontravam uma à outra.
 */
const aplicarAlias = (texto) =>
  texto.replace(/^([a-z]+)(\d+)(sf|s)$/, (_, familia, numero, sufixo) => familia + sufixo + numero);

/**
 * «Rx2016» → [rx, 20, 16].
 *
 * Na gama RX o primeiro número é a série (20, 60, 70) e o segundo a
 * capacidade. Quando os separadores desaparecem — «Rx2016», «RX60-25» →
 * «rx6025» — parte-se o número: 2 dígitos de cada vez, até sobrar a
 * capacidade. O que sobra depois («RX 60-50/600» → 600) fica como token
 * extra, que não atrapalha a comparação.
 */
const partirSerieRX = (tokens) => {
  if (tokens[0] !== "rx" || !/^\d{4,}$/.test(tokens[1] || "")) return tokens;
  const numero = tokens[1];
  const partes = [];
  let i = 0;
  while (numero.length - i > 3) {
    partes.push(numero.slice(i, i + 2));
    i += 2;
  }
  partes.push(numero.slice(i));
  return [tokens[0], ...partes, ...tokens.slice(2)];
};

/**
 * O modelo em tokens alternados de letras e dígitos.
 *
 * Minúsculas, sem acentos e sem nada que não seja letra ou dígito (espaços,
 * «-», «–», «—», «/», «.»). Devolve [] quando não sobra nada.
 */
export const normalizarModelo = (modelo) => {
  const limpo = semAcentos(String(modelo || "").toLowerCase()).replace(/[^a-z0-9]/g, "");
  if (!limpo) return [];
  return partirSerieRX(aplicarAlias(limpo).match(/[a-z]+|\d+/g) || []);
};

/** Os tokens outra vez numa só palavra — serve para comparar e para ordenar. */
export const textoNormalizado = (modelo) => normalizarModelo(modelo).join("");

/**
 * As raízes de modelo que existem na frota (STILL e afins). É o que distingue
 * «exv 14» — uma pesquisa de modelo — de «triplex», «uts» ou «amarelo», que
 * continuam a ser pesquisa de texto normal.
 */
const RAIZES_DE_MODELO = [
  "axv", "cop", "ctr", "cx", "ech", "egv", "erp", "ex", "fm", "fsx",
  "gx", "lpe", "ltx", "lx", "opx", "oxv", "pxv", "rce", "rxe", "rx",
];

const ehNumero = (token) => /^\d+$/.test(token);
const ehLetras = (token) => /^[a-z]+$/.test(token);

const numerosDe = (tokens) => tokens.filter(ehNumero);
const variantesDe = (tokens) => tokens.slice(1).filter(ehLetras).join("");

/**
 * A pesquisa lida como modelo — ou null quando não é uma pesquisa de modelo.
 *
 * Exige a primeira palavra só de letras (senão é série ou número), com 2 a 6
 * letras e a começar por uma raiz conhecida: é o que impede que uma série como
 * «F20323X00524» (uma letra e dígitos) seja tratada como modelo.
 */
export const analisarPesquisaDeModelo = (query) => {
  const tokens = normalizarModelo(query);
  if (tokens.length === 0) return null;
  const familia = tokens[0];
  if (!ehLetras(familia)) return null;
  if (familia.length < 2 || familia.length > 6) return null;
  if (!RAIZES_DE_MODELO.some((raiz) => familia.startsWith(raiz))) return null;
  return {
    tokens,
    familia,
    numeros: numerosDe(tokens),
    variantes: variantesDe(tokens),
  };
};

export const ehPesquisaDeModelo = (query) => !!analisarPesquisaDeModelo(query);

/**
 * A família tem de ser a mesma: «exv» ≠ «exvsf», «exh» ≠ «exhs» ≠ «exhsf»,
 * «exu» ≠ «exus». A exceção é quem ainda está a escrever: com menos de 3
 * letras basta começar por («ex» apanha EXV, EXU, EXH…).
 */
const familiaCorresponde = (familiaDoModelo, familiaDaPesquisa) =>
  familiaDaPesquisa.length < 3
    ? familiaDoModelo.startsWith(familiaDaPesquisa)
    : familiaDoModelo === familiaDaPesquisa;

/** Todas as letras pedidas existem no sufixo do modelo, em qualquer ordem. */
const letrasContidas = (sufixo, pedidas) => {
  const disponiveis = {};
  for (const letra of sufixo) disponiveis[letra] = (disponiveis[letra] || 0) + 1;
  for (const letra of pedidas) {
    if (!disponiveis[letra]) return false;
    disponiveis[letra] -= 1;
  }
  return true;
};

/**
 * O modelo responde à pesquisa de modelo?
 *
 * Cada número pedido tem de ser igual ao número na mesma posição (o 14 é o 14,
 * não o 140), e as letras de variante — «c», «i», «basic» — têm de existir no
 * sufixo. Tokens a mais no modelo são permitidos: a pesquisa é um prefixo
 * lógico, e quem escreve «exv 14» quer as variantes todas.
 */
export const correspondeAoModelo = (modelo, query) => {
  const pesquisa = analisarPesquisaDeModelo(query);
  if (!pesquisa) return false;
  const tokens = normalizarModelo(modelo);
  if (tokens.length === 0 || !ehLetras(tokens[0])) return false;
  if (!familiaCorresponde(tokens[0], pesquisa.familia)) return false;

  const numeros = numerosDe(tokens);
  for (let i = 0; i < pesquisa.numeros.length; i++) {
    if (numeros[i] === undefined || Number(numeros[i]) !== Number(pesquisa.numeros[i])) return false;
  }
  return !pesquisa.variantes || letrasContidas(variantesDe(tokens), pesquisa.variantes);
};

/** O modelo escrito tal e qual como se procurou — «EXV 14» para «exv 14». */
export const correspondenciaExata = (modelo, query) => {
  const procurar = textoNormalizado(query);
  return !!procurar && textoNormalizado(modelo) === procurar;
};

/**
 * Ordena os resultados com a correspondência exata à frente.
 *
 * Procurar «exv 14» mostra primeiro o «EXV 14» e só depois as variantes
 * (14C, 14I, 14C - i). Fora da pesquisa de modelo, ou sem pesquisa, a lista
 * fica pela ordem que já tinha — não se mexe no que a página decidiu.
 */
export const ordenarPorPesquisaDeModelo = (ciclos, query, getMaquina) => {
  if (!ehPesquisaDeModelo(query)) return ciclos;
  const peso = (ciclo) => {
    const modelo = getMaquina?.(ciclo)?.modelo;
    if (!correspondeAoModelo(modelo, query)) return 2;
    return correspondenciaExata(modelo, query) ? 0 : 1;
  };
  // O sort é estável: dentro do mesmo peso fica a ordem anterior.
  return [...ciclos].sort((a, b) => peso(a) - peso(b));
};

/**
 * A capacidade de um modelo, para os sub-filtros de família.
 *
 * «EXV 14C - i» → 14. Na gama RX o primeiro número é a série, pelo que a
 * capacidade é o segundo: «RX20-16C» → 16.
 */
export const capacidadeDoModelo = (modelo) => {
  const tokens = normalizarModelo(modelo);
  const numeros = numerosDe(tokens);
  if (numeros.length === 0) return null;
  const bruto = numeros[tokens[0] === "rx" ? 1 : 0];
  return bruto ? String(Number(bruto)) : null;
};