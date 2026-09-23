import { estadoEfetivo, isVenda, isAluguer, isHistorico } from "@/components/atlas/cicloUtils";

/**
 * O que é de cada comercial: as suas reservas, os seus pedidos e as suas contas.
 *
 * Saber de quem é um registo custa mais do que devia, por razões históricas. Até
 * à entrada por email, o "comercial" de uma reserva era o `full_name` da sessão
 * — que vinha da senha escrita no ecrã antigo ("2Carlos" dava "Carlos") — e o
 * `id` era o da sessão anónima, diferente a cada aparelho. Nada disso aponta
 * para a mesma pessoa que entra hoje.
 *
 * Por isso a correspondência é por **id ou nome**: o id apanha o que for criado
 * de agora em diante, o nome recupera parte do que já lá está. Numa lista de
 * oito pessoas com nomes distintos, o nome não gera enganos; num universo maior
 * geraria, e esta função teria de mudar.
 */

const normalizar = (v) => String(v ?? "").trim().toLowerCase();

/** Se um par (id, nome) gravado num registo corresponde a esta pessoa. */
export function eDe(registo, pessoa, campos) {
  if (!pessoa) return false;
  const { id: campoId, nome: campoNome } = campos;
  const id = normalizar(registo?.[campoId]);
  const nome = normalizar(registo?.[campoNome]);
  // Um registo sem dono nenhum não é de ninguém — não pode cair para o primeiro
  // que pergunte, que é o que aconteceria se comparássemos vazio com vazio.
  if (!id && !nome) return false;
  return (!!id && id === normalizar(pessoa.id)) || (!!nome && nome === normalizar(pessoa.full_name));
}

export const eMinhaReserva = (ciclo, pessoa) =>
  eDe(ciclo, pessoa, { id: "reserva_comercial_id", nome: "reserva_comercial" });

export const eMeuPedido = (pedido, pessoa) =>
  eDe(pedido, pessoa, { id: "comercial_user_id", nome: "comercial" });

/**
 * As reservas desta pessoa que ainda estão de pé.
 *
 * "De pé" separa dois casos que parecem o mesmo e não são. Uma máquina **em
 * aluguer** continua a ser a reserva dela: o ciclo está aberto, a máquina volta,
 * e é dela que o comercial tem de se lembrar. Uma máquina **vendida** fechou o
 * ciclo — acabou, e contá-la aqui inflacionava a lista com trabalho que já não
 * existe. A distinção já está no `isHistorico`, que é o que decide isto em todo
 * o resto da aplicação.
 *
 * O que termina uma reserva é apagar o cliente, ou a venda. Não é a saída.
 */
export function minhasReservas(ciclos = [], pessoa) {
  return ciclos
    .filter((c) => c.reserva_cliente && !isHistorico(c) && eMinhaReserva(c, pessoa))
    .map((c) => ({ ciclo: c, estado: estadoEfetivo(c) }))
    .sort(ordenarPorData);
}

/** Da mais recente para a mais antiga, com as sem data no fim. */
const ordenarPorData = (a, b) => {
  const ta = new Date(a.ciclo?.reserva_data || a.ciclo?.updated_date || 0).getTime();
  const tb = new Date(b.ciclo?.reserva_data || b.ciclo?.updated_date || 0).getTime();
  return tb - ta;
};

export const meusPedidos = (pedidos = [], pessoa) =>
  pedidos
    .filter((p) => eMeuPedido(p, pessoa))
    .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));

/** Quantos pedidos em cada estado, para o resumo no topo. */
export function contarPorEstado(pedidos = []) {
  const contagem = { aberto: 0, em_execucao: 0, concluido: 0, cancelado: 0 };
  for (const p of pedidos) {
    const e = p.estado || "aberto";
    if (e in contagem) contagem[e] += 1;
  }
  return contagem;
}

/** `null` em `desde` significa "desde sempre". */
const dentroDoPeriodo = (data, desde) => {
  if (!data) return false;
  if (!desde) return true;
  return new Date(data).getTime() >= new Date(desde).getTime();
};

/**
 * Quantas saíram por esta pessoa, no período.
 *
 * **O que este número não pode ser lido como sendo:** o total de saídas da
 * empresa. Uma máquina só se consegue atribuir a um comercial quando passou por
 * uma reserva dele — é o único sítio onde o nome fica agarrado ao ciclo. Uma
 * venda direta, sem reserva, não tem comercial nenhum e não entra na conta de
 * ninguém.
 *
 * Por isso devolve-se também `semComercial`: quem vir "2 vendas" e souber que
 * houve 5 saídas percebe onde está a diferença. Um total que esconde o que não
 * conseguiu contar é pior do que não haver total.
 */
export function kpisComercial(ciclos = [], pessoa, { desde = null } = {}) {
  const saidas = ciclos.filter((c) => c.tipo_saida && dentroDoPeriodo(c.data_saida, desde));
  const minhas = saidas.filter((c) => eMinhaReserva(c, pessoa));
  const semComercial = saidas.filter((c) => !c.reserva_comercial && !c.reserva_comercial_id);

  const alugadas = minhas.filter(isAluguer);
  const vendidas = minhas.filter(isVenda);

  return {
    alugadas: alugadas.length,
    vendidas: vendidas.length,
    total: minhas.length,
    saidasNoPeriodo: saidas.length,
    semComercial: semComercial.length,
    listas: { alugadas, vendidas },
  };
}

/** Os períodos do seletor. `null` é "desde sempre". */
export const PERIODOS = [
  { chave: 30, label: "30 dias" },
  { chave: 90, label: "90 dias" },
  { chave: 365, label: "12 meses" },
  { chave: null, label: "Tudo" },
];

export const inicioDoPeriodo = (dias, agora = Date.now()) =>
  dias == null ? null : new Date(agora - dias * 86400000).toISOString();

/**
 * O estado que um pedido tem mesmo, e não o que ficou gravado.
 *
 * O estado do pedido é uma cópia do andamento da máquina, e as cópias soltam-se.
 * Durante meses nada fechava um pedido quando a oficina acabava o trabalho, por
 * isso há pedidos gravados como "em curso" em máquinas que já foram preparadas,
 * alugadas e devolvidas. Fechar o circuito daqui para a frente não arruma o que
 * ficou para trás.
 *
 * A regra: se a máquina ficou pronta **depois** de o pedido ser feito, o pedido
 * foi feito. O "depois" não é um pormenor — um pedido novo numa máquina que já
 * estava pronta ainda está por fazer, e dá-lo por concluído seria trocar uma
 * mentira por outra.
 *
 * Só se aplica ao que estava por fazer: cancelado fica cancelado.
 */
export function estadoEfetivoPedido(pedido, ciclo) {
  const estado = pedido?.estado || "aberto";
  if (estado === "concluido" || estado === "cancelado") return estado;
  if (!ciclo?.data_pronta || !pedido?.created_date) return estado;

  const pronta = new Date(ciclo.data_pronta).getTime();
  const feito = new Date(pedido.created_date).getTime();
  if (!Number.isFinite(pronta) || !Number.isFinite(feito)) return estado;

  return pronta > feito ? "concluido" : estado;
}

/**
 * Junta cada pedido à sua máquina.
 *
 * A ligação é pelo `ciclo_id` e só por ele. A série seria tentador — está
 * gravada no pedido — mas uma máquina que entra, sai e volta tem vários ciclos
 * com a mesma série, e o pedido iria parar ao ciclo errado.
 */
export function pedidosComEstado(pedidos = [], ciclos = []) {
  const porId = new Map(ciclos.map((c) => [c.id, c]));
  return pedidos.map((pedido) => {
    const ciclo = porId.get(pedido.ciclo_id) || null;
    const estado = estadoEfetivoPedido(pedido, ciclo);
    return {
      pedido,
      ciclo,
      estado,
      // `derivado` marca os que estão concluídos por dedução e não por alguém o
      // ter gravado. Interessa ao ecrã: nesses, a última resposta da gestão
      // ainda diz "passou à oficina", e sem uma palavra a explicar parece que o
      // estado e a mensagem se contradizem.
      derivado: estado !== (pedido.estado || "aberto"),
      estadoMaquina: ciclo ? estadoEfetivo(ciclo) : null,
    };
  });
}
