import { useQuery } from '@tanstack/react-query';
import { qualificationService } from '@/services/qualificationService';
import type { QualificationDetail } from '@/types/qualification';

interface UseQualificationsParams {
  search?: string;
  main_category?: string;
  sub_category?: string;
}

export function useQualifications(params?: UseQualificationsParams) {
  return useQuery({
    queryKey: ['qualifications', params],
    queryFn: () => qualificationService.getAll(params),
    staleTime: 1000 * 30,
  });
}

export function useQualificationDetail(id: number) {
  return useQuery<QualificationDetail>({
    queryKey: ['qualifications', id],
    queryFn: () => qualificationService.getById(id),
    enabled: !!id,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: () => qualificationService.getCategories(),
    staleTime: 1000 * 60 * 5,
  });
}
