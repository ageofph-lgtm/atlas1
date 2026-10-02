import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { ESTADO_CONFIG } from "@/components/atlas/constants";
import { estadoEfetivo, isVenda } from "@/components/atlas/cicloUtils";
import { exigirRede } from "@/components/atlas/rede";

/**
 * Corrigir o tipo de uma saída: aluguer ↔ venda.
 *
 * Medido no ATLAS a 02/10/2026: a logística deu saída para aluguer a uma
 * máquina vendida. Para desfazer, registou um retorno de 1 dia — que fechou o
 * ciclo como aluguer e abriu um ciclo novo no pátio — e o administrador marcou
 * "vendida" nesse ciclo novo. A venda ficou num ciclo que nunca saiu: os
 * indicadores e o histórico de saídas, que só contam ciclos com data de saída,
 * não a viam, e a máquina continuava pronta no pátio.
 *
 * Por isso a correção faz-se sempre no ciclo da saída, e leva com ela o que a
 * saída errada arrastou: o retorno feito para a desfazer é anulado, e o ciclo
 * que esse retorno abriu no pátio é apagado.
 */

export const NOME_TIPO_SAIDA = { alugada: "aluguer", vendida: "venda" };

/** O tipo de uma saída. Os ciclos antigos sem tipo são aluguer (ver `isVenda`). */
export const tipoDaSaida = (ciclo) => (isVenda(ciclo) ? "vendida" : "alugada");

/**
 * Até quanto tempo depois do retorno o ciclo do regresso pode ter entrado.
 * Pela Saída é o mesmo instante; pela Entrada são uns segundos, porque o
 * retorno fecha o aluguer e a entrada abre o ciclo novo a seguir.
 */
export const FOLGA_RETORNO_MS = 10 * 60 * 1000;

const dia = (d) => format(new Date(d), "dd/MM/yyyy");
const quando = (c) => new Date(c?.data_entrada || c?.created_date || 0).getTime();
const nomeEstado = (c) => ESTADO_CONFIG[estadoEfetivo(c)]?.label || estadoEfetivo(c) || "—";

/** A nota que fica na história da máquina. */
export const notaDaCorrecao = (de, para, retornoAnulado = null) =>
  `Saída corrigida: ${NOME_TIPO_SAIDA[de]} → ${NOME_TIPO_SAIDA[para]}` +
  (retornoAnulado ? ` — o retorno de ${dia(retornoAnulado)} foi anulado` : "");

const recusa = (motivo) => ({ ok: false, motivo });

/**
 * O que muda para passar a saída de `ciclo` a `novoTipo`, sem gravar nada.
 *
 * `ciclosDaSerie` são os ciclos da mesma máquina: é por eles que se encontra o
 * ciclo que um retorno abriu, e que se percebe se a máquina já teve vida
 * depois desta saída — caso em que se recusa, porque corrigir apagaria
 * movimentos verdadeiros.
 *
 * Devolve `{ ok: true, de, para, atualizar, apagar, explicacao, nota }`, em que
 * `apagar` é o ciclo a remover (ou null), ou `{ ok: false, motivo }`.
 */
export function planearCorrecao(ciclo, ciclosDaSerie = [], novoTipo) {
  if (!ciclo?.data_saida) {
    return recusa("Esta máquina não saiu: não há saída para corrigir. O tipo escolhe-se ao dar saída.");
  }
  if (!NOME_TIPO_SAIDA[novoTipo]) return recusa("Tipo de saída desconhecido.");
  const de = tipoDaSaida(ciclo);
  if (de === novoTipo) return recusa(`A saída já está registada como ${NOME_TIPO_SAIDA[novoTipo]}.`);

  const outros = ciclosDaSerie.filter((c) => c.id !== ciclo.id);

  if (novoTipo === "alugada") {
    // Uma venda não tem retorno: se a máquina voltou a entrar depois, essa
    // entrada é outra história e passar a aluguer deixava dois ciclos abertos.
    const depois = outros.filter((c) => quando(c) >= new Date(ciclo.data_saida).getTime());
    if (depois.length > 0) {
      return recusa(
        `A máquina voltou a entrar no pátio a ${dia(depois[0].data_entrada || depois[0].created_date)}, depois desta venda. ` +
          "Corrija à mão em Manutenção de ciclos."
      );
    }
    return {
      ok: true,
      de,
      para: novoTipo,
      atualizar: { tipo_saida: "alugada", estado: "em_aluguer", data_retorno: null, dias_alugada: null },
      apagar: null,
      explicacao: [
        "Passa a contar como aluguer nos indicadores e no histórico de saídas.",
        "A máquina volta a aparecer como fora, em aluguer, à espera do retorno.",
      ],
      nota: notaDaCorrecao(de, novoTipo),
    };
  }

  // Aluguer → venda.
  const atualizar = { tipo_saida: "vendida", estado: "fechado", data_retorno: null, dias_alugada: null };
  const explicacao = ["Passa a contar como venda nos indicadores e no histórico de saídas."];

  if (!ciclo.data_retorno) {
    explicacao.push("O aluguer fecha: a máquina deixa de contar como fora, em aluguer.");
    return { ok: true, de, para: novoTipo, atualizar, apagar: null, explicacao, nota: notaDaCorrecao(de, novoTipo) };
  }

  const retorno = new Date(ciclo.data_retorno).getTime();
  // Um minuto de margem para trás: os relógios de quem grava não são o mesmo.
  const depois = outros.filter((c) => quando(c) >= retorno - 60 * 1000);
  const saiuOutraVez = depois.find((c) => c.data_saida);
  if (saiuOutraVez) {
    return recusa(
      `Depois do retorno de ${dia(ciclo.data_retorno)} a máquina voltou a sair (${dia(saiuOutraVez.data_saida)}). ` +
        "Corrigir isto apagaria uma saída verdadeira — corrija à mão em Manutenção de ciclos."
    );
  }
  if (depois.length > 1) {
    return recusa(
      `Há ${depois.length} ciclos depois do retorno de ${dia(ciclo.data_retorno)} e não se sabe qual foi o do engano. ` +
        "Corrija à mão em Manutenção de ciclos."
    );
  }
  const doRetorno = depois[0] || null;
  if (doRetorno && quando(doRetorno) - retorno > FOLGA_RETORNO_MS) {
    return recusa(
      `O ciclo seguinte entrou a ${dia(doRetorno.data_entrada || doRetorno.created_date)}, muito depois do retorno: ` +
        "não parece ter sido aberto por ele. Corrija à mão em Manutenção de ciclos."
    );
  }

  explicacao.push(`O retorno de ${dia(ciclo.data_retorno)} é anulado: a máquina deixa de estar no pátio.`);
  if (doRetorno) {
    const cone = doRetorno.cone_numero
      ? `, cone ${[doRetorno.cone_cor, doRetorno.cone_numero].filter(Boolean).join(" ")}`
      : "";
    explicacao.push(`O ciclo que esse retorno abriu (${nomeEstado(doRetorno)}${cone}) é apagado, com os movimentos dele.`);
    if (doRetorno.watcher_os_id) {
      explicacao.push("Esse ciclo tem uma O.S. no Watcher: feche-a lá, que ela não fecha sozinha.");
    }
  }
  return {
    ok: true,
    de,
    para: novoTipo,
    atualizar,
    apagar: doRetorno,
    explicacao,
    nota: notaDaCorrecao(de, novoTipo, ciclo.data_retorno),
  };
}

/**
 * Grava uma correção planeada.
 *
 * Apaga primeiro e só depois muda o ciclo da saída. Se falhar a meio, repetir
 * volta a planear e acaba o que faltou; pela ordem inversa, a saída já
 * apareceria corrigida e o ciclo do retorno ficava no pátio sem caminho de
 * volta por aqui.
 */
export async function aplicarCorrecao(ciclo, plano, { autor } = {}) {
  if (!plano?.ok) throw new Error(plano?.motivo || "Correção inválida.");
  exigirRede("Corrigir a saída");

  let eventosApagados = 0;
  if (plano.apagar) {
    const eventos = await base44.entities.EventoCiclo.filter({ ciclo_id: plano.apagar.id });
    for (const ev of eventos) {
      await base44.entities.EventoCiclo.delete(ev.id);
      eventosApagados += 1;
    }
    await base44.entities.Ciclo.delete(plano.apagar.id);
  }

  await base44.entities.Ciclo.update(ciclo.id, plano.atualizar);
  await base44.entities.EventoCiclo.create({
    ciclo_id: ciclo.id,
    serie: ciclo.serie,
    de_estado: ciclo.estado,
    para_estado: plano.atualizar.estado,
    autor,
    nota: plano.nota,
  });

  return { cicloApagado: plano.apagar?.id || null, eventosApagados };
}
