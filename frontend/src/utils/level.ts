import type { DifficultyLevel } from '@/constants/levels';
import { LEVEL_CONFIG } from '@/constants/levels';

export function getQualificationLevel(name: string, mainCategory: string): DifficultyLevel {
  // Expert: top-tier qualifications requiring deep expertise
  if (/公認会計士|税理士|中小企業診断士|CISSP|CCNP|CCIE|LPIC-3|エキスパート試験|E資格|統計検定\s?1級|高度情報処理/.test(name)) {
    return 'expert';
  }

  // Advanced: professional-level hard qualifications
  if (/応用情報|Professional|社会保険労務士|社労士|行政書士|一級建築士|第一種電気|調理師|医師|看護師|薬剤師|介護福祉士|PMP|ITIL|G検定|CCNA|LPIC-2|IELTS|TOEFL|HSK [456]|英検[・\s]?[準]?1|Specialty/.test(name)) {
    return 'advanced';
  }

  // Intermediate: associate-level
  if (/基本情報|Associate|Silver|宅地建物|第二種電気|2級|二級|LPIC-1|LPIC Level 1|CompTIA|Security\+|TOEIC|HSK [123]|JLPT N[123]|英検[・\s]?準?2|統計検定\s?[23]|FP.?2|FP.?3/.test(name)) {
    return 'intermediate';
  }

  // Entry: beginner/foundation
  if (/パスポート|Fundamentals?|Foundation|Cloud Practitioner|AZ-900|Bronze|3級|三級|ITパスポート|FP.?[23]/.test(name)) {
    return 'entry';
  }

  // Default by main category
  if (mainCategory === '国家資格') return 'advanced';
  if (mainCategory === '公的資格') return 'basic';
  return 'basic';
}

export function getLevelConfig(name: string, mainCategory: string) {
  const level = getQualificationLevel(name, mainCategory);
  return { level, ...LEVEL_CONFIG[level] };
}
