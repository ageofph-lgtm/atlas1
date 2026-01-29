import React, { useState, useEffect, useCallback } from "react";
import { OrdemServico, Notificacao, FrotaACP } from "@/entities/all";
import { Plus, AlertCircle, Clock, CheckCircle2, AlertTriangle, Search, Truck, Star, Settings, Wrench } from "lucide-react";
import { User } from "@/entities/User";
import { usePermissions } from "@/components/hooks/usePermissions";

import KanbanBoard from "../components/dashboard/KanbanBoard";
import CalendarView from "../components/dashboard/CalendarView";
import CreateOSModal from "../components/dashboard/CreateOSModal";
import OSDetailsModal from "../components/dashboard/OSDetailsModal";

// Kanban Columns Configuration
const KANBAN_COLUMNS = {
  'a-fazer': {
    title: 'A FAZER',
    color: 'text-gray-600',
    icon: Clock,
    bgColor: 'bg-gray-100'
  },
  'priorizado': {
    title: 'PRIORIZADO',
    color: 'text-blue-600',
    icon: AlertTriangle,
    bgColor: 'bg-blue-100'
  },
  'em-progresso': {
    title: 'EM PROGRESSO',
    color: 'text-yellow-600',
    icon: Settings,
    bgColor: 'bg-yellow-100'
  },
  'aguardando': {
    title: 'AGUARDANDO PEÇAS OU INFO',
    color: 'text-orange-600',
    icon: AlertCircle,
    bgColor: 'bg-orange-100'
  },
  'concluido': {
    title: 'CONCLUÍDO',
    color: 'text-green-600',
    icon: CheckCircle2,
    bgColor: 'bg-green-100'
  }
};

// Machine Status Configuration
const MACHINE_STATUS_CONFIG = {
  'Disponível': {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle2
  },
  'Reservada': {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock
  },
  'Em Aluguer': {
    color: 'bg-purple-100 text-purple-800',
    icon: Truck
  },
  'Em Manutenção': {
    color: 'bg-red-100 text-red-800',
    icon: Wrench
  },
  'Preparada': {
    color: 'bg-blue-100 text-blue-800',
    icon: Star
  }
};

export default function Dashboard() {
  const [ordensServico, setOrdensServico] = useState([]);
  const [filteredOrdens, setFilteredOrdens] = useState([]);
  const [machines, setMachines] = useState([]);
  const [machineStats, setMachineStats] = useState({});
  const [selectedOS, setSelectedOS] = useState(null);
  const [editingOS, setEditingOS] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [prefillData, setPrefillData] = useState(null);
  const [stats, setStats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState('kanban');
  const [currentUser, setCurrentUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  const userPermissions = usePermissions(currentUser?.perfil);

  const loadOrdensServico = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const ordens = await OrdemServico.filter({}, '-created_date');
      setOrdensServico(ordens);

      const newStats = Object.keys(KANBAN_COLUMNS).reduce((acc, status) => {
        acc[status] = ordens.filter((os) => os.status === status || (!os.status && status === 'a-fazer')).length;
        return acc;
      }, {});
      setStats(newStats);

    } catch (error) {
      console.error("Erro ao carregar ordens:", error);
    }

    if (isManualRefresh) {
      setRefreshing(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadMachines = useCallback(async () => {
    try {
      const machinesData = await FrotaACP.list();
      setMachines(machinesData);
      
      // Calculate machine statistics
      const stats = Object.keys(MACHINE_STATUS_CONFIG).reduce((acc, status) => {
        acc[status] = machinesData.filter(m => m.estado === status).length;
        return acc;
      }, {});
      setMachineStats(stats);

    } catch (error) {
      console.error("Erro ao carregar máquinas:", error);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    try {
      const user = await User.me();
      setCurrentUser(user);
    } catch (e) {
      console.error("Utilizador não autenticado", e);
      setCurrentUser(null);
    }
    await Promise.all([loadOrdensServico(), loadMachines()]);
  }, [loadOrdensServico, loadMachines]);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(() => {
      loadOrdensServico();
      loadMachines();
    }, 1200000);
    return () => clearInterval(interval);
  }, [loadInitialData, loadOrdensServico, loadMachines]);

  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isPulling = window.scrollY === 0;
    };

    const handleTouchMove = (e) => {
      if (!isPulling || refreshing) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startY;

      if (diffY > 100) {
        e.preventDefault();
        setRefreshing(true);
        loadOrdensServico(true);
        isPulling = false;
      }
    };

    const handleTouchEnd = () => {
      isPulling = false;
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [loadOrdensServico, refreshing]);

  const filterOrdens = useCallback(() => {
    if (!searchQuery) {
      setFilteredOrdens(ordensServico);
      return;
    }

    const filtered = ordensServico.filter(os =>
      os.modelo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.serie?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.cliente?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredOrdens(filtered);
  }, [ordensServico, searchQuery]);

  useEffect(() => {
    filterOrdens();
  }, [filterOrdens]);

  const handleUpdateOS = async (osData) => {
    try {
      const historyAction = 'O.S. atualizada';
      const historyDetails = `Dados da O.S. para ${osData.modelo} foram atualizados.`;

      const newHistoricoEntry = {
        acao: historyAction,
        data: new Date().toISOString(),
        usuario: currentUser?.full_name || 'Sistema',
        detalhes: historyDetails
      };

      const existingOs = await OrdemServico.get(editingOS.id);
      const updatedHistorico = [...(existingOs.historico || []), newHistoricoEntry];
      await OrdemServico.update(editingOS.id, { ...osData, historico: updatedHistorico });

      await loadOrdensServico();
      setShowCreateModal(false);
      setEditingOS(null);
      setPrefillData(null);
    } catch (error) {
      console.error("Erro ao guardar ordem:", error);
    }
  };

  const handleStatusChange = async (osId, newStatus) => {
    const originalOrdens = [...ordensServico];
    const osToUpdate = originalOrdens.find(o => o.id === osId);
    
    if (!osToUpdate) return;

    // 1. Optimistic UI Update: Update the state immediately for a fast user experience.
    setOrdensServico(prevOrdens => 
      prevOrdens.map(os => 
        os.id === osId ? { ...os, status: newStatus } : os
      )
    );

    try {
      // 2. Perform background API calls.
      const newHistorico = [...(osToUpdate.historico || []), {
        acao: `Status alterado para ${KANBAN_COLUMNS[newStatus].title}`,
        data: new Date().toISOString(),
        usuario: currentUser?.full_name || 'Sistema',
        detalhes: `O.S. movida para coluna '${KANBAN_COLUMNS[newStatus].title}'`
      }];

      const updateData = { 
        status: newStatus, 
        historico: newHistorico,
        ...(newStatus === 'concluido' && { dataConlusao: new Date().toISOString() })
      };

      await OrdemServico.update(osId, updateData);

      if (osToUpdate.acpMachineId) {
        let newMachineState = null;
        if (newStatus === 'concluido') {
          newMachineState = 'Preparada';
        } else if (['a-fazer', 'priorizado', 'em-progresso', 'aguardando'].includes(newStatus)) {
          newMachineState = 'Em Manutenção';
        }

        if (newMachineState) {
          await FrotaACP.update(osToUpdate.acpMachineId, { estado: newMachineState });
        }
      }

      await Notificacao.create({
        userId: 'all',
        message: newStatus === 'concluido' 
          ? `O.S. ${osToUpdate.modelo} foi concluída`
          : `O.S. ${osToUpdate.modelo} movida para '${KANBAN_COLUMNS[newStatus].title}'`,
        osId: osId,
        type: newStatus === 'concluido' ? 'completed' : 'status_change'
      });

      // 3. (Optional) Final sync with server after a short delay.
      // This ensures any server-side changes are reflected.
      setTimeout(() => {
        loadOrdensServico();
        loadMachines();
      }, 500);

    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      // 4. Revert UI on error.
      setOrdensServico(originalOrdens);
    }
  };

  const handleEditOS = (os) => {
    setEditingOS(os);
    setPrefillData(os);
    setShowCreateModal(true);
  };

  const handleDeleteOS = async (osId) => {
    try {
      await OrdemServico.delete(osId);
      await loadOrdensServico();
    } catch (error) {
      console.error("Erro ao eliminar ordem:", error);
    }
  };

  const handleManualRefresh = () => {
    loadOrdensServico(true);
    loadMachines();
  };

  return (
    <div className="space-y-6">
      <style>{`
        .kanban-card-clip {
          clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%);
        }
      `}</style>

      {refreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-center py-2 px-6 angled-clip shadow-lg">
          <p className="font-semibold animate-pulse">Atualizando ordens de serviço...</p>
        </div>
      )}

      {/* Header with OS Status Indicators */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          {/* OS Status Indicators */}
          <div className="flex flex-wrap items-center gap-3">
            {Object.entries(KANBAN_COLUMNS).map(([status, config]) => {
              const count = stats[status] || 0;
              const Icon = config.icon;
              
              return (
                <div
                  key={status}
                  className="flex items-center gap-2 px-4 py-2 
                             bg-white/60 backdrop-blur-md border border-white/40 
                             rounded-lg angled-clip transition-all duration-200 
                             hover:bg-white/80"
                >
                  <Icon className={`w-4 h-4 ${config.color}`} />
                  <span className="text-sm font-medium text-gray-700">{config.title}</span>
                  <span className="ml-1 px-2 py-0.5 rounded text-xs font-bold bg-white/60 text-gray-800">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {/* Search Toggle Button */}
          <button
            onClick={() => setShowSearchBar(!showSearchBar)}
            className="h-12 w-12 bg-white/60 backdrop-blur-md border border-white/40 angled-clip hover:bg-white/80 transition-all duration-200 flex items-center justify-center"
          >
            <Search className="w-5 h-5 text-gray-600" />
          </button>

          {userPermissions?.canCreateOS && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="h-12 px-6 bg-red-600 hover:bg-red-700 text-white angled-clip shadow-md font-semibold flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              <span>Nova O.S.</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Search Bar */}
      {showSearchBar && (
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            placeholder="Pesquisar por modelo, série ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 h-12 text-base angled-clip bg-white/80 backdrop-blur-md border border-white/40 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setShowSearchBar(false);
              setSearchQuery('');
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
        </div>
      )}
      
      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView('kanban')}
          className={`h-10 px-6 font-semibold text-sm transition-all angled-clip ${
            activeView === 'kanban'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-200'
          }`}
        >
          Vista Kanban
        </button>
        <button
          onClick={() => setActiveView('calendar')}
          className={`h-10 px-6 font-semibold text-sm transition-all angled-clip ${
            activeView === 'calendar'
              ? 'bg-gray-800 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-200'
          }`}
        >
          Vista Calendário
        </button>
      </div>
            
      {/* Main Content */}
      {activeView === 'kanban' && (
        <KanbanBoard
          ordensServico={filteredOrdens}
          onStatusChange={handleStatusChange}
          onOpenDetails={(os) => { setSelectedOS(os); setShowDetailsModal(true); }}
          onEditOS={handleEditOS}
          onDeleteOS={handleDeleteOS}
          isLoading={isLoading}
          columns={KANBAN_COLUMNS}
          userPermissions={userPermissions}
          onUpdate={loadOrdensServico} 
        />
      )}
      {activeView === 'calendar' && (
        <CalendarView
          ordensServico={filteredOrdens}
          onOpenDetails={(os) => { setSelectedOS(os); setShowDetailsModal(true); }}
          isLoading={isLoading}
        />
      )}

      {/* Modals */}
      <CreateOSModal
        isOpen={showCreateModal}
        onClose={() => { setShowCreateModal(false); setEditingOS(null); setPrefillData(null); }}
        onSubmit={handleUpdateOS}
        editingOS={editingOS}
        prefillData={prefillData}
      />
      <OSDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        os={selectedOS}
        onUpdate={loadOrdensServico}
      />
    </div>
  );
}