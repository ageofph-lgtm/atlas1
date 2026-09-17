import { base44 } from "@/api/base44Client";
import { CATEGORIA_CONFIG, ESTADO_CONFIG } from "@/components/atlas/constants";

/**
 * Caixa de mensagens do ATLAS.
 *
 * As mensagens são endereçadas a uma AUDIÊNCIA, não a um perfil: "gestão"
 * abrange o gestor de frota e o administrador, que têm de ver o mesmo. Para os
 * comerciais é diferente — cada um só pode ver o que diz respeito às máquinas
 * que reservou ou pediu —, por isso essas vão para um utilizador concreto.
 */
export const AUDIENCIAS = { LOGISTICA: "logistica", GESTAO: "gestao", COMERCIAL: "comercial" };

/** Audiências que cada perfil lê. O administrador vê tudo o que é operacional. */
export const audienciasDoPerfil = (perfil) => {
  switch (perfil) {
    case "logistica": return [AUDIENCIAS.LOGISTICA];
    case "gestor_frota": return [AUDIENCIAS.GESTAO];
    case "administrador": return [AUDIENCIAS.GESTAO, AUDIENCIAS.LOGISTICA];
    case "comercial": return [AUDIENCIAS.COMERCIAL];
    default: return [];
  }
};

export const podeUsarMensagens = (perfil) => audienciasDoPerfil(perfil).length > 0;

const rotuloEstado = (estado) => ESTADO_CONFIG[estado]?.label || estado || "—";
const rotuloCategoria = (cat) => CATEGORIA_CONFIG[cat]?.label || (cat || "—").toUpperCase();

/**
 * Grava uma mensagem. Falha em silêncio de propósito: uma notificação que não
 * saiu não pode fazer cair o registo de entrada, a saída ou a reserva que
 * estavam mesmo a ser feitos.
 */
export async function enviarMensagem({ destino = "", destinoUserId = "", titulo, corpo = "", tipo = "aviso", serie = "", cicloId = "", autor = "" }) {
  if (!titulo) return null;
  try {
    return await base44.entities.Mensagem.create({
      destino,
      destino_user_id: destinoUserId,
      titulo,
      corpo,
      tipo,
      serie,
      ciclo_id: cicloId,
      autor,
      lida_por: [],
    });
  } catch (_e) {
    return null;
  }
}

const enviarVarias = (mensagens) => Promise.all(mensagens.map(enviarMensagem));

/**
 * Comerciais com interesse nesta máquina: quem a reservou e quem lhe fez
 * pedidos. São eles que têm de saber quando ela entra em manutenção e quando
 * fica pronta. Devolve IDs únicos.
 */
export async function comerciaisInteressados(ciclo) {
  const ids = new Set();
  if (ciclo?.reserva_comercial_id) ids.add(ciclo.reserva_comercial_id);
  if (ciclo?.id) {
    try {
      const pedidos = await base44.entities.PedidoMaquina.filter({ ciclo_id: ciclo.id });
      pedidos.forEach((p) => p.comercial_user_id && ids.add(p.comercial_user_id));
    } catch (_e) {
      // sem pedidos legíveis — a reserva sozinha continua a valer
    }
  }
  return [...ids];
}

// ── Logística ────────────────────────────────────────────────────────────────

/** Entrada de máquina no pátio → a gestão fica a saber. */
export const notificarEntrada = (ciclo, { autor, reentrada = false }) =>
  enviarMensagem({
    destino: AUDIENCIAS.GESTAO,
    tipo: "entrada",
    titulo: `${reentrada ? "Reentrada" : "Entrada"} — ${ciclo.serie}`,
    corpo: `${rotuloCategoria(ciclo.categoria)}${ciclo.cone_numero ? ` · cone ${ciclo.cone_cor} ${ciclo.cone_numero}` : ""}. Registada pela logística.`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });

/** Saída para aluguer ou venda → a gestão fica a saber. */
export const notificarSaida = (ciclo, { autor, tipoSaida = "alugada", cliente = "" }) =>
  enviarMensagem({
    destino: AUDIENCIAS.GESTAO,
    tipo: "saida",
    titulo: `${tipoSaida === "vendida" ? "Venda" : "Saída"} — ${ciclo.serie}`,
    corpo: `${tipoSaida === "vendida" ? "Vendida" : "Saiu para aluguer"}${cliente ? ` a ${cliente}` : ""}. Registada pela logística.`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });

/** Retorno de aluguer → a gestão fica a saber. */
export const notificarRetorno = (ciclo, { autor, dias }) =>
  enviarMensagem({
    destino: AUDIENCIAS.GESTAO,
    tipo: "entrada",
    titulo: `Retorno — ${ciclo.serie}`,
    corpo: `Voltou ao pátio${dias != null ? ` após ${dias} dias de aluguer` : ""}. Registado pela logística.`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });

// ── Oficina / gestão ─────────────────────────────────────────────────────────

/**
 * Máquina pronta. A logística precisa de saber que pode contar com ela, a
 * gestão que o trabalho fechou, e os comerciais que estavam à espera dela.
 */
export async function notificarPronta(ciclo, { autor }) {
  const interessados = await comerciaisInteressados(ciclo);
  const corpo = `A máquina ${ciclo.serie} mudou de estado para PRONTA.`;
  await enviarVarias([
    { destino: AUDIENCIAS.LOGISTICA, tipo: "estado", titulo: `Máquina pronta — ${ciclo.serie}`, corpo, serie: ciclo.serie, cicloId: ciclo.id, autor },
    { destino: AUDIENCIAS.GESTAO, tipo: "estado", titulo: `Máquina pronta — ${ciclo.serie}`, corpo, serie: ciclo.serie, cicloId: ciclo.id, autor },
    ...interessados.map((id) => ({
      destinoUserId: id,
      tipo: "estado",
      titulo: `A sua máquina está pronta — ${ciclo.serie}`,
      corpo: `${ciclo.serie} concluiu a preparação e está disponível.`,
      serie: ciclo.serie,
      cicloId: ciclo.id,
      autor,
    })),
  ]);
}

/** Máquina entrou em manutenção: interessa à gestão e a quem está à espera dela. */
export async function notificarManutencao(ciclo, { autor }) {
  const interessados = await comerciaisInteressados(ciclo);
  await enviarVarias([
    {
      destino: AUDIENCIAS.GESTAO,
      tipo: "estado",
      titulo: `Em manutenção — ${ciclo.serie}`,
      corpo: `A oficina começou a trabalhar em ${ciclo.serie}.`,
      serie: ciclo.serie,
      cicloId: ciclo.id,
      autor,
    },
    ...interessados.map((id) => ({
      destinoUserId: id,
      tipo: "estado",
      titulo: `A sua máquina entrou em manutenção — ${ciclo.serie}`,
      corpo: `${ciclo.serie} está a ser preparada na oficina.`,
      serie: ciclo.serie,
      cicloId: ciclo.id,
      autor,
    })),
  ]);
}

/** Gestão mexeu na classificação ou no estado → a logística tem de saber. */
export function notificarMudancaGestao(ciclo, { autor, categoriaAnterior, categoriaNova, estadoAnterior, estadoNovo }) {
  const partes = [];
  if (categoriaNova && categoriaNova !== categoriaAnterior) {
    partes.push(`de ${rotuloCategoria(categoriaAnterior)} para ${rotuloCategoria(categoriaNova)}`);
  }
  if (estadoNovo && estadoNovo !== estadoAnterior) {
    partes.push(`de ${rotuloEstado(estadoAnterior)} para ${rotuloEstado(estadoNovo)}`);
  }
  if (partes.length === 0) return Promise.resolve(null);
  return enviarMensagem({
    destino: AUDIENCIAS.LOGISTICA,
    tipo: categoriaNova && categoriaNova !== categoriaAnterior ? "categoria" : "estado",
    titulo: `Alteração da gestão — ${ciclo.serie}`,
    corpo: `A gestão mudou a máquina ${ciclo.serie} ${partes.join(" e ")}.`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });
}

// ── Comerciais ───────────────────────────────────────────────────────────────

/** Reserva feita por um comercial → chega à gestão. */
export const notificarReserva = (ciclo, { autor, cliente, data, cancelada = false }) =>
  enviarMensagem({
    destino: AUDIENCIAS.GESTAO,
    tipo: "reserva",
    titulo: `${cancelada ? "Reserva cancelada" : "Reserva"} — ${ciclo.serie}`,
    corpo: cancelada
      ? `${autor} cancelou a reserva de ${ciclo.serie}.`
      : `${autor} reservou ${ciclo.serie}${cliente ? ` para ${cliente}` : ""}${data ? ` · saída prevista ${data}` : ""}.`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });

/** Pedido específico numa máquina → chega à gestão, que repassa à oficina. */
export const notificarPedido = (ciclo, { autor, texto }) =>
  enviarMensagem({
    destino: AUDIENCIAS.GESTAO,
    tipo: "pedido",
    titulo: `Pedido do comercial — ${ciclo.serie}`,
    corpo: `${autor} pediu para ${ciclo.serie}: "${texto}"`,
    serie: ciclo.serie,
    cicloId: ciclo.id,
    autor,
  });

/** Resposta da gestão a um pedido → volta ao comercial que o fez. */
export const notificarRespostaPedido = (pedido, { autor, resposta, estado }) =>
  enviarMensagem({
    destinoUserId: pedido.comercial_user_id,
    tipo: "pedido",
    titulo: `Resposta ao seu pedido — ${pedido.serie}`,
    corpo: `"${pedido.texto}" → ${estado === "concluido" ? "concluído" : estado}${resposta ? `. ${resposta}` : ""}`,
    serie: pedido.serie,
    cicloId: pedido.ciclo_id,
    autor,
  });
