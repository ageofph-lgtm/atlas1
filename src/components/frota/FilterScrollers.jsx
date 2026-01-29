
import React, { useState } from 'react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Package, Settings } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const FilterButton = ({ label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 text-sm font-medium whitespace-nowrap angled-clip ${
      isActive
        ? 'bg-gray-800 text-white shadow-md'
        : 'bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80'
    }`}
  >
    {label}
    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${isActive ? 'bg-white/20' : 'bg-gray-200'}`}>
      {count}
    </span>
  </button>
);

export default function FilterScrollers({
  machines,
  onCategoryChange,
  onStatusChange,
  selectedCategory,
  selectedStatus
}) {
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const categoriesConfig = [
    { key: 'all', label: 'Todos Tipos' },
    { key: 'Empilhador', label: 'Empilhador' },
    { key: 'Retrateis', label: 'Retrateis' },
    { key: 'Order Picker', label: 'Order Picker' },
    { key: 'Stacker', label: 'Stacker' },
    { key: 'Outros', label: 'Outros' }
  ];

  const statusesConfig = [
    { key: 'all', label: 'Todos Estados' },
    { key: 'Disponível', label: 'Disponível' },
    { key: 'Preparada', label: 'Preparada' },
    { key: 'Em Aluguer', label: 'Em Aluguer' },
    { key: 'Em Manutenção', label: 'Em Manutenção' },
    { key: 'Reservada', label: 'Com Reserva' } // Filtro especial para máquinas com reserva
  ];

  // Helper to get counts from a list for a specific property
  const getCounts = (list, property, allKeys) => {
    const counts = {};
    allKeys.forEach(key => counts[key] = 0);
    
    list.forEach(item => {
      if (property === 'categoria') {
        const value = item[property] || 'Outros';
        if (counts.hasOwnProperty(value)) {
          counts[value]++;
        }
      } else if (property === 'estado') {
        // Para estados, verificamos tanto o estado quanto se tem reserva
        const estado = item.estado;
        if (counts.hasOwnProperty(estado)) { // Check if the actual status is a recognized filter key
          counts[estado]++;
        }
        // Se tem reserva (e está ativa), conta para "Reservada" também
        if (item.reserva && item.reserva.cliente && counts.hasOwnProperty('Reservada')) {
          counts['Reservada']++;
        }
      }
    });
    
    counts['all'] = list.length;
    return counts;
  };

  // Calculate counts based on the *other* active filter
  const machinesForCategoryCount = machines.filter(m => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'Reservada') return m.reserva && m.reserva.cliente;
    return m.estado === selectedStatus;
  });
  
  const machinesForStatusCount = machines.filter(m => 
    selectedCategory === 'all' || (m.categoria || 'Outros') === selectedCategory
  );
  
  const categoryCounts = getCounts(machinesForCategoryCount, 'categoria', categoriesConfig.map(c => c.key));
  const statusCounts = getCounts(machinesForStatusCount, 'estado', statusesConfig.map(s => s.key));

  const getActiveFilterLabel = (type) => {
    if (type === 'category') {
      const active = categoriesConfig.find(cat => cat.key === selectedCategory);
      return active ? `${active.label} (${categoryCounts[selectedCategory]})` : 'Todos Tipos';
    } else {
      const active = statusesConfig.find(s => s.key === selectedStatus);
      return active ? `${active.label} (${statusCounts[selectedStatus]})` : 'Todos Estados';
    }
  };

  return (
    <div className="space-y-3">
      {/* Filter Toggle Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => setShowTypeFilter(!showTypeFilter)}
          className={`h-10 px-4 angled-clip bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80 transition-all duration-200 flex items-center gap-2 ${
            showTypeFilter ? 'bg-blue-50 border-blue-200 text-blue-700' : ''
          }`}
        >
          <Package className="w-4 h-4" />
          <span className="font-medium">Tipo:</span>
          <span className="text-sm">{getActiveFilterLabel('category')}</span>
          {showTypeFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>

        <Button
          variant="outline"
          onClick={() => setShowStatusFilter(!showStatusFilter)}
          className={`h-10 px-4 angled-clip bg-white/60 backdrop-blur-md border border-white/40 text-gray-700 hover:bg-white/80 transition-all duration-200 flex items-center gap-2 ${
            showStatusFilter ? 'bg-green-50 border-green-200 text-green-700' : ''
          }`}
        >
          <Settings className="w-4 h-4" />
          <span className="font-medium">Estado:</span>
          <span className="text-sm">{getActiveFilterLabel('status')}</span>
          {showStatusFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      {/* Expandable Type Filter */}
      <AnimatePresence>
        {showTypeFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50/50 backdrop-blur-sm border border-blue-200 rounded-lg p-4 angled-clip">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-800">Filtrar por Tipo de Máquina</h3>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {categoriesConfig.map(cat => (
                    <FilterButton
                      key={cat.key}
                      label={cat.label}
                      count={categoryCounts[cat.key]}
                      isActive={selectedCategory === cat.key}
                      onClick={() => {
                        onCategoryChange(cat.key);
                        setShowTypeFilter(false);
                      }}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expandable Status Filter */}
      <AnimatePresence>
        {showStatusFilter && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="bg-green-50/50 backdrop-blur-sm border border-green-200 rounded-lg p-4 angled-clip">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-green-800">Filtrar por Estado da Máquina</h3>
              </div>
              <ScrollArea className="w-full">
                <div className="flex gap-2 pb-2">
                  {statusesConfig.map(stat => (
                    <FilterButton
                      key={stat.key}
                      label={stat.label}
                      count={statusCounts[stat.key]}
                      isActive={selectedStatus === stat.key}
                      onClick={() => {
                        onStatusChange(stat.key);
                        setShowStatusFilter(false);
                      }}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
