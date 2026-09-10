import { useMemo } from 'react';

const ATLAS_PERMISSIONS = {
  logistica: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: false,
    canSaida: true,
  },
  comercial: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: false,
    canSaida: false,
  },
  gestor_frota: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: true,
    canSaida: false,
  },
  oficina: {
    canEntrada: false,
    canInventario: true,
    canAutorizacao: false,
    canSaida: false,
  },
  coordenador_comercial: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: true,
    canSaida: true,
  },
  administrador: {
    canEntrada: true,
    canInventario: true,
    canAutorizacao: true,
    canSaida: true,
  },
};

export const usePermissions = (userProfile) => {
  return useMemo(() => {
    if (!userProfile || !ATLAS_PERMISSIONS[userProfile]) {
      return ATLAS_PERMISSIONS.oficina;
    }
    return ATLAS_PERMISSIONS[userProfile];
  }, [userProfile]);
};