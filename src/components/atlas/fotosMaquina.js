/**
 * As fotografias da máquina, as que ficam guardadas no cartão.
 *
 * São diferentes das outras fotos que a aplicação já tira. A da placa serve
 * para ler o número de série no momento do registo e não volta a fazer falta; a
 * da bateria e a do carregador provam o que saiu com a máquina. Estas são o
 * estado da máquina no pátio — a pintura, os garfos, um amolgado — e são as que
 * alguém quer ver semanas depois sem ter de ir lá fora.
 */

/** Quatro chegam para dar a volta a uma máquina, e mantêm o backup com um tamanho comportável. */
export const MAX_FOTOS = 4;

const eEndereco = (v) => typeof v === "string" && /^https?:\/\//i.test(v);

/** As fotos válidas de uma máquina, sem repetições nem lixo, no máximo quatro. */
export const fotosDe = (maquina) => {
  const lista = Array.isArray(maquina?.fotos) ? maquina.fotos : [];
  return [...new Set(lista.filter(eEndereco))].slice(0, MAX_FOTOS);
};

export const podeAdicionar = (maquina) => fotosDe(maquina).length < MAX_FOTOS;
export const lugaresLivres = (maquina) => MAX_FOTOS - fotosDe(maquina).length;

/**
 * Junta fotos novas, sem passar do limite nem repetir.
 *
 * Devolve também o que ficou de fora: quem escolhe seis fotos de uma vez tem de
 * saber que só entraram as duas que cabiam, em vez de ficar a pensar que a
 * aplicação perdeu as outras.
 */
export function juntarFotos(maquina, novas = []) {
  const atuais = fotosDe(maquina);
  const limpas = novas.filter(eEndereco).filter((u) => !atuais.includes(u));
  const cabem = Math.max(0, MAX_FOTOS - atuais.length);
  return { fotos: [...atuais, ...limpas.slice(0, cabem)], recusadas: limpas.slice(cabem).length };
}

/** O conjunto anterior, já fora do cartão — as mesmas regras das atuais. */
export const fotosAnterioresDe = (maquina) => fotosDe({ fotos: maquina?.fotos_anteriores });

/**
 * Rotação: um movimento (entrada ou saída) com fotos novas.
 *
 * A regra da oficina é fotografar à chegada e à saída, mas no cartão só cabem
 * as quatro mais atuais. As que lá estavam passam a ser "as anteriores" — é o
 * que permite comparar como a máquina saiu com como voltou — e o conjunto
 * anterior a esse sai. Guarda-se um conjunto atrás, nunca mais: assim o peso
 * por máquina tem um teto.
 *
 * Devolve só os campos a gravar na Maquina. Sem fotos novas não roda nada: um
 * movimento sem fotografias não pode apagar as que havia. Com o cartão vazio, o
 * arquivo que existia mantém-se, em vez de ser trocado por nada.
 */
export function rodarFotos(maquina, novas = [], { momento, agora = new Date().toISOString() } = {}) {
  const limpas = [...new Set((novas || []).filter(eEndereco))].slice(0, MAX_FOTOS);
  if (!limpas.length) return {};
  const atuais = fotosDe(maquina);
  // As mesmas fotos outra vez (repetir uma saída que falhou a meio) não rodam:
  // rodar mandava-as para o arquivo e apagava as anteriores verdadeiras.
  if (limpas.every((u) => atuais.includes(u))) return {};
  const campos = { fotos: limpas, fotos_momento: momento || null, fotos_data: agora };
  if (atuais.length) {
    campos.fotos_anteriores = atuais;
    campos.fotos_anteriores_momento = maquina?.fotos_momento || null;
    campos.fotos_anteriores_data = maquina?.fotos_data || null;
  }
  return campos;
}

/**
 * O que gravar na Maquina num movimento com fotos: a rotação e as miniaturas
 * que ficam (as das fotos atuais e anteriores). `{}` quando não roda.
 *
 * É o mesmo na entrada, na saída e no retorno — por isso está num sítio só.
 */
export function camposDoMovimento(maquina, novas = [], miniaturasNovas = {}, opcoes = {}) {
  const rotacao = rodarFotos(maquina, novas, opcoes);
  if (!Object.keys(rotacao).length) return {};
  const final = { ...(maquina || {}), ...rotacao };
  return {
    ...rotacao,
    miniaturas: podarMiniaturas(
      { ...(maquina?.miniaturas || {}), ...(miniaturasNovas || {}) },
      [...fotosDe(final), ...fotosAnterioresDe(final)]
    ),
  };
}

/**
 * Substituir à mão, no cartão: um conjunto novo, sem apagar uma a uma.
 *
 * É a mesma rotação dos movimentos — as que estavam passam a anteriores —, com
 * o momento "atualizacao". Antes, para pôr fotos novas num cartão cheio, era
 * preciso apagar as quatro antigas, e com elas perdia-se o termo de comparação.
 */
export const camposDaSubstituicao = (maquina, novas = [], miniaturasNovas = {}, opcoes = {}) =>
  camposDoMovimento(maquina, novas, miniaturasNovas, { ...opcoes, momento: "atualizacao" });

/** A miniatura de uma foto, quando existe; senão a própria foto. */
export const miniaturaDe = (maquina, url) => maquina?.miniaturas?.[url] || url;

/**
 * As miniaturas que interessam: só as das fotos que a máquina ainda mostra
 * (atuais e anteriores). Sem isto o mapa crescia a cada volta.
 */
export function podarMiniaturas(miniaturas = {}, urls = []) {
  const fica = new Set(urls);
  return Object.fromEntries(Object.entries(miniaturas || {}).filter(([url, mini]) => fica.has(url) && eEndereco(mini)));
}

const ROTULO_MOMENTO = { entrada: "Chegada", saida: "Saída", atualizacao: "Atualização" };
const diaMes = (data) => {
  const d = data ? new Date(data) : null;
  return d && !Number.isNaN(d.getTime())
    ? `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`
    : null;
};

/** "Chegada · 30/09", "Saída · 02/09" — `null` quando não se sabe de quando são (fotos de antes da rotação). */
export function descreverConjunto(momento, data) {
  const partes = [ROTULO_MOMENTO[momento], diaMes(data)].filter(Boolean);
  return partes.length ? partes.join(" · ") : null;
}

/**
 * As fotos que o cartão tem agora, para as mostrar num movimento antes de
 * serem substituídas: `{ fotos, miniaturas, rotulo }`. Máquina nova ou sem
 * fotos: lista vazia.
 */
export const conjuntoAtual = (maquina) => ({
  fotos: fotosDe(maquina),
  miniaturas: maquina?.miniaturas || {},
  rotulo: descreverConjunto(maquina?.fotos_momento, maquina?.fotos_data),
});

/** Tira uma foto da lista. Um endereço que lá não esteja deixa tudo como estava. */
export const removerFoto = (maquina, url) => fotosDe(maquina).filter((u) => u !== url);

/** Quem pode mexer nas fotografias do pátio. */
export const podeGerirFotos = (perfil) => perfil === "logistica" || perfil === "administrador";

/**
 * Comprime e sobe as fotografias que cabem, e diz o que ficou de fora.
 *
 * Separado do componente porque é usado em três sítios — o cartão da máquina, o
 * registo de entrada e a saída — e porque a parte que interessa testar (quantas
 * cabem, o que acontece quando uma falha) não precisa de browser nenhum.
 *
 * Sobe só as que cabem: subir seis para descartar duas gastaria os dados de
 * quem está no pátio com o telemóvel.
 */
export async function subirFotos(ficheiros, { jaTem = 0, comprimir, upload, miniatura } = {}) {
  const cabem = Math.max(0, MAX_FOTOS - jaTem);
  const aSubir = [...(ficheiros || [])].slice(0, cabem);
  const recusadas = Math.max(0, (ficheiros?.length || 0) - aSubir.length);

  const urls = [];
  const falhadas = [];
  const miniaturas = {};
  for (const ficheiro of aSubir) {
    try {
      const { file_url } = await upload(await comprimir(ficheiro));
      if (!file_url) { falhadas.push(ficheiro?.name || "?"); continue; }
      urls.push(file_url);
      // A miniatura (uns 5 KB) é o que as listas mostram. Se falhar, a foto
      // entra na mesma: vê-se a inteira, só mais pesada.
      if (miniatura) {
        try {
          const { file_url: mini } = await upload(await miniatura(ficheiro));
          if (mini) miniaturas[file_url] = mini;
        } catch (_e) {
          // fica sem miniatura
        }
      }
    } catch (_e) {
      falhadas.push(ficheiro?.name || "?");
    }
  }
  return { urls, recusadas, falhadas, miniaturas };
}

/** A frase que explica o que não entrou. `null` quando entrou tudo. */
export function avisoDeFotos({ recusadas = 0, falhadas = [] } = {}) {
  const partes = [];
  if (recusadas > 0) partes.push(`só cabem ${MAX_FOTOS} fotografias — ${recusadas} ${recusadas === 1 ? "não coube" : "não couberam"}`);
  if (falhadas.length > 0) partes.push(`${falhadas.length} ${falhadas.length === 1 ? "não subiu" : "não subiram"}`);
  if (!partes.length) return null;
  return partes.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
}
