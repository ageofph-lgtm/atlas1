/**
 * O que se grava no ciclo quando alguém reserva uma máquina.
 *
 * Está aqui, e não dentro do ecrã do inventário, por uma razão prática: são
 * regras com casos — quem assina, quando arranca o relógio das três semanas,
 * o que se limpa ao cancelar — e assim podem ser testadas sem se desenhar a
 * página toda.
 *
 * Quem assina a reserva:
 *  - um comercial reserva para si: fica o nome e o id dele, para lhe chegarem
 *    as notificações desta máquina;
 *  - a gestão reserva em nome de um comercial, escolhido no modal. Fica o
 *    **nome**, sem id — o comercial indicado pode nem ter conta na aplicação.
 *    «As minhas reservas» já procura por id *ou* nome, por isso encontra-as.
 *
 * O relógio (`reserva_criada_em`) só arranca quando a reserva nasce. Editar o
 * cliente, a data ou o comercial de uma reserva que já existe não o reinicia —
 * senão o prazo das três semanas recomeçava a cada correção e nunca expirava.
 */

/** `reserva_comercial` + `reserva_comercial_id` para esta reserva. */
export function responsavelDaReserva({ data, autor, currentUser }) {
  const escolhido = String(data?.reserva_comercial_nome || "").trim();
  // Só outro perfil escolhe por alguém; para um comercial, o campo nem aparece.
  const porOutro = currentUser?.perfil !== "comercial" && !!escolhido;

  if (porOutro) return { reserva_comercial: escolhido, reserva_comercial_id: "" };
  return { reserva_comercial: autor, reserva_comercial_id: currentUser?.id || "" };
}

/** Os campos do ciclo a atualizar com este `onSave` do modal de reserva. */
export function camposDeReserva({ data, ciclo, autor, currentUser }) {
  const campos = {
    reserva_cliente: data.reserva_cliente,
    reserva_data: data.reserva_data,
  };

  if (data.reserva_cliente) {
    Object.assign(campos, responsavelDaReserva({ data, autor, currentUser }));
    if (!ciclo?.reserva_cliente) campos.reserva_criada_em = new Date().toISOString();
  } else {
    campos.reserva_comercial = null;
    campos.reserva_comercial_id = "";
    campos.reserva_criada_em = null;
  }

  if (data.reserva_nota) campos.observacoes = data.reserva_nota;

  return campos;
}