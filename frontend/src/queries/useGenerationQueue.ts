import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generationService } from '../services/generation.service';
import { queryKeys } from '../config/query-keys.config';

export function useGenerationQueue(status?: string) {
  return useQuery({
    queryKey: queryKeys.generationQueue.list(status),
    queryFn: () => generationService.getQueue(status),
    refetchInterval: 2000,
  });
}

export function useQueueGeneration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ticketId: string) => generationService.queueJob(ticketId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.jiraTickets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.generationQueue.all });
    },
  });
}
