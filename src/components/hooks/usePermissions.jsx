import { useMemo } from 'react';

const ATLAS_PERMISSIONS = {
  administrador: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: true,
    canSaida: true,
    canRelatorios: true,
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

/**
 * Per-record edit gate for the Máquina entity.
 * administrador/gestor_frota → always; logística → only machines he registered;
 * everyone else → false. Used to wire every edit button to the owning record.
 */
export const canEditMaquinaRecord = (user, record) => {
  if (!user) return false;
  if (['administrador', 'gestor_frota'].includes(user.perfil)) return true;
  if (user.perfil === 'logistica') return record?.created_by_id === user.id;
  return false;
};

export const usePermissions = (userProfile) => {
  return useMemo(() => {
    if (!userProfile || !ATLAS_PERMISSIONS[userProfile]) {
      return ATLAS_PERMISSIONS.visitante;
    }
    return ATLAS_PERMISSIONS[userProfile];
  }, [userProfile]);
};