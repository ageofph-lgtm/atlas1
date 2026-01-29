import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar, AlertTriangle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths } from "date-fns";
import { pt } from "date-fns/locale";

const PRIORITY_COLORS = {
  'normal': 'bg-blue-100 text-blue-800 border-blue-200',
  'alta': 'bg-amber-100 text-amber-800 border-amber-200',
  'urgente': 'bg-red-100 text-red-800 border-red-200'
};

export default function CalendarView({ ordensServico, onOpenDetails, isLoading }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const ordensGroupedByDate = useMemo(() => {
    return ordensServico.reduce((acc, os) => {
      if (!os.dataEntrega) return acc;
      
      const date = format(new Date(os.dataEntrega), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(os);
      return acc;
    }, {});
  }, [ordensServico]);

  const getOrdersForDate = (date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    return ordensGroupedByDate[dateKey] || [];
  };

  const isOverdue = (date, os) => {
    const deliveryDate = new Date(os.dataEntrega);
    deliveryDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return deliveryDate < today && os.status !== 'concluido';
  };

  if (isLoading) {
    return (
      <Card className="bg-white/70 backdrop-blur-sm">
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">A carregar calendário...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/70 backdrop-blur-sm border-white/50 shadow-xl">
      <CardHeader className="border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Calendar className="w-5 h-5" />
            {format(currentDate, 'MMMM yyyy', { locale: pt })}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="bg-white/70"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="bg-white/70"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="grid grid-cols-7 gap-4">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 py-2">
              {day}
            </div>
          ))}
          
          {monthDays.map(day => {
            const ordersForDay = getOrdersForDate(day);
            const hasOrders = ordersForDay.length > 0;
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border rounded-lg transition-all duration-200 ${
                  isToday(day)
                    ? 'bg-blue-50 border-blue-200 shadow-md'
                    : hasOrders
                    ? 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className={`text-sm font-medium mb-2 ${
                  isToday(day) ? 'text-blue-700' : 'text-slate-700'
                }`}>
                  {format(day, 'd')}
                </div>
                
                <div className="space-y-1">
                  {ordersForDay.slice(0, 3).map(os => (
                    <div
                      key={os.id}
                      onClick={() => onOpenDetails(os)}
                      className="cursor-pointer group"
                    >
                      <div className={`text-xs p-2 rounded-lg border transition-all ${
                        PRIORITY_COLORS[os.prioridade] || PRIORITY_COLORS.normal
                      } group-hover:shadow-sm`}>
                        <div className="flex items-center gap-1">
                          {isOverdue(new Date(os.dataEntrega), os) && (
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                          )}
                          <span className="font-medium truncate">{os.modelo}</span>
                        </div>
                        <div className="text-xs opacity-75 truncate">
                          {os.cliente || os.serie}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {ordersForDay.length > 3 && (
                    <div className="text-xs text-slate-500 text-center py-1">
                      +{ordersForDay.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}