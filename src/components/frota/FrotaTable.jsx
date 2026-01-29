
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Wrench, Calendar, Package, Truck, CalendarX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function FrotaTable({
  machines,
  isLoading,
  statusColors,
  categoryIcons,
  onEdit,
  onDelete,
  onCreateOS,
  onReserveMachine,
  onCancelReservation, // Added new prop
  onRowClick,
  userPermissions
}) {

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 md:h-16 w-full angled-clip" />
        ))}
      </div>
    );
  }

  if (!machines || machines.length === 0) {
    return (
      <div className="text-center py-12 md:py-16 bg-white/50 backdrop-blur-sm rounded-lg angled-clip">
        <Package className="w-8 h-8 md:w-12 md:h-12 mx-auto text-zinc-400 mb-4" />
        <h3 className="text-lg md:text-xl font-semibold text-zinc-800">Nenhuma máquina encontrada</h3>
        <p className="text-zinc-500 text-sm md:text-base">Tente ajustar os filtros ou adicione uma nova máquina.</p>
      </div>
    );
  }

  // Helper function to get origin badge styling
  const getOriginBadgeStyle = (origem) => {
    switch(origem) {
      case 'nova':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'sts':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'uts':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOriginLabel = (origem) => {
    switch(origem) {
      case 'nova': return 'NOVA';
      case 'sts': return 'STS';
      case 'uts': return 'UTS';
      default: return origem?.toUpperCase() || 'N/A';
    }
  };

  return (
    <div className="bg-white/50 backdrop-blur-sm border border-white/30 rounded-lg overflow-hidden angled-clip">
      {/* Mobile Card View */}
      <div className="md:hidden">
        {machines.map((machine) => {
          const CategoryIcon = categoryIcons[machine.categoria] || Truck;
          const hasReserva = machine.reserva && machine.reserva.cliente;
          
          return (
            <div 
              key={machine.id}
              className="border-b border-white/20 p-4 hover:bg-white/40 cursor-pointer"
              onClick={() => onRowClick(machine)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <CategoryIcon className="w-4 h-4 text-zinc-500" />
                  <span className="font-medium text-gray-700 text-sm">{machine.categoria}</span>
                  {/* Origin Badge for Mobile */}
                  {machine.origem && (
                    <Badge className={`${getOriginBadgeStyle(machine.origem)} text-xs px-2 py-1`}>
                      {getOriginLabel(machine.origem)}
                    </Badge>
                  )}
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {userPermissions?.canEditMachine && (
                        <DropdownMenuItem onClick={() => onEdit(machine)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      {userPermissions?.canCreateOS && (
                        <DropdownMenuItem onClick={() => onCreateOS(machine)}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Criar O.S.
                        </DropdownMenuItem>
                      )}
                      {userPermissions?.canReserveMachine && machine.estado !== 'Em Aluguer' && !hasReserva && (
                        <DropdownMenuItem onClick={() => onReserveMachine(machine)}>
                          <Calendar className="w-4 h-4 mr-2" />
                          Reservar
                        </DropdownMenuItem>
                      )}
                      {userPermissions?.canCancelReservation && hasReserva && ( // New dropdown item
                        <DropdownMenuItem className="text-yellow-600" onClick={() => onCancelReservation(machine.id)}>
                          <CalendarX className="w-4 h-4 mr-2" />
                          Cancelar Reserva
                        </DropdownMenuItem>
                      )}
                      {userPermissions?.canDeleteMachine && (
                        <DropdownMenuItem className="text-red-500" onClick={() => onDelete(machine.id)}>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="space-y-1">
                <p className="font-semibold text-gray-800 text-lg">{machine.modelo}</p>
                <p className="font-mono text-gray-600 text-sm">Série: {machine.serie}</p>
                <p className="text-gray-600 text-sm">Ano: {machine.ano}</p>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="outline" className={`${statusColors[machine.estado]} whitespace-nowrap angled-clip px-2 py-1 text-xs`}>
                    {machine.estado}
                  </Badge>
                  
                  {/* Mostrar badge de reserva separadamente */}
                  {hasReserva && (
                    <Badge className="bg-orange-100 text-orange-800 border-orange-200 whitespace-nowrap angled-clip px-2 py-1 text-xs">
                      RESERVADA
                    </Badge>
                  )}
                </div>
                
                {/* Mostrar informações da reserva */}
                {hasReserva && (
                  <div className="mt-2 p-2 bg-orange-50 rounded border border-orange-200">
                    <p className="text-xs text-orange-800">
                      <strong>Cliente:</strong> {machine.reserva.cliente}
                    </p>
                    {machine.reserva.data && (
                      <p className="text-xs text-orange-800">
                        <strong>Data:</strong> {new Date(machine.reserva.data).toLocaleDateString('pt-PT')}
                      </p>
                    )}
                    {machine.reserva.comercial && (
                      <p className="text-xs text-orange-800">
                        <strong>Comercial:</strong> {machine.reserva.comercial}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Table>
          <TableHeader className="bg-white/30">
            <TableRow>
              <TableHead className="text-gray-800 font-semibold">Categoria</TableHead>
              <TableHead className="text-gray-800 font-semibold">Origem</TableHead>
              <TableHead className="text-gray-800 font-semibold">Modelo</TableHead>
              <TableHead className="text-gray-800 font-semibold">Série</TableHead>
              <TableHead className="text-gray-800 font-semibold">Ano</TableHead>
              <TableHead className="text-gray-800 font-semibold">Estado</TableHead>
              <TableHead className="text-gray-800 font-semibold">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => {
              const CategoryIcon = categoryIcons[machine.categoria] || Truck;
              const hasReserva = machine.reserva && machine.reserva.cliente;
              
              return (
                <TableRow 
                  key={machine.id} 
                  className="hover:bg-white/40 cursor-pointer border-t border-white/20" 
                  onClick={() => onRowClick(machine)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="w-5 h-5 text-zinc-500" />
                      <span className="font-medium text-gray-700">{machine.categoria}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {machine.origem && (
                      <Badge className={`${getOriginBadgeStyle(machine.origem)} font-semibold`}>
                        {getOriginLabel(machine.origem)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-gray-800">{machine.modelo}</TableCell>
                  <TableCell className="font-mono text-gray-600">{machine.serie}</TableCell>
                  <TableCell className="text-gray-600">{machine.ano}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={`${statusColors[machine.estado]} whitespace-nowrap angled-clip px-3 py-1`}>
                          {machine.estado}
                        </Badge>
                        
                        {/* Mostrar badge de reserva separadamente */}
                        {hasReserva && (
                          <Badge className="bg-orange-100 text-orange-800 border-orange-200 whitespace-nowrap angled-clip px-2 py-1 text-xs">
                            RESERVADA
                          </Badge>
                        )}
                      </div>
                      
                      {/* Mostrar informações da reserva */}
                      {hasReserva && (
                        <div className="text-xs text-orange-800 bg-orange-50 p-1 rounded border border-orange-200">
                          <div><strong>Cliente:</strong> {machine.reserva.cliente}</div>
                          {machine.reserva.data && (
                            <div><strong>Data:</strong> {new Date(machine.reserva.data).toLocaleDateString('pt-PT')}</div>
                          )}
                          {machine.reserva.comercial && (
                            <div><strong>Comercial:</strong> {machine.reserva.comercial}</div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {userPermissions?.canEditMachine && (
                          <DropdownMenuItem onClick={() => onEdit(machine)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                        )}
                        {userPermissions?.canCreateOS && (
                          <DropdownMenuItem onClick={() => onCreateOS(machine)}>
                            <Wrench className="w-4 h-4 mr-2" />
                            Criar O.S.
                          </DropdownMenuItem>
                        )}
                        {userPermissions?.canReserveMachine && machine.estado !== 'Em Aluguer' && !hasReserva && (
                          <DropdownMenuItem onClick={() => onReserveMachine(machine)}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Reservar
                          </DropdownMenuItem>
                        )}
                        {userPermissions?.canCancelReservation && hasReserva && ( // New dropdown item
                          <DropdownMenuItem className="text-yellow-600" onClick={() => onCancelReservation(machine.id)}>
                            <CalendarX className="w-4 h-4 mr-2" />
                            Cancelar Reserva
                          </DropdownMenuItem>
                        )}
                        {userPermissions?.canDeleteMachine && (
                          <DropdownMenuItem className="text-red-500" onClick={() => onDelete(machine.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
