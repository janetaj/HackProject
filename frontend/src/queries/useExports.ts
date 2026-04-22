import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportService } from '../services/export.service';
import { queryKeys } from '../config/query-keys.config';

export function useExports(limit: number = 50, offset: number = 0) {
  return useQuery({
    queryKey: [...queryKeys.exports.history, { limit, offset }],
    queryFn: () => exportService.getExports(limit, offset),
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => exportService.triggerExport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.exports.history });
    },
  });
}
