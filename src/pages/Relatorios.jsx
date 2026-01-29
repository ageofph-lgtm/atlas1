
import React, { useState, useEffect } from 'react';
import { FrotaACP, OrdemServico } from '@/entities/all';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Search, BarChart2, Activity, Archive, Calendar, CheckCircle2, List, Package, HardHat, Layers, Package2, Cog, Truck, Camera } from 'lucide-react';
import { format } from 'date-fns';
import ImageUploadModal from '../components/dashboard/ImageUploadModal';

const processUtilizationData = (machines) => {
  if (!machines || machines.length === 0) return { chartData: [], tableData: [] };

  const data = machines.map(machine => {
    let totalUtilizationDays = 0;

    if (machine.historico) {
      // Soma os dias de alugueres já concluídos
      machine.historico.forEach(h => {
        if (h.tipo === 'retorno_cliente' && h.diasUtilizacao) {
          totalUtilizationDays += h.diasUtilizacao;
        }
      });
    }
    
    // Se a máquina está atualmente em aluguer, calcula os dias desde a saída
    if (machine.estado === 'Em Aluguer' && machine.dataInicioAluguer) {
      const startDate = new Date(machine.dataInicioAluguer);
      const now = new Date();
      const diffDays = Math.ceil((now - startDate) / (1000 * 60 * 60 * 24));
      totalUtilizationDays += diffDays;
    }

    return {
      name: `${machine.modelo} (${machine.serie.slice(-4)})`,
      utilizacao: totalUtilizationDays,
      manutencoes: machine.historico?.filter(h => h.tipo === 'manutencao').length || 0,
      estado: machine.estado,
      modelo: machine.modelo,
      serie: machine.serie
    };
  });
  
  return { chartData: data, tableData: data };
};

const PRIORITY_COLORS = {
  'normal': 'bg-blue-100 text-blue-800',
  'alta': 'bg-yellow-100 text-yellow-800',
  'urgente': 'bg-red-100 text-red-800'
};

const CATEGORY_ICONS = {
  'Empilhador': HardHat,
  'Retrateis': Layers,
  'Order Picker': Package2,
  'Stacker': Cog,
  'Outros': Truck
};

const CATEGORIES = [
  { key: 'Empilhador', label: 'Empilhador', icon: HardHat, color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { key: 'Retrateis', label: 'Retrateis', icon: Layers, color: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { key: 'Order Picker', label: 'Order Picker', icon: Package2, color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { key: 'Stacker', label: 'Stacker', icon: Cog, color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  { key: 'Outros', label: 'Outros', icon: Truck, color: 'bg-gray-50 hover:bg-gray-100 border-gray-200' }
];

export default function RelatoriosPage() {
  const [utilization, setUtilization] = useState({ chartData: [], tableData: [] });
  const [historicOS, setHistoricOS] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHistoric, setFilteredHistoric] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('utilizacao');
  const [selectedMachineForChart, setSelectedMachineForChart] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [allSTSMachines, setAllSTSMachines] = useState([]);
  
  // New states for utilization search
  const [utilizationSearchQuery, setUtilizationSearchQuery] = useState('');
  const [filteredUtilization, setFilteredUtilization] = useState({ chartData: [], tableData: [] });
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalPurpose, setModalPurpose] = useState('search');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Apenas carregar máquinas STS para relatórios
        const machines = await FrotaACP.filter({ origem: 'sts' }, '-created_date');
        setAllSTSMachines(machines);

        // Carregar histórico de ordens concluídas
        const completedOrders = await OrdemServico.filter({ status: 'concluido' }, '-updated_date');
        setHistoricOS(completedOrders);
        setFilteredHistoric(completedOrders);
      } catch (error) {
        console.error("Erro ao carregar dados para relatórios:", error);
      }
      setIsLoading(false);
    };
    fetchData();
  }, []);

  // When a category is selected, process the data
  useEffect(() => {
    if (selectedCategory && allSTSMachines.length > 0) {
      const filteredMachines = allSTSMachines.filter(m => 
        (m.categoria || 'Outros') === selectedCategory
      );
      const processedData = processUtilizationData(filteredMachines);
      setUtilization(processedData);
      setFilteredUtilization(processedData); // Also set filtered data initially
    } else {
      // Clear data if no category is selected
      setUtilization({ chartData: [], tableData: [] });
      setFilteredUtilization({ chartData: [], tableData: [] });
    }
  }, [selectedCategory, allSTSMachines]);
  
  // Filter utilization data when search query changes
  useEffect(() => {
    if (!utilizationSearchQuery) {
      setFilteredUtilization(utilization);
      return;
    }
    
    const query = utilizationSearchQuery.toLowerCase();
    const filteredTableData = utilization.tableData.filter(m => 
      m.modelo?.toLowerCase().includes(query) ||
      m.serie?.toLowerCase().includes(query)
    );
    
    const filteredChartData = utilization.chartData.filter(c => {
      const serieMatch = c.serie?.toLowerCase().includes(query);
      const modeloMatch = c.modelo?.toLowerCase().includes(query);
      return serieMatch || modeloMatch;
    });

    setFilteredUtilization({ chartData: filteredChartData, tableData: filteredTableData });

  }, [utilizationSearchQuery, utilization]);

  // Filter historic orders based on search
  useEffect(() => {
    if (!searchQuery) {
      setFilteredHistoric(historicOS);
      return;
    }

    const filtered = historicOS.filter(os =>
      os.modelo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.serie?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      os.cliente?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredHistoric(filtered);
  }, [searchQuery, historicOS]);

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
    setUtilizationSearchQuery(''); // Reset search when changing category
    setSelectedMachineForChart(null); // Reset chart selection
  };

  const getCategoryCount = (category) => {
    return allSTSMachines.filter(m => (m.categoria || 'Outros') === category).length;
  };
  
  const handleImageUploadSuccess = (extractedData) => {
    setShowImageModal(false);
    if (modalPurpose === 'search') {
      setUtilizationSearchQuery(extractedData.serie || '');
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold font-cinzel text-gray-900 tracking-wider">
            Relatórios da Frota STS
          </h1>
          <p className="text-gray-700">
            Análise detalhada de utilização e histórico de máquinas STS.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            placeholder="Pesquisar no histórico por modelo, série ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 h-12 text-base rounded-full border border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none px-4 bg-white"
          />
        </div>

        <div className="w-full">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab('utilizacao')}
              className={`px-6 py-3 font-semibold text-sm uppercase tracking-wide transition-all rounded-lg ${
                activeTab === 'utilizacao'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 bg-transparent'
              }`}
            >
              <BarChart2 className="w-4 h-4 inline mr-2" />
              Utilização da Frota
            </button>
            <button
              onClick={() => setActiveTab('historico')}
              className={`px-6 py-3 font-semibold text-sm uppercase tracking-wide transition-all rounded-lg ${
                activeTab === 'historico'
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-600 hover:text-gray-900 bg-transparent'
              }`}
            >
              <Archive className="w-4 h-4 inline mr-2" />
              Histórico de O.S.
            </button>
          </div>

          {/* Content */}
          {activeTab === 'utilizacao' && (
            <div className="space-y-8">
              {/* Category Selection */}
              {!selectedCategory ? (
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <Package className="w-6 h-6" />
                    Selecione o Tipo de Máquina
                  </h2>
                  <p className="text-gray-600 mb-8">
                    Escolha um tipo de máquina para ver os dados de utilização detalhados.
                  </p>
                  
                  {isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="mt-4 text-gray-500">A carregar categorias...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {CATEGORIES.map(category => {
                        const count = getCategoryCount(category.key);
                        const Icon = category.icon;
                        
                        return (
                          <button
                            key={category.key}
                            onClick={() => handleCategorySelect(category.key)}
                            disabled={count === 0}
                            className={`p-6 border-2 rounded-xl transition-all text-left ${
                              count === 0 
                                ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                                : `${category.color} border-current hover:shadow-md`
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              <Icon className="w-8 h-8" />
                              <div>
                                <h3 className="text-lg font-semibold">{category.label}</h3>
                                <p className="text-sm opacity-75">
                                  {count} {count === 1 ? 'máquina' : 'máquinas'}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Back to category selection and search bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                      >
                        ← Voltar às Categorias
                      </button>
                      <h2 className="text-xl font-bold text-gray-900">
                        Relatório: {CATEGORIES.find(c => c.key === selectedCategory)?.label}
                      </h2>
                    </div>
                    {/* Search bar inside category */}
                    <div className="relative flex gap-2 w-full sm:w-auto">
                      <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
                      <input
                        type="text"
                        placeholder="Pesquisar por modelo ou série..."
                        value={utilizationSearchQuery}
                        onChange={(e) => setUtilizationSearchQuery(e.target.value)}
                        className="flex-1 w-full sm:w-64 pl-11 pr-4 h-10 text-sm rounded-full border border-gray-300 focus:border-gray-400 focus:ring-1 focus:ring-gray-400 outline-none bg-white"
                      />
                      <button
                        onClick={() => { setModalPurpose('search'); setShowImageModal(true); }}
                        className="h-10 w-10 flex-shrink-0 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-300"
                      >
                        <Camera className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <BarChart2 className="w-5 h-5" />
                        {selectedMachineForChart 
                          ? `Desempenho: ${selectedMachineForChart.modelo} (${selectedMachineForChart.serie.slice(-4)})`
                          : 'Utilização da Frota (Dias em Aluguer)'
                        }
                      </h3>
                      {selectedMachineForChart && (
                         <button 
                            onClick={() => setSelectedMachineForChart(null)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold"
                         >
                           <List className="w-4 h-4" />
                           Mostrar Todas
                         </button>
                      )}
                    </div>
                    
                    {filteredUtilization.chartData.length === 0 ? (
                      <div className="h-96 flex items-center justify-center text-gray-500">
                        <div className="text-center">
                          <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>Nenhuma máquina encontrada com a sua pesquisa</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart 
                          data={selectedMachineForChart 
                            ? [filteredUtilization.chartData.find(c => c.serie === selectedMachineForChart.serie)].filter(Boolean) 
                            : filteredUtilization.chartData
                          }
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.2)" />
                          <XAxis dataKey="name" stroke="currentColor" />
                          <YAxis stroke="currentColor" />
                          <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ccc' }}/>
                          <Legend />
                          <Bar dataKey="utilizacao" fill="#ef4444" name="Dias em Utilização" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                  
                  {/* Table */}
                  {filteredUtilization.tableData.length > 0 && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Resumo Detalhado
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modelo</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Série</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Atual</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nº de Manutenções</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dias em Utilização</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUtilization.tableData.map((machine, index) => (
                              <tr 
                                key={index} 
                                className={`cursor-pointer transition-colors ${
                                  selectedMachineForChart?.serie === machine.serie ? 'bg-red-50' : 'hover:bg-gray-50'
                                }`}
                                onClick={() => setSelectedMachineForChart(machine)}
                              >
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{machine.modelo}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{machine.serie}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{machine.estado}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{machine.manutencoes}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">{machine.utilizacao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'historico' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Archive className="w-5 h-5" />
                Histórico de Ordens de Serviço Concluídas
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                Total de {filteredHistoric.length} ordens concluídas
              </p>
              {isLoading ? (
                <div className="h-64 flex items-center justify-center text-gray-500">A carregar histórico...</div>
              ) : filteredHistoric.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-gray-500">
                  <Archive className="w-16 h-16 mb-4 opacity-30" />
                  <p className="text-lg font-medium">Nenhuma ordem encontrada</p>
                  <p className="text-sm">Tente ajustar os filtros de pesquisa</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto p-1">
                  {filteredHistoric.map((os) => (
                    <div key={os.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">
                              {os.modelo} {os.ano && `(${os.ano})`}
                            </h3>
                            <Badge className={`${PRIORITY_COLORS[os.prioridade] || PRIORITY_COLORS.normal} text-xs`}>
                              {os.prioridade}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700">NS: {os.serie}</p>
                          {os.cliente && (
                            <p className="text-sm text-gray-700">Cliente: {os.cliente}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Criada: {format(new Date(os.created_date), 'dd/MM/yyyy')}
                            </span>
                            {os.dataConlusao && (
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                Concluída: {format(new Date(os.dataConlusao), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                          Concluída
                        </Badge>
                      </div>
                      
                      {/* Task completion summary */}
                      {os.tasks && os.tasks.length > 0 && (
                        <div className="mt-3 p-2 bg-gray-100 rounded border border-gray-200">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">Tarefas concluídas:</span>
                            <span className="font-medium text-gray-800">
                              {os.tasks.filter(t => t.completed).length}/{os.tasks.length}
                            </span>
                          </div>
                        </div>
                      )}

                      {os.observacoes && (
                        <div className="mt-3 p-2 bg-yellow-100 rounded border border-yellow-200">
                          <p className="text-xs font-medium text-yellow-800 mb-1">Observações:</p>
                          <p className="text-sm text-yellow-700">{os.observacoes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <ImageUploadModal
        isOpen={showImageModal}
        onClose={() => setShowImageModal(false)}
        onSuccess={handleImageUploadSuccess}
        purpose={modalPurpose}
      />
    </div>
  );
}
