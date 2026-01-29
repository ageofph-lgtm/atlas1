import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";
import { Notificacao } from "@/entities/all";
import { User } from "@/entities/User";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user || !user) { // Load notifications regardless of auth status
      loadNotifications();
      // Set up periodic refresh
      const interval = setInterval(loadNotifications, 10000); // 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await User.me();
      setUser(userData);
    } catch (error) {
      console.log("User not authenticated, loading notifications anyway");
    }
  };

  const loadNotifications = async () => {
    try {
      // Load notifications for 'all' users
      const data = await Notificacao.filter(
        { userId: 'all' },
        '-created_date',
        20
      );
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
      // Try to get all notifications if filter fails
      try {
        const allData = await Notificacao.list('-created_date', 20);
        setNotifications(allData);
        setUnreadCount(allData.filter(n => !n.isRead).length);
      } catch (err) {
        console.error("Erro ao carregar todas as notificações:", err);
      }
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await Notificacao.update(notificationId, { isRead: true });
      await loadNotifications();
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await Promise.all(
        unreadNotifications.map(n => Notificacao.update(n.id, { isRead: true }))
      );
      await loadNotifications();
    } catch (error) {
      console.error("Erro ao marcar todas como lidas:", error);
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative z-30">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon" className="relative glass-effect">
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0 bg-white/30 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 ring-1 ring-inset ring-white/10 z-50" 
          align="end"
        >
          <div className="p-4 border-b border-b-white/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Notificações</h3>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={markAllAsRead}
                  className="text-xs text-blue-700 hover:bg-white/10"
                >
                  Marcar todas como lidas
                </Button>
              )}
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-b-white/10 cursor-pointer transition-colors hover:bg-white/10 ${
                    !notification.isRead ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <p className="text-sm font-medium text-gray-900">
                    {notification.message}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-gray-600">
                      {notification.created_date 
                        ? new Date(notification.created_date).toLocaleString('pt-PT')
                        : 'Agora'
                      }
                    </p>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}