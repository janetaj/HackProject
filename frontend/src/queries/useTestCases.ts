import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testCaseService } from '../services/test-case.service';
import { TestCaseFilters } from '../types/test-case.types';
import { queryKeys } from '../config/query-keys.config';

export function useTestCases(filters: TestCaseFilters) {
  return useQuery({
    queryKey: queryKeys.testCases.list(filters),
    queryFn: () => testCaseService.getTestCases(filters),
  });
}

export function useApproveTestCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testCaseService.approveTestCase(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all });
    },
  });
}

export function useRejectTestCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => 
      testCaseService.rejectTestCase(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all });
    },
  });
}

export function useUpdateTestCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TestCase> }) => 
      testCaseService.updateTestCase(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.testCases.all });
    },
  });
}
