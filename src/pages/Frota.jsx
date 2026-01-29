
import React, { useState, useEffect, useCallback } from "react";
import { FrotaACP, OrdemServico, Notificacao } from "@/entities/all";
import { Truck, Star, Plus, Camera, Search, HardHat, Package2, Cog, Layers } from "lucide-react";
import { motion } from "framer-motion";

import CreateACPModal from "../components/frota/CreateACPModal";
import MachineDetailsModal from "../components/frota/MachineDetailsModal";
import ImageUploadModal from "../components/dashboard/ImageUploadModal";
import CreateOSModal from "../components/dashboard/CreateOSModal";
import OriginSelectionModal from "../components/dashboard/OriginSelectionModal";
import MachineSpecsModal from "../components/frota/MachineSpecsModal";
import BackupManager from "../components/frota/BackupManager";
import ReserveMachineModal from "../components/frota/ReserveMachineModal";
import FrotaTable from "../components/frota/FrotaTable";
import FilterScrollers from "../components/frota/FilterScrollers";

// NOTE: The 'angled-clip' class used throughout this file is assumed to be defined externally in a global CSS file
// or via a Tailwind CSS plugin. For example, it's might use a `clip-path` property:
// .angled-clip {
//   clip-path: polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%);
//   // Adjust values for desired angle
// }

const STATUS_COLORS = {
  'Disponível': "bg-blue-100 text-blue-800 border-blue-200",
  'Preparada': "bg-green-100 text-green-800 border-green-200",
  // 'Reservada' status removed as it's now handled by a separate 'reserva' field
  'Em Aluguer': "bg-purple-100 text-purple-800 border-purple-200",
  'Em Manutenção': "bg-red-100 text-red-800 border-red-200"
};

const CATEGORY_ICONS = {
  'Empilhador': HardHat,
  'Retrateis': Layers,
  'Order Picker': Package2,
  'Stacker': Cog,
  'Outros': Truck
};

const getMachineCategory = (modelo) => {
  if (!modelo) return "Outros";
  const m = modelo.toUpperCase();

  if (m.startsWith('R')) {
    return "Empilhador";
  }
  if (m.startsWith('F')) {
    return "Retrateis";
  }
  if (m.startsWith('O') || m.startsWith('L')) {
    return "Order Picker";
  }
  if (m.startsWith('E')) {
    return "Stacker";
  }

  return "Outros";
};

export default function FrotaPage({ userPermissions }) {
  const [machines, setMachines] = useState([]);
  const [filteredMachines, setFilteredMachines] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("novas");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  // Modals for MACHINE creation
  const [showCreateMachineModal, setShowCreateMachineModal] = useState(false);
  const [editingMachine, setEditingMachine] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [prefillData, setPrefillData] = useState(null);

  // MODIFIED state for specs modal
  const [showSpecsModal, setShowSpecsModal] = useState(false);
  const [machineForSpecs, setMachineForSpecs] = useState(null);

  // Modals for ORDER creation
  const [showCreateOSModal, setShowCreateOSModal] = useState(false);
  const [osTargetMachine, setOsTargetMachine] = useState(null);

  // Details Modal
  const [showDetailsModal, setShowDetailsModal] = useState(null);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // New state for origin selection flow
  const [showOriginModal, setShowOriginModal] = useState(false);
  const [selectedOrigin, setSelectedOrigin] = useState(null);
  const [creationFlow, setCreationFlow] = useState(null);
  const [modalPurpose, setModalPurpose] = useState('create');

  // New state for reservation modal
  const [showReserveModal, setShowReserveModal] = useState(false);
  const [reserveTargetMachine, setReserveTargetMachine] = useState(null);

  const handleEditMachine = useCallback((machine) => {
    setPrefillData(null); 
    setEditingMachine(machine); 
    setShowCreateMachineModal(true);
  }, []);

  const loadMachines = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await FrotaACP.list('-created_date');

      const machinesWithCategories = data.map(m => {
        const categoria = m.categoria || getMachineCategory(m.modelo);
        return {
          ...m,
          categoria: categoria
        };
      });

      setMachines(machinesWithCategories);
    } catch (error) {
      console.error("Erro ao carregar frota:", error);
    }

    if (isManualRefresh) {
      setRefreshing(false);
    } else {
      setIsLoading(false);
    }
  }, []);

  const filterMachinesBySearch = useCallback(() => {
    if (!searchQuery) {
      setFilteredMachines([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = machines.filter(machine => {
      const basicMatch =
        machine.modelo?.toLowerCase().includes(query) ||
        machine.serie?.toLowerCase().includes(query) ||
        machine.estado?.toLowerCase().includes(query) ||
        machine.origem?.toLowerCase().includes(query) ||
        machine.categoria?.toLowerCase().includes(query);

      let specsMatch = false;
      if (machine.caracteristicas) {
        const specs = machine.caracteristicas;
        specsMatch =
          ((query.includes('rodas brancas') || query.includes('pneus brancos')) && specs.corPneus === 'branco') ||
          ((query.includes('rodas pretas') || query.includes('pneus pretos')) && specs.corPneus === 'preto') ||
          (query.includes('3 vias') && specs.viasMastro === 3) ||
          (query.includes('4 vias') && specs.viasMastro === 4) ||
          (query.includes('5 vias') && specs.viasMastro === 5) ||
          (query.includes('triplex') && specs.mastro === 'triplex') ||
          (query.includes('telescopico') && specs.mastro === 'telescopico') ||
          (query.includes('niho') && specs.mastro === 'niho') ||
          (query.includes('alavanca') && specs.joystick === 'alavanca') ||
          (query.includes('minilever') && specs.joystick === 'minilever') ||
          (query.includes('4plus') && specs.joystick === '4plus') ||
          (query.includes('fingertrip') && specs.joystick === 'fingertrip') ||
          (query.includes('posicionador') && specs.acessorio?.toLowerCase().includes('posicionador')) ||
          (query.includes('sideshift') && specs.acessorio?.toLowerCase().includes('sideshift')) ||
          (query.includes('pinca') && specs.acessorio?.toLowerCase().includes('pinca')) ||
          (query.includes('volteador') && specs.acessorio?.toLowerCase().includes('volteador'));
      }

      return basicMatch || specsMatch;
    });

    setFilteredMachines(filtered);
  }, [machines, searchQuery]);

  useEffect(() => {
    filterMachinesBySearch();
  }, [searchQuery, machines, filterMachinesBySearch]);

  useEffect(() => {
    loadMachines();
    const interval = setInterval(() => loadMachines(), 1200000);
    return () => clearInterval(interval);
  }, [loadMachines]);

  useEffect(() => {
    let startY = 0;
    let isPulling = false;

    const handleTouchStart = (e) => {
      startY = e.touches[0].clientY;
      isPulling = window.scrollY === 0;
    };

    const handleTouchMove = (e) => {
      if (!isPulling) return;

      const currentY = e.touches[0].clientY;
      const diffY = currentY - startY;

      if (diffY > 100 && !refreshing) {
        setRefreshing(true);
        loadMachines(true);
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
  }, [loadMachines, refreshing]);

  const handleCreateOrUpdateMachine = async (machineData) => {
    setShowCreateMachineModal(false);
    setIsLoading(true);

    try {
      const categoria = getMachineCategory(machineData.modelo);
      let finalData = { ...machineData, categoria };
      
      if (editingMachine) {
        // Log status change to history
        if (finalData.estado !== editingMachine.estado) {
          let newHistoryEntry;
          
          // Se a máquina estava "Em Aluguer" e agora vai para outro estado - registar retorno
          if (editingMachine.estado === 'Em Aluguer' && finalData.estado !== 'Em Aluguer') {
            // Calcular dias alugada se possível
            let diasAlugada = null;
            if (editingMachine.dataInicioAluguer) {
              const dataInicio = new Date(editingMachine.dataInicioAluguer);
              const dataFim = new Date();
              diasAlugada = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));
            }
            
            newHistoryEntry = {
              tipo: 'retorno_cliente',
              data: new Date().toISOString(),
              descricao: diasAlugada 
                ? `Retorno do aluguer registado. Esteve alugada ${diasAlugada} dias. Estado alterado para '${finalData.estado}'`
                : `Retorno do aluguer registado. Estado alterado para '${finalData.estado}'`,
              responsavel: userPermissions?.currentUser?.full_name || 'Sistema',
              diasUtilizacao: diasAlugada
            };
            
            // Limpar a data de início do aluguer
            finalData.dataInicioAluguer = null;
            
          } 
          // Se a máquina vai para "Em Aluguer" - registar saída
          else if (finalData.estado === 'Em Aluguer' && editingMachine.estado !== 'Em Aluguer') {
            newHistoryEntry = {
              tipo: 'saida_cliente',
              data: new Date().toISOString(),
              descricao: `Máquina saiu para aluguer. Estado alterado de '${editingMachine.estado || 'N/D'}' para 'Em Aluguer'`,
              responsavel: userPermissions?.currentUser?.full_name || 'Sistema'
            };
            
            // Registar a data de início do aluguer
            finalData.dataInicioAluguer = new Date().toISOString();
            
          }
          // Qualquer outra mudança de estado
          else {
            newHistoryEntry = {
              tipo: 'estado_change',
              data: new Date().toISOString(),
              descricao: `Estado alterado de '${editingMachine.estado || 'N/D'}' para '${finalData.estado}'`,
              responsavel: userPermissions?.currentUser?.full_name || 'Sistema'
            };
          }
          
          finalData.historico = [...(editingMachine.historico || []), newHistoryEntry];
        }

        await FrotaACP.update(editingMachine.id, finalData);
        
        // Após atualizar dados básicos, abrir modal de características para edição
        const updatedMachine = { ...editingMachine, ...finalData };
        setMachineForSpecs(updatedMachine);
        setShowSpecsModal(true);
        setEditingMachine(null);
      } else {
        // Para novas máquinas, se status é 'Em Aluguer', definir dataInicioAluguer
        if (finalData.estado === 'Em Aluguer') {
          finalData.dataInicioAluguer = new Date().toISOString();
        }

        const existingMachines = await FrotaACP.filter({ serie: finalData.serie });

        if (existingMachines.length > 0) {
          const existingMachine = existingMachines[0];

          if (existingMachine.estado === 'Em Aluguer') {
            const proceed = window.confirm(
              `Esta máquina (${existingMachine.modelo} - ${existingMachine.serie}) está "Em Aluguer".\n\nDeseja registar o seu retorno e alterar o estado para "Disponível"?`
            );

            if (proceed) {
              // Calcular dias alugada
              let diasAlugada = null;
              if (existingMachine.dataInicioAluguer) {
                const dataInicio = new Date(existingMachine.dataInicioAluguer);
                const dataFim = new Date();
                diasAlugada = Math.ceil((dataFim - dataInicio) / (1000 * 60 * 60 * 24));
              }

              const newHistoryEntry = {
                tipo: 'retorno_cliente',
                data: new Date().toISOString(),
                descricao: diasAlugada 
                  ? `Retorno de aluguer registado via novo registo. Esteve alugada ${diasAlugada} dias.`
                  : 'Retorno de aluguer registado via novo registo de máquina.',
                responsavel: userPermissions?.currentUser?.full_name || 'Sistema',
                diasUtilizacao: diasAlugada
              };
              
              await FrotaACP.update(existingMachine.id, {
                estado: 'Disponível',
                historico: [...(existingMachine.historico || []), newHistoryEntry],
                dataInicioAluguer: null // Limpar dataInicioAluguer upon return
              });
              alert(`Retorno da máquina ${existingMachine.serie} registado com sucesso!${diasAlugada ? ` (${diasAlugada} dias alugada)` : ''}`);
            } else {
              alert("Registo cancelado pelo utilizador.");
            }
          } else {
            alert(`Erro: Já existe uma máquina registada com o número de série "${finalData.serie}".\nNão é possível duplicar o registo.`);
          }
        } else {
          const newMachine = await FrotaACP.create(finalData);
          setMachineForSpecs(newMachine);
          setShowSpecsModal(true);
        }
      }
    } catch (error) {
      console.error("Erro ao guardar máquina:", error);
      alert("Ocorreu um erro ao guardar a máquina.");
    } finally {
      setIsLoading(false);
      setPrefillData(null);
      loadMachines(true); // Always reload after any create/update attempt
    }
  };

  const handleSpecsSubmit = async (specs) => {
    if (!machineForSpecs) return;
    
    setIsLoading(true);
    setShowSpecsModal(false);

    try {
      await FrotaACP.update(machineForSpecs.id, { caracteristicas: specs });
      await loadMachines();
    } catch (error) {
      console.error("Erro ao atualizar especificações:", error);
      alert("Ocorreu um erro ao guardar as especificações.");
    } finally {
      setIsLoading(false);
      setMachineForSpecs(null);
    }
  };


  const handleDeleteMachine = async (machineId) => {
    try {
      await FrotaACP.delete(machineId);
      await loadMachines();
    } catch (error) {
      console.error("Erro ao eliminar máquina:", error);
    }
  };

  const handleImageUploadSuccess = (extractedData) => {
    setShowImageModal(false);
    if (modalPurpose === 'search') {
      setSearchQuery(extractedData.serie || '');
      setModalPurpose('create'); // Reset purpose
    } else {
      setPrefillData({ ...extractedData, origem: selectedOrigin });
      setEditingMachine(null); // Ensure no editing machine is active
      setShowCreateMachineModal(true);
    }
  };

  const handleOriginSelected = (origin) => {
    setSelectedOrigin(origin);
    setShowOriginModal(false);

    if (creationFlow === 'manual') {
      setPrefillData({ origem: origin });
      setShowCreateMachineModal(true);
    } else if (creationFlow === 'ia') {
      setModalPurpose('create');
      setShowImageModal(true);
    }
  };

  const handleOpenOSModal = (machine) => {
    setOsTargetMachine(machine);
    setShowCreateOSModal(true);
  };

  const handleCreateOS = async (osData) => {
    if (!osTargetMachine) return;

    try {
      await FrotaACP.update(osTargetMachine.id, { estado: 'Em Manutenção' });

      const newOS = await OrdemServico.create({
        ...osData,
        modelo: osTargetMachine?.modelo,
        serie: osTargetMachine?.serie, 
        ano: osTargetMachine?.ano,
        acpMachineId: osTargetMachine?.id,
        origemMaquina: osTargetMachine?.origem,
        caracteristicasMaquina: osTargetMachine?.caracteristicas,
        status: 'a-fazer',
        historico: [{
          acao: 'O.S. criada a partir da frota',
          data: new Date().toISOString(),
          usuario: userPermissions?.currentUser?.full_name || 'Sistema',
          detalhes: `Ordem de serviço criada para a máquina ${osTargetMachine?.modelo} - ${osTargetMachine?.serie}`
        }]
      });

      await Notificacao.create({
        userId: 'all',
        message: `Nova O.S. criada para ${newOS.modelo} (a partir da frota)`,
        osId: newOS.id,
        type: 'new_os'
      });

      setShowCreateOSModal(false);
      setOsTargetMachine(null);
      await loadMachines();

    } catch (error) {
      console.error("Erro ao criar Ordem de Serviço a partir da frota:", error);
    }
  };

  const handleBackupComplete = (message) => {
    console.log('Backup operation completed:', message);
  };

  const handleManualRefresh = () => {
    loadMachines(true);
  };

  const handleReserveMachine = (machine) => {
    setReserveTargetMachine(machine);
    setShowReserveModal(true);
  };

  const handleConfirmReservation = async (machineId, reservationData) => {
    try {
      // Find the machine by ID to get its current data, especially existing history.
      const machine = machines.find(m => m.id === machineId);
      if (!machine) {
        throw new Error("Máquina não encontrada para reserva.");
      }

      // The reservation details are expected to be nested under a 'reserva' key in the incoming reservationData
      const reservationDetails = reservationData.reserva;
      
      const newHistoryEntry = {
        tipo: 'reserva',
        data: new Date().toISOString(),
        descricao: `Máquina reservada para ${reservationDetails.cliente} por ${reservationDetails.comercial}. De ${reservationDetails.dataInicio} a ${reservationDetails.dataFim}.`,
        cliente: reservationDetails.cliente,
        comercial: reservationDetails.comercial,
        dataInicio: reservationDetails.dataInicio,
        dataFim: reservationDetails.dataFim,
        responsavel: userPermissions?.currentUser?.full_name || 'Sistema'
      };
      
      // Update the machine with the new reservation data and history.
      // Crucially, the 'estado' field is NOT modified here; it remains independent of the reservation.
      await FrotaACP.update(machineId, {
        reserva: reservationDetails, // Store the reservation details directly in the 'reserva' field
        historico: [...(machine.historico || []), newHistoryEntry]
      });

      await loadMachines(); // Reload all machines to reflect the change
      setShowReserveModal(false);
      setReserveTargetMachine(null);
    } catch (error) {
      console.error("Erro ao reservar máquina:", error);
      alert("Ocorreu um erro ao reservar a máquina.");
    }
  };

  const handleCancelReservation = async (machineId) => {
    if (!window.confirm("Tem a certeza de que deseja cancelar a reserva desta máquina?")) {
      return;
    }

    try {
      const machine = machines.find(m => m.id === machineId);
      if (!machine) throw new Error("Máquina não encontrada.");

      const newHistoryEntry = {
        tipo: 'cancelar_reserva',
        data: new Date().toISOString(),
        descricao: `Reserva para o cliente ${machine.reserva.cliente} foi cancelada.`,
        responsavel: userPermissions?.currentUser?.full_name || 'Sistema'
      };

      await FrotaACP.update(machineId, {
        reserva: null, // Remove the reservation object
        historico: [...(machine.historico || []), newHistoryEntry]
      });

      await loadMachines(true);
      alert("Reserva cancelada com sucesso!");
    } catch (error) {
      console.error("Erro ao cancelar reserva:", error);
      alert("Ocorreu um erro ao cancelar a reserva.");
    }
  };


  const novasMachines = machines.filter(m => m.origem === 'nova');
  const stsMachines = machines.filter(m => m.origem === 'sts');
  const utsMachines = machines.filter(m => m.origem === 'uts');

  const handleMainTabChange = (newTab) => {
    setActiveTab(newTab);
    setSelectedCategory('all');
    setSelectedStatus('all'); 
  };
  
  const getCurrentTabMachines = useCallback(() => {
    switch(activeTab) {
      case 'novas': return novasMachines;
      case 'sts': return stsMachines;
      case 'uts': return utsMachines;
      default: return [];
    }
  }, [activeTab, novasMachines, stsMachines, utsMachines]);

  const getFinalFilteredMachines = useCallback(() => {
    let currentMachines = getCurrentTabMachines();

    if (selectedCategory !== 'all') {
      currentMachines = currentMachines.filter(m => (m.categoria || 'Outros') === selectedCategory);
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'Reservada') {
        currentMachines = currentMachines.filter(m => m.reserva && m.reserva.cliente);
      } else {
        currentMachines = currentMachines.filter(m => m.estado === selectedStatus);
      }
    }
    
    return currentMachines;
  }, [getCurrentTabMachines, selectedCategory, selectedStatus]);

  return (
    <div className="min-h-screen">
      <div className="max-w-full mx-auto p-2 md:p-4 lg:p-8">
        {refreshing && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-red-500 text-white text-center py-2 px-6 angled-clip shadow-lg">
            Atualizando dados da frota...
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-6 lg:mb-8 gap-4"
        >
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3 w-full sm:w-auto">
            {userPermissions?.hasPermission?.('canManageUsers') && (
              <BackupManager onBackupComplete={handleBackupComplete} />
            )}

            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="px-4 md:px-6 py-2 angled-clip bg-white/60 backdrop-blur-md border border-white/40 text-gray-800 hover:bg-white/80 font-medium transition-colors w-full sm:w-auto text-sm md:text-base"
            >
              {refreshing ? 'Atualizando...' : 'Atualizar'}
            </button>

            {userPermissions?.canCreateMachine && (
              <>
                <button
                  className="px-4 md:px-6 py-2 angled-clip bg-white/60 backdrop-blur-md border border-white/40 text-gray-800 hover:bg-white/80 font-medium flex items-center gap-2 w-full sm:w-auto text-sm md:text-base"
                  onClick={() => { setCreationFlow('ia'); setShowOriginModal(true); }}>
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Criar com IA</span>
                  <span className="sm:hidden">IA</span>
                </button>
                <button
                  className="px-4 md:px-6 py-2 angled-clip bg-red-600 text-white hover:bg-red-700 font-medium flex items-center gap-2 w-full sm:w-auto text-sm md:text-base"
                  onClick={() => { setCreationFlow('manual'); setPrefillData(null); setEditingMachine(null); setShowOriginModal(true); }}>
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Adicionar Manualmente</span>
                  <span className="sm:hidden">Adicionar</span>
                </button>
              </>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {/* Search */}
          <div className="relative mb-4 md:mb-6 flex gap-2">
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5 z-10" />
            <input
              type="text"
              placeholder="Pesquisar por modelo, série, estado, origem..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 pl-10 md:pl-12 pr-4 h-10 md:h-12 text-sm md:text-base angled-clip bg-white/60 backdrop-blur-md border border-white/40 focus:ring-1 focus:ring-red-500/50 outline-none"
            />
            <button
              onClick={() => { setModalPurpose('search'); setShowImageModal(true); }}
              className="h-10 md:h-12 w-10 md:w-12 flex-shrink-0 angled-clip bg-white/60 backdrop-blur-md border border-white/40 hover:bg-white/80 transition-colors flex items-center justify-center"
            >
              <Camera className="w-4 h-4 md:w-5 md:h-5 text-gray-600" />
            </button>
          </div>

          {searchQuery ? (
            <div>
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4">Resultados da Pesquisa</h2>
              <FrotaTable
                machines={filteredMachines}
                isLoading={isLoading}
                statusColors={STATUS_COLORS}
                categoryIcons={CATEGORY_ICONS}
                onEdit={userPermissions?.canEditMachine ? handleEditMachine : null}
                onDelete={userPermissions?.canDeleteMachine ? handleDeleteMachine : null}
                onCreateOS={userPermissions?.canCreateOS ? handleOpenOSModal : null}
                onReserveMachine={userPermissions?.canReserveMachine ? handleReserveMachine : null}
                onCancelReservation={userPermissions?.canCancelReservation ? handleCancelReservation : null}
                onRowClick={(m) => {setSelectedMachine(m); setShowDetailsModal(true);}}
                userPermissions={userPermissions}
              />
            </div>
          ) : (
            <div className="w-full">
              {/* Main Tabs */}
              <div className="flex flex-wrap gap-1 md:gap-2 mb-4 md:mb-6 overflow-x-auto">
                <button
                  onClick={() => handleMainTabChange('novas')}
                  className={`px-3 md:px-4 py-2 angled-clip font-medium flex items-center transition-colors text-xs md:text-sm whitespace-nowrap ${activeTab === 'novas' ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 text-white shadow-md' : 'bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80'}`}
                >
                  <Star className="w-3 h-3 md:w-4 h-4 inline mr-1 md:mr-2" />
                  Novas
                  <span className={`ml-1 md:ml-2 px-1 md:px-2 py-0.5 rounded text-xs transition-colors ${activeTab === 'novas' ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {novasMachines.length}
                  </span>
                </button>
                <button
                  onClick={() => handleMainTabChange('sts')}
                  className={`px-3 md:px-4 py-2 angled-clip font-medium flex items-center transition-colors text-xs md:text-sm whitespace-nowrap ${activeTab === 'sts' ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 text-white shadow-md' : 'bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80'}`}
                >
                  STS
                  <span className={`ml-1 md:ml-2 px-1 md:px-2 py-0.5 rounded text-xs transition-colors ${activeTab === 'sts' ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {stsMachines.length}
                  </span>
                </button>
                <button
                  onClick={() => handleMainTabChange('uts')}
                  className={`px-3 md:px-4 py-2 angled-clip font-medium flex items-center transition-colors text-xs md:text-sm whitespace-nowrap ${activeTab === 'uts' ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-red-900 text-white shadow-md' : 'bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80'}`}
                >
                  UTS
                  <span className={`ml-1 md:ml-2 px-1 md:px-2 py-0.5 rounded text-xs transition-colors ${activeTab === 'uts' ? 'bg-white/20' : 'bg-gray-200'}`}>
                    {utsMachines.length}
                  </span>
                </button>
              </div>

              {/* New Filter Scrollers */}
              <div className="mb-6">
                <FilterScrollers
                  machines={getCurrentTabMachines()}
                  onCategoryChange={setSelectedCategory}
                  onStatusChange={setSelectedStatus}
                  selectedCategory={selectedCategory}
                  selectedStatus={selectedStatus}
                />
              </div>

              {/* Machine Table */}
              <FrotaTable
                machines={getFinalFilteredMachines()}
                isLoading={isLoading}
                statusColors={STATUS_COLORS}
                categoryIcons={CATEGORY_ICONS}
                onEdit={userPermissions?.canEditMachine ? handleEditMachine : null}
                onDelete={userPermissions?.canDeleteMachine ? handleDeleteMachine : null}
                onCreateOS={userPermissions?.canCreateOS ? handleOpenOSModal : null}
                onReserveMachine={userPermissions?.canReserveMachine ? handleReserveMachine : null}
                onCancelReservation={userPermissions?.canCancelReservation ? handleCancelReservation : null}
                onRowClick={(m) => {setSelectedMachine(m); setShowDetailsModal(true);}}
                userPermissions={userPermissions}
              />
            </div>
          )}
        </motion.div>

        <CreateACPModal
          isOpen={showCreateMachineModal}
          onClose={() => {setShowCreateMachineModal(false); setEditingMachine(null); setPrefillData(null);}}
          onSubmit={handleCreateOrUpdateMachine}
          editingMachine={editingMachine}
          prefillData={prefillData}
        />

        <MachineDetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          machine={selectedMachine}
          onUpdate={loadMachines}
        />

        <ImageUploadModal
          isOpen={showImageModal}
          onClose={() => setShowImageModal(false)}
          onSuccess={handleImageUploadSuccess}
          purpose={modalPurpose}
        />

        <CreateOSModal
          isOpen={showCreateOSModal}
          onClose={() => {setShowCreateOSModal(false); setOsTargetMachine(null);}}
          onSubmit={handleCreateOS}
          prefillData={{
            modelo: osTargetMachine?.modelo,
            serie: osTargetMachine?.serie,
            ano: osTargetMachine?.ano,
          }}
        />

        <OriginSelectionModal
          isOpen={showOriginModal}
          onClose={() => setShowOriginModal(false)}
          onSelectOrigin={handleOriginSelected}
          title="Qual a origem da máquina?"
        />

        <MachineSpecsModal
          isOpen={showSpecsModal}
          onClose={() => {setShowSpecsModal(false); setMachineForSpecs(null);}}
          onSubmit={handleSpecsSubmit}
          machineData={machineForSpecs}
        />

        <ReserveMachineModal
          isOpen={showReserveModal}
          onClose={() => {setShowReserveModal(false); setReserveTargetMachine(null);}}
          onSubmit={handleConfirmReservation}
          machine={reserveTargetMachine}
        />
      </div>
    </div>
  );
}
