import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '../services/dashboard.service';
import { queryKeys } from '../config/query-keys.config';

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: () => dashboardService.getStats(),
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey: queryKeys.dashboard.activity,
    queryFn: () => dashboardService.getActivity(),
  });
}

export function useTokenUsage() {
  return useQuery({
    queryKey: queryKeys.dashboard.tokenUsage,
    queryFn: () => dashboardService.getTokenUsage(),
  });
}
