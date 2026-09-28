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
export async function subirFotos(ficheiros, { jaTem = 0, comprimir, upload } = {}) {
  const cabem = Math.max(0, MAX_FOTOS - jaTem);
  const aSubir = [...(ficheiros || [])].slice(0, cabem);
  const recusadas = Math.max(0, (ficheiros?.length || 0) - aSubir.length);

  const urls = [];
  const falhadas = [];
  for (const ficheiro of aSubir) {
    try {
      const { file_url } = await upload(await comprimir(ficheiro));
      if (file_url) urls.push(file_url);
      else falhadas.push(ficheiro?.name || "?");
    } catch (_e) {
      falhadas.push(ficheiro?.name || "?");
    }
  }
  return { urls, recusadas, falhadas };
}

/** A frase que explica o que não entrou. `null` quando entrou tudo. */
export function avisoDeFotos({ recusadas = 0, falhadas = [] } = {}) {
  const partes = [];
  if (recusadas > 0) partes.push(`só cabem ${MAX_FOTOS} fotografias — ${recusadas} ${recusadas === 1 ? "não coube" : "não couberam"}`);
  if (falhadas.length > 0) partes.push(`${falhadas.length} ${falhadas.length === 1 ? "não subiu" : "não subiram"}`);
  if (!partes.length) return null;
  return partes.join("; ").replace(/^./, (c) => c.toUpperCase()) + ".";
}
