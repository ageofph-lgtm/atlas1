
import { useMemo } from 'react';

const PERMISSIONS = {
  oficina: {
    // Kanban - pode ver tudo, mover apenas entre específicos
    canMoveOSCards: true,
    allowedOSStatuses: ['em-progresso', 'aguardando', 'concluido'], // Pode mover apenas entre estes
    canViewAllColumns: true, // Pode ver todas as colunas
    canAddObservations: true, // Pode adicionar observações
    
    // Ordens de Serviço - NÃO pode criar
    canCreateOS: false,
    canEditOS: false,
    canDeleteOS: false,
    
    // Máquinas - NÃO pode alterar dados
    canCreateMachine: false,
    canEditMachine: false,
    canDeleteMachine: false,
    canReserveMachine: false,
    canCancelReservation: false,
    canChangeMachineStatus: false,
    
    // Outros
    canAccessReports: true,
    canViewAll: true
  },
  
  comercial: {
    // Kanban - pode ver tudo, mas NÃO pode mexer
    canMoveOSCards: false,
    allowedOSStatuses: [],
    canViewAllColumns: true, // Pode ver todas as colunas
    
    // Ordens de Serviço - NÃO pode mexer
    canCreateOS: false,
    canEditOS: false,
    canDeleteOS: false,
    
    // Máquinas - pode apenas reservar
    canCreateMachine: false,
    canEditMachine: false,
    canDeleteMachine: false,
    canReserveMachine: true,
    canCancelReservation: false,
    canChangeMachineStatus: false,
    
    // Outros
    canAccessReports: true,
    canViewAll: true
  },
  
  logistica: {
    // Kanban - NÃO pode mexer
    canMoveOSCards: false,
    allowedOSStatuses: [],
    canViewAllColumns: true,
    
    // Ordens de Serviço - NÃO pode criar
    canCreateOS: false,
    canEditOS: false,
    canDeleteOS: false,
    
    // Máquinas - pode adicionar e alterar status
    canCreateMachine: true,
    canEditMachine: true, // Pode alterar estados mesmo após criadas
    canDeleteMachine: false,
    canReserveMachine: false,
    canCancelReservation: false,
    canChangeMachineStatus: true,
    allowedMachineStatuses: ['Disponível', 'Em Aluguer', 'Preparada', 'Em Manutenção'],
    
    // Outros
    canAccessReports: true,
    canViewAll: true
  },
  
  gestor_frota: {
    // Kanban - NÃO pode mexer
    canMoveOSCards: false,
    allowedOSStatuses: [],
    canViewAllColumns: true,
    
    // Ordens de Serviço - PODE criar e editar
    canCreateOS: true,
    canEditOS: true,
    canDeleteOS: false,
    
    // Máquinas - pode criar STS/UTS e alterar estados
    canCreateMachine: true,
    canEditMachine: true, // Pode alterar estados
    canDeleteMachine: false,
    canReserveMachine: false,
    canCancelReservation: false,
    canChangeMachineStatus: true,
    canManageOrigins: ['sts', 'uts'],
    
    // Outros
    canAccessReports: true,
    canViewAll: true
  },
  
  coordenador_comercial: {
    // Kanban - pode ver tudo, mover apenas entre a-fazer e priorizado
    canMoveOSCards: true,
    canSetPriorities: true,
    allowedOSStatuses: ['a-fazer', 'priorizado'],
    canViewAllColumns: true, // Pode ver todas as colunas
    
    // Ordens de Serviço - pode criar e editar
    canCreateOS: true,
    canEditOS: true,
    canDeleteOS: false,
    
    // Máquinas - pode adicionar e editar
    canCreateMachine: true,
    canEditMachine: true,
    canDeleteMachine: false,
    canReserveMachine: true,
    canCancelReservation: true,
    canChangeMachineStatus: true,
    canManageOrigins: ['nova', 'sts', 'uts'],
    
    // Outros
    canAccessReports: true,
    canViewAll: true
  },
  
  administrador: {
    // Controle total
    canMoveOSCards: true,
    canSetPriorities: true,
    canAddObservations: true,
    allowedOSStatuses: ['a-fazer', 'priorizado', 'em-progresso', 'aguardando', 'concluido'],
    canViewAllColumns: true,
    
    // Ordens de Serviço - controle total
    canCreateOS: true,
    canEditOS: true,
    canDeleteOS: true,
    
    // Máquinas - controle total
    canCreateMachine: true,
    canEditMachine: true,
    canDeleteMachine: true,
    canReserveMachine: true,
    canCancelReservation: true,
    canChangeMachineStatus: true,
    canManageOrigins: ['nova', 'sts', 'uts'],
    
    // Outros - controle total
    canAccessReports: true,
    canManageUsers: true,
    canAccessAudit: true,
    canViewAll: true
  }
};

export const usePermissions = (userProfile) => {
  const permissions = useMemo(() => {
    if (!userProfile || !PERMISSIONS[userProfile]) {
      return PERMISSIONS.oficina; // Default fallback
    }
    return PERMISSIONS[userProfile];
  }, [userProfile]);

  const hasPermission = (action) => {
    return permissions[action] || false;
  };

  const canAccessOSStatus = (status) => {
    return permissions.allowedOSStatuses?.includes(status) || false;
  };

  const canAccessMachineStatus = (status) => {
    return permissions.allowedMachineStatuses?.includes(status) || permissions.canChangeMachineStatus;
  };

  const canManageOrigin = (origin) => {
    return permissions.canManageOrigins?.includes(origin) || false;
  };

  return {
    ...permissions,
    hasPermission,
    canAccessOSStatus,
    canAccessMachineStatus,
    canManageOrigin
  };
};
