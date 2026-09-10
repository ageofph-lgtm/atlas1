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
    canRelatorios: false,
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
    canRelatorios: false,
    canEditMaquina: false,
    canDeleteMaquina: false,
    canReservar: true,
    canEditReserva: true,
  },
  coordenador_comercial: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: false,
    canSaida: false,
    canRelatorios: false,
    canEditMaquina: false,
    canDeleteMaquina: false,
    canReservar: true,
    canEditReserva: true,
  },
  oficina: {
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

export const usePermissions = (userProfile) => {
  return useMemo(() => {
    if (!userProfile || !ATLAS_PERMISSIONS[userProfile]) {
      return ATLAS_PERMISSIONS.visitante;
    }
    return ATLAS_PERMISSIONS[userProfile];
  }, [userProfile]);
};