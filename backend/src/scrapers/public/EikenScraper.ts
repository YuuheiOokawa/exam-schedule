import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class EikenScraper extends BaseScraper {
  private readonly grade: string;

  constructor(officialUrl: string, grade: string) {
    super(`実用英語技能検定 (英検) ${grade}`, officialUrl);
    this.grade = grade;
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.eiken.or.jp/eiken/exam/schedule.html');
      const result = this.buildResult();
      result.source_url = 'https://www.eiken.or.jp/eiken/exam/schedule.html';
      result.exam_fee = this.grade === '1級' ? '12,900円' : this.grade === '準1級' ? '12,000円' : '9,800円';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // 英検は年3回（6月・10月・1月）実施
      // ページから次回の一次試験日を探す
      const primaryDates = [...bodyText.matchAll(/一次試験[\s\S]*?(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
      if (primaryDates[0]) {
        const [, y, m, d] = primaryDates[0];
        result.exam_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
      }

      // 申込期間
      const appMatch = bodyText.match(/申込期間.{0,150}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回一次試験: ${result.exam_date}（英検公式サイトより取得）`
        : `英検${this.grade}は年3回（6月・10月・1月）実施。詳細は公式サイトをご確認ください。`;

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
