
import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Calendar as CalendarIcon,
    CheckCircle2,
    Circle,
    ArrowUpCircle,
    Pencil,
    Trash2,
    MoreVertical,
    User,
    AlertTriangle,
    Clock
} from "lucide-react";
import { format } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PRIORITY_COLORS = {
    'normal': 'bg-blue-500 hover:bg-blue-600 text-white',
    'alta': 'bg-amber-500 hover:bg-amber-600 text-white',
    'urgente': 'bg-red-500 hover:bg-red-600 text-white'
};

const STATUS_ICONS = {
    'a-fazer': <Circle className="w-5 h-5 text-gray-400" />,
    'priorizado': <AlertTriangle className="w-5 h-5 text-blue-500" />,
    'em-progresso': <ArrowUpCircle className="w-5 h-5 text-yellow-500" />,
    'aguardando': <Circle className="w-5 h-5 text-orange-500" />,
    'concluido': <CheckCircle2 className="w-5 h-5 text-green-500" />
};

// Helper function for origin styling
const getOriginStyle = (origem) => {
    switch(origem) {
        case 'nova':
            return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'sts':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'uts':
            return 'bg-orange-100 text-orange-800 border-orange-300';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};

const getOriginLabel = (origem) => {
    switch(origem) {
        case 'nova': return 'N';
        case 'sts': return 'S';
        case 'uts': return 'U';
        default: return '?';
    }
};

export default function OSCard({ 
    os, 
    onOpenDetails, 
    onEdit, 
    onDelete, 
    onStatusChange, 
    allStatuses, 
    userPermissions, 
    isTop = false,
    isDragging = false
}) {
    const completedTasks = os.tasks?.filter(t => t.completed).length || 0;
    const totalTasks = os.tasks?.length || 0;
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const isOverdue = () => {
        if (!os.dataEntrega || os.status === 'concluido') return false;
        const deliveryDate = new Date(os.dataEntrega);
        const today = new Date();
        deliveryDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        return deliveryDate < today;
    };

    const handleQuickStatusChange = (newStatus) => {
        if (userPermissions?.canAccessOSStatus?.(newStatus)) {
            onStatusChange(os.id, newStatus);
        }
    };

    // Check if machine has reservation (from caracteristicasMaquina or related data)
    const hasReservation = os.caracteristicasMaquina?.reserva || os.reserva;

    return (
        <div className={`w-full h-full ${isTop ? 'cursor-grab' : 'pointer-events-none'} ${isDragging ? 'cursor-grabbing' : ''}`}>
            <Card 
                className={`kanban-card-clip bg-gradient-to-br from-white/95 via-gray-100/90 to-gray-400/80 backdrop-blur-md text-gray-900 transition-shadow,border-color duration-100 border border-white/40 shadow-2xl min-h-[360px] h-full flex flex-col relative overflow-hidden ${isDragging ? 'shadow-xl border-blue-400' : 'hover:shadow-lg'}`}
                onClick={isTop && !isDragging ? () => onOpenDetails(os) : undefined}
            >
                {/* Logo marca d'água */}
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dc340a4ed_LogoGeomtricoATLAScomOlhoCircular-Photoroom.png"
                  alt="ATLAS"
                  className="absolute bottom-0 right-0 w-48 h-48 opacity-[0.08] transform translate-x-12 translate-y-10 pointer-events-none"
                />
                
                <CardHeader className="pb-4 space-y-0 relative z-10">
                    {/* Header with model, origin and actions */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-xl text-gray-900">
                                    {os.modelo}
                                </h3>
                                {os.origemMaquina && (
                                    <Badge 
                                        className={`${getOriginStyle(os.origemMaquina)} text-xs px-2 py-1 font-bold rounded-md border`}
                                        title={`Origem: ${os.origemMaquina.toUpperCase()}`}
                                    >
                                        {getOriginLabel(os.origemMaquina)}
                                    </Badge>
                                )}
                            </div>
                            {os.ano && (
                                <p className="text-sm font-medium text-gray-600">({os.ano})</p>
                            )}
                        </div>

                        {isTop && !isDragging && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-600 hover:text-gray-900 hover:bg-black/10">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-white/95 backdrop-blur-md border-gray-200">
                                    {Object.entries(allStatuses).map(([statusKey, statusConfig]) => {
                                        if (statusKey === os.status) return null;
                                        if (!userPermissions?.canAccessOSStatus?.(statusKey)) return null;
                                        
                                        const StatusIcon = statusConfig.icon;
                                        return (
                                            <DropdownMenuItem 
                                                key={statusKey}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleQuickStatusChange(statusKey);
                                                }}
                                                className="hover:bg-gray-100"
                                            >
                                                <StatusIcon className={`w-4 h-4 mr-2 ${statusConfig.color}`} />
                                                Mover para {statusConfig.title}
                                            </DropdownMenuItem>
                                        );
                                    })}
                                    
                                    {userPermissions?.canEditOS && onEdit && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(os); }} className="hover:bg-gray-100">
                                            <Pencil className="w-4 h-4 mr-2" />
                                            Editar O.S.
                                        </DropdownMenuItem>
                                    )}
                                    {userPermissions?.canDeleteOS && onDelete && (
                                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(os.id); }} className="hover:bg-gray-100 text-red-600 hover:text-red-700">
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Eliminar O.S.
                                        </DropdownMenuItem>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>

                    {/* Serial Number */}
                    <div className="bg-black/15 backdrop-blur-sm rounded-lg p-3 angled-clip border border-gray-300/50 relative z-10">
                        <p className="text-xl font-bold font-mono text-red-600 text-center tracking-widest">{os.serie}</p>
                    </div>

                </CardHeader>

                <CardContent className="pt-0 pb-4 flex-grow flex flex-col justify-end relative z-10">
                    {/* Priority and Status Badges */}
                    <div className="flex items-center gap-2 mb-4">
                        <Badge className={`${PRIORITY_COLORS[os.prioridade] || PRIORITY_COLORS.normal} text-sm font-bold px-4 py-2 angled-clip shadow-md`}>
                            {os.prioridade?.toUpperCase()}
                        </Badge>
                        {isOverdue() && (
                            <Badge className="bg-red-500 text-white text-xs font-bold px-3 py-1 ml-2 angled-clip shadow-sm">
                                ATRASO
                            </Badge>
                        )}
                    </div>
                
                    {/* Client and Delivery Info */}
                    <div className="space-y-3 mb-4">
                        {os.cliente && (
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-700 truncate">{os.cliente}</p>
                            </div>
                        )}
                        {os.dataEntrega && (
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-gray-700">
                                    Entrega: {format(new Date(os.dataEntrega), 'dd/MM/yyyy')}
                                </p>
                            </div>
                        )}
                        {hasReservation && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                <p className="text-sm font-medium text-amber-700">
                                    Máquina Reservada
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Task Progress */}
                    {totalTasks > 0 && (
                        <div className="bg-black/10 backdrop-blur-sm rounded-lg p-3 angled-clip border border-gray-300/50 mt-auto">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="font-medium text-gray-700">Progresso</span>
                                <span className="font-bold text-gray-900">{completedTasks}/{totalTasks}</span>
                            </div>
                            <div className="w-full bg-gray-300/60 rounded-full h-2 angled-clip">
                                <div 
                                    className={`h-2 rounded-full transition-all duration-300 angled-clip ${
                                        progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                                    }`}
                                    style={{ width: `${progress}%` }}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
