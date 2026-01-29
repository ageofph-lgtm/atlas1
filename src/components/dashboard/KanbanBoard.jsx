import React from "react";
import { DragDropContext, Droppable } from "@hello-pangea/dnd";
import { Skeleton } from "@/components/ui/skeleton";
import CardStack from "./CardStack";

export default function KanbanBoard({ 
  ordensServico, 
  onStatusChange, 
  onOpenDetails,
  onEditOS,
  onDeleteOS, 
  isLoading, 
  columns,
  userPermissions,
  onUpdate
}) {
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;
    
    if (!userPermissions?.canAccessOSStatus(newStatus)) {
      console.log(`Usuário não tem permissão para mover para ${newStatus}`);
      return;
    }
    
    await onStatusChange(draggableId, newStatus);
    
    if (onUpdate) {
      setTimeout(() => {
        onUpdate(true);
      }, 500); 
    }
  };

  const getColumnOrders = (status) => {
    return ordensServico.filter(os => (os.status === status) || (!os.status && status === 'a-fazer'));
  };

  const getVisibleColumns = () => {
    if (userPermissions?.canViewAllColumns) {
      return Object.entries(columns);
    }
    
    if (!userPermissions || userPermissions.allowedOSStatuses.length === 0) {
      return Object.entries(columns);
    }
    
    return Object.entries(columns).filter(([status]) => 
      userPermissions.allowedOSStatuses.includes(status)
    );
  };

  const visibleColumns = getVisibleColumns();

  return (
    <DragDropContext onDragEnd={userPermissions?.canMoveOSCards ? handleDragEnd : () => {}}>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {isLoading
          ? visibleColumns.map(([status, config]) => (
              <div key={status} className="flex flex-col gap-4">
                <Skeleton className="h-12 w-full angled-clip" />
                <Skeleton className="h-72 w-48 rounded-xl" />
              </div>
            ))
          : visibleColumns.map(([status, config]) => {
              const columnOrders = getColumnOrders(status);
              
              return (
                <div key={status} className="flex flex-col gap-4">
                  {/* Column Header */}
                  <div className="flex items-center justify-between p-3 h-12 text-white font-bold text-sm uppercase angled-clip bg-gradient-to-r from-gray-900 via-gray-800 to-red-900">
                    <div className="flex items-center gap-2">
                       <config.icon className="w-5 h-5" />
                       <span>{config.title}</span>
                    </div>
                    <span className="bg-black/25 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
                      {columnOrders.length}
                    </span>
                  </div>

                  <Droppable 
                    droppableId={status} 
                    isDropDisabled={!userPermissions?.canMoveOSCards}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`min-h-[350px] transition-colors duration-200 rounded-lg p-2 ${
                          snapshot.isDraggingOver ? 'bg-gray-200/50' : ''
                        }`}
                      >
                        {columnOrders.length > 0 ? (
                          <CardStack
                            orders={columnOrders}
                            onOpenDetails={onOpenDetails}
                            onEdit={userPermissions?.canEditOS ? onEditOS : null}
                            onDelete={userPermissions?.canDeleteOS ? onDeleteOS : null}
                            onStatusChange={onStatusChange}
                            userPermissions={userPermissions}
                            allStatuses={columns}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center text-gray-400 pt-16">
                            <config.icon className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-sm font-medium">Nenhuma ordem aqui</p>
                          </div>
                        )}
                        <div style={{ display: 'none' }}>{provided.placeholder}</div>
                      </div>
                    )}
                  </Droppable>
                </div>
              );
        })}
      </div>
    </DragDropContext>
  );
}