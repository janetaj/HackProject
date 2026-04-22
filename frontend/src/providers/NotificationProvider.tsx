import React, { createContext, useContext, useEffect } from 'react';
import { toast } from 'sonner';
import { useSocket } from './SocketProvider';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../config/query-keys.config';

interface NotificationContextType {
  // Empty for now, but provides a place to add notification controls
}

const NotificationContext = createContext<NotificationContextType>({});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount });
      
      if (data.type === 'budget_alert') {
        toast.warning(data.message || 'Budget Alert');
      } else {
        toast.info(data.message || 'New Notification');
      }
    });

    socket.on('generation:complete', (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.generationQueue.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      toast.success(`${data.testCaseCount || 'Test cases'} generated for ${data.ticketKey}`);
    });

    socket.on('generation:failed', (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.generationQueue.all });
      toast.error(`Generation failed for ${data.ticketKey}: ${data.error}`);
    });

    socket.on('ticket:new', (data: any) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jiraTickets.all });
      toast.info(`${data.count || 1} new tickets detected in ${data.project}`);
    });

    return () => {
      socket.off('notification:new');
      socket.off('generation:complete');
      socket.off('generation:failed');
      socket.off('ticket:new');
    };
  }, [socket, queryClient]);

  return (
    <NotificationContext.Provider value={{}}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
