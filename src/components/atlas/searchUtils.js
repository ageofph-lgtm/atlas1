import { SPEC_LABELS, CATEGORIA_CONFIG, CONE_COLORS } from "@/components/atlas/constants";

const NUMERO_DE_CONE = /^\d{1,3}$/;

/**
 * A cor de cone que um pedaço de palavra quer dizer ("az" → azul), ou null.
 * Pede duas letras e que só uma cor encaixe: "a" tanto é azul como amarelo, e
 * "ver" tanto é verde como vermelho.
 */
const corDoCone = (palavra) => {
  if (palavra.length < 2) return null;
  const cores = CONE_COLORS.filter((c) => c.value.startsWith(palavra));
  return cores.length === 1 ? cores[0].value : null;
};

/**
 * Se a pesquisa fala de um cone: "12", "cone 12", "amarelo 12", "az 7".
 *
 * Devolve `{ numero, cor, soCone }` ou null quando a pesquisa é outra coisa.
 * Os cones são números de 1 a 3 algarismos.
 *
 * `soCone` diz se a pesquisa é só pelo cone. É quando se disse a cor ou a
 * palavra "cone". Um número sozinho não chega: medido a 06/10/2026, procurar
 * "592" deixou de encontrar a máquina cuja série acaba em 592, porque o número
 * era tratado só como cone. Um número sozinho serve as duas coisas.
 */
export const pesquisaDeCone = (query) => {
  const todas = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  const disseCone = todas.includes("cone");
  const palavras = todas.filter((p) => p !== "cone");
  const numeros = palavras.filter((p) => NUMERO_DE_CONE.test(p));
  if (numeros.length !== 1) return null;
  const resto = palavras.filter((p) => !NUMERO_DE_CONE.test(p));
  if (resto.length === 0) return { numero: numeros[0], cor: null, soCone: disseCone };
  const cor = resto.length === 1 ? corDoCone(resto[0]) : null;
  return cor ? { numero: numeros[0], cor, soCone: true } : null;
};

/** "07" e "7" são o mesmo cone. */
const mesmoNumero = (a, b) => String(a ?? "").trim() !== "" && Number(a) === Number(b);

// Tokenized, case-insensitive search across ciclo + maquina fields.
// OR logic: any token matches any field — easy to find by any term
// (serie, modelo, triplex, niho, cliente, ...).
// Cone: "12" encontra o cone 12 e também o que tiver "12" (a série que acaba
// em 12, por exemplo); "amarelo 12" e "cone 12" só o cone. Ver `pesquisaDeCone`.
// O filtro de cone da barra continua a existir.
export const matchCicloSearch = (ciclo, maquina, query) => {
  if (!query || !query.trim()) return true;
  const cone = pesquisaDeCone(query);
  if (cone) {
    const doCone = mesmoNumero(ciclo?.cone_numero, cone.numero) && (!cone.cor || ciclo?.cone_cor === cone.cor);
    if (doCone || cone.soCone) return doCone;
  }
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;

  const labelOf = (field, value) => (value ? (SPEC_LABELS[field]?.[value] || "") : "");
  const catLabel = ciclo?.categoria ? (CATEGORIA_CONFIG[ciclo.categoria]?.label || "") : "";

  const fields = [
    ciclo?.serie,
    ciclo?.categoria,
    catLabel,
    ciclo?.cone_cor,
    ciclo?.reserva_cliente,
    ciclo?.observacoes,
    maquina?.modelo,
    maquina?.observacoes,
    maquina?.ano,
    maquina?.mastro,
    labelOf("mastro", maquina?.mastro),
    maquina?.vias_mastro,
    labelOf("vias_mastro", maquina?.vias_mastro),
    maquina?.joystick,
    labelOf("joystick", maquina?.joystick),
    maquina?.tipo_pneu,
    labelOf("tipo_pneu", maquina?.tipo_pneu),
    maquina?.h3,
    maquina?.bateria,
    labelOf("bateria", maquina?.bateria),
    ...(maquina?.acessorios || []).flatMap((a) => [a, SPEC_LABELS.acessorios?.[a] || ""]),
  ]
    .filter((f) => f !== "" && f != null)
    .map((f) => String(f).toLowerCase());

  return tokens.some((token) => fields.some((f) => f.includes(token)));
};