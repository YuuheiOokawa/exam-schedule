export function formatExamFormat(format: string): string {
  const map: Record<string, string> = {
    fixed_date: '固定日程',
    anytime: '随時受験',
    regional: '地域別日程',
  };
  return map[format] ?? format;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '…';
}
