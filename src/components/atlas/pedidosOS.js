import { base44 } from "@/api/base44Client";
import { notificarRespostaPedido } from "@/components/atlas/mensagens";

/** Pedidos que ainda podem ir para a oficina. Os fechados já não se mexem. */
export const PEDIDO_ESTADOS_POR_FAZER = ["aberto", "em_execucao"];

/**
 * Como o pedido aparece na O.S. do Watcher.
 *
 * Leva o nome do comercial atrás: na oficina, quando a tarefa levanta uma
 * dúvida, saber a quem perguntar vale mais do que a descrição em si.
 */
export const textoTarefaDoPedido = (pedido) =>
  pedido?.comercial ? `${pedido.texto} (${pedido.comercial})` : pedido?.texto || "";

/**
 * Fecha o circuito depois de a máquina ser autorizada: o que o comercial pediu
 * está agora dentro da O.S., por isso o pedido passa a "em curso" e ele é
 * avisado — sem isto o pedido ficava eternamente "aberto" no card, com a
 * oficina já a executá-lo.
 *
 * Falha em silêncio por pedido, de propósito: a autorização já foi feita no
 * Watcher e não se desfaz por uma notificação que não saiu.
 */
export async function marcarPedidosNaOS(pedidos, { autor, osId = "" } = {}) {
  if (!pedidos?.length) return 0;
  const resposta = osId ? `Passou à oficina na O.S. ${osId}.` : "Passou à oficina com a autorização da máquina.";
  let feitos = 0;
  for (const pedido of pedidos) {
    try {
      await base44.entities.PedidoMaquina.update(pedido.id, {
        estado: "em_execucao",
        resposta,
        respondido_por: autor,
      });
      feitos += 1;
    } catch (_e) {
      continue; // se não gravou, não anunciamos ao comercial que foi
    }
    await notificarRespostaPedido(pedido, { autor, resposta, estado: "em_execucao" });
  }
  return feitos;
}
