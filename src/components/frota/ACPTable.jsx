import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Pencil, Trash2, Wrench, Calendar } from 'lucide-react';

export default function ACPTable({
  machines,
  isLoading,
  onEdit,
  onDelete,
  onCreateOS,
  onReserveMachine,
  onRowClick,
  statusColors,
  userPermissions
}) {
  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">A carregar máquinas...</p>
        </CardContent>
      </Card>
    );
  }

  if (machines.length === 0) {
    return (
      <Card className="bg-white shadow-sm border">
        <CardContent className="p-8 text-center">
          <p className="text-slate-500">Nenhuma máquina encontrada nesta categoria.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border overflow-hidden">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Modelo</TableHead>
              <TableHead>Nº Série</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Reserva</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {machines.map((machine) => (
              <TableRow 
                key={machine.id}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => onRowClick && onRowClick(machine)}
              >
                <TableCell className="font-medium">{machine.modelo}</TableCell>
                <TableCell>{machine.serie}</TableCell>
                <TableCell>
                  <Badge className={statusColors[machine.estado] || 'bg-gray-100 text-gray-800'}>
                    {machine.estado}
                  </Badge>
                </TableCell>
                <TableCell>
                  {machine.estado === 'Reservada' && machine.reserva?.cliente ? (
                    <div className="text-sm">
                      <p className="font-medium">{machine.reserva.cliente}</p>
                      {machine.reserva.data && (
                        <p className="text-slate-500">{new Date(machine.reserva.data).toLocaleDateString('pt-PT')}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-400">---</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {onEdit && userPermissions?.canEditMachine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(machine)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onCreateOS && userPermissions?.canCreateOS && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onCreateOS(machine)}
                        className="h-8 w-8"
                      >
                        <Wrench className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onReserveMachine && userPermissions?.canReserveMachine && machine.estado === 'Disponível' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onReserveMachine(machine)}
                        className="h-8 w-8"
                      >
                        <Calendar className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {onDelete && userPermissions?.canDeleteMachine && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(machine.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}