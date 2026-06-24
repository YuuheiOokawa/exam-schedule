import { format, parseISO, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'yyyy年M月d日(EEEEEE)', { locale: ja });
  } catch {
    return dateStr;
  }
}

export function formatDatetime(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'yyyy/MM/dd HH:mm', { locale: ja });
  } catch {
    return dateStr;
  }
}

export function isDateFormat(value: string | null | undefined): boolean {
  if (!value) return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}
