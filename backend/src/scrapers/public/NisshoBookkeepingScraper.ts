import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

const FEE: Record<string, string> = {
  '1級': '7,850円',
  '2級': '4,720円',
  '3級': '2,850円',
};

export class NisshoBookkeepingScraper extends BaseScraper {
  private readonly grade: string;

  constructor(officialUrl: string, grade: string) {
    super(`日商簿記 ${grade}`, officialUrl);
    this.grade = grade;
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.kentei.ne.jp/bookkeeping/candidate');
      const result = this.buildResult();
      result.source_url = 'https://www.kentei.ne.jp/bookkeeping/candidate';
      result.exam_fee = FEE[this.grade] ?? '';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // 試験日の近くにある日付を抽出
      const examSection = bodyText.match(/試験日.{0,300}/);
      if (examSection) {
        const dates = [...examSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      // 申込期間
      const appSection = bodyText.match(/申込.{0,300}/);
      if (appSection) {
        const dates = [...appSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（日商公式サイトより取得）`
        : `日商簿記${this.grade}は年複数回実施。詳細は各地商工会議所にお問い合わせください。`;

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: this.buildResult(),
      };
    }
  }
}
