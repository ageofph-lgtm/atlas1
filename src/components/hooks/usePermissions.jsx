import { useMemo } from 'react';

const ATLAS_PERMISSIONS = {
  administrador: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: true,
    canSaida: true,
    canRelatorios: true,
    canMinhaArea: true,
    canEditMaquina: true,
    canDeleteMaquina: true,
    canReservar: true,
    canEditReserva: true,
    canNotas: true,
    canPedidos: true,
    canResponderPedidos: true,
    canApagarPedidos: true,
  },
  gestor_frota: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: true,
    canSaida: false,
    canRelatorios: true,
    canMinhaArea: false,
    canEditMaquina: true,
    canDeleteMaquina: true,
    canReservar: false,
    canEditReserva: false,
    canNotas: true,
    canPedidos: false,
    canResponderPedidos: true,
    canApagarPedidos: false,
  },
  logistica: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: false,
    canSaida: true,
    canRelatorios: true,
    canMinhaArea: false,
    canEditMaquina: true,
    canDeleteMaquina: false,
    canReservar: false,
    canEditReserva: false,
    canNotas: true,
    canPedidos: false,
    canResponderPedidos: false,
    canApagarPedidos: false,
  },
  comercial: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: false,
    canSaida: false,
    canRelatorios: true,
    canMinhaArea: true,
    canEditMaquina: false,
    canDeleteMaquina: false,
    canReservar: true,
    canEditReserva: true,
    canNotas: true,
    canPedidos: true,
    canResponderPedidos: false,
    canApagarPedidos: false,
  },
  visitante: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: false,
    canSaida: false,
    canRelatorios: false,
    canMinhaArea: false,
    canEditMaquina: false,
    canDeleteMaquina: false,
    canReservar: false,
    canEditReserva: false,
    canNotas: false,
    canPedidos: false,
    canResponderPedidos: false,
    canApagarPedidos: false,
  },
};

/** Quem edita a ficha de uma máquina: gestão, logística e administração. */
const PERFIS_QUE_EDITAM = ['administrador', 'gestor_frota', 'logistica'];

/**
 * Se esta pessoa pode abrir a ficha de uma máquina para a editar.
 *
 * A logística podia editar apenas as máquinas que tinha registado
 * (`record.created_by_id === user.id`). A regra fazia sentido quando cada um
 * registava as suas, mas na prática deixou-a sem poder corrigir quase nada:
 * quem regista a máquina raramente é quem lhe mexe depois, e a entrada por
 * email trocou os identificadores antigos — os registos criados nas sessões
 * anónimas de antes não pertencem a ninguém que hoje entre na aplicação.
 *
 * Quem anda no pátio é quem vê a máquina. Prender a correção a quem a
 * registou obrigava a pedir favores para mudar um mastro mal apontado.
 */
export const canEditMaquinaRecord = (user) => PERFIS_QUE_EDITAM.includes(user?.perfil);

/**
 * Se pode mudar a categoria — que decide o cone e o caminho da máquina.
 *
 * A logística já a escolhe no registo, no passo da classificação. Deixá-la
 * escolher uma vez e nunca mais corrigir era a incoerência que sobrava.
 */
export const podeEditarCategoria = (user) => PERFIS_QUE_EDITAM.includes(user?.perfil);

/**
 * Se pode mudar o estado desta máquina, e até onde.
 *
 * O administrador mexe em todos, porque é ele que corrige registos. A gestão e
 * a logística mexem dentro do circuito da oficina — classificada, manutenção,
 * pronta. Fora dele o estado não é deles para mudar: `autorizada` e
 * `em_execucao` pertencem ao Watcher e o sync sobrepõe-se a qualquer alteração
 * feita aqui, e `em_aluguer`, `retorno` e `fechado` saem dos ecrãs de saída e
 * retorno, onde ficam registados com data e fotografia.
 */
export const podeEditarEstado = (user, ciclo, podeGerirOficina) => {
  if (user?.perfil === 'administrador') return true;
  if (!['gestor_frota', 'logistica'].includes(user?.perfil)) return false;
  return podeGerirOficina(ciclo);
};

export const usePermissions = (userProfile) => {
  return useMemo(() => {
    if (!userProfile || !ATLAS_PERMISSIONS[userProfile]) {
      return ATLAS_PERMISSIONS.visitante;
    }
    return ATLAS_PERMISSIONS[userProfile];
  }, [userProfile]);
};