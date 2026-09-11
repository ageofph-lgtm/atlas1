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