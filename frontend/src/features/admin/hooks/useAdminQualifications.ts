import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type QualificationFormData, type ScheduleFormData } from '@/services/adminService';
import { useToast } from '@/contexts/ToastContext';

export function useAdminQualifications() {
  return useQuery({
    queryKey: ['admin-qualifications'],
    queryFn: adminService.getAll,
  });
}

export function useCreateQualification() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: QualificationFormData) => adminService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      showToast('success', '資格を追加しました');
    },
    onError: () => showToast('error', '資格の追加に失敗しました'),
  });
}

export function useUpdateQualification() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<QualificationFormData> }) =>
      adminService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      showToast('success', '資格を更新しました');
    },
    onError: () => showToast('error', '資格の更新に失敗しました'),
  });
}

export function useDeleteQualification() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (id: number) => adminService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      showToast('success', '削除しました');
    },
    onError: () => showToast('error', '削除に失敗しました'),
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: ({ scheduleId, qualificationId, data }: { scheduleId: number | null; qualificationId: number; data: ScheduleFormData }) =>
      scheduleId !== null
        ? adminService.updateScheduleById(scheduleId, data)
        : adminService.updateSchedule(qualificationId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      showToast('success', 'スケジュールを保存しました');
    },
    onError: () => showToast('error', 'スケジュールの保存に失敗しました'),
  });
}

export function useUploadScheduleCsv() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (csvText: string) => adminService.uploadScheduleCsv(csvText),
    onSuccess: (data) => {
      const urlPart = data.urlUpdated > 0 ? ` / URL更新: ${data.urlUpdated}件` : '';
      const msg = `更新: ${data.updated}件 / 新規: ${data.inserted}件 / スキップ: ${data.skipped}件${urlPart}`;
      showToast(data.errors.length === 0 ? 'success' : 'info', msg);
      queryClient.invalidateQueries({ queryKey: ['admin-qualifications'] });
      queryClient.invalidateQueries({ queryKey: ['qualifications'] });
    },
    onError: () => showToast('error', 'CSVアップロードに失敗しました'),
  });
}
