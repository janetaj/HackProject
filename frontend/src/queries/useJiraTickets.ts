import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jiraService } from '../services/jira.service';
import { TicketFilters } from '../types/jira.types';
import { queryKeys } from '../config/query-keys.config';

export function useJiraTickets(filters: TicketFilters) {
  return useQuery({
    queryKey: queryKeys.jiraTickets.list(filters),
    queryFn: () => jiraService.getTickets(filters),
  });
}

export function useSyncJiraTickets() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => jiraService.syncTickets(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jiraTickets.all });
    },
  });
}
