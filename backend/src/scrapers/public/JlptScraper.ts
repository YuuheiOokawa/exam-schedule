import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class JlptScraper extends BaseScraper {
  private readonly level: string;

  constructor(officialUrl: string, level: string) {
    super(`日本語能力試験 (JLPT) ${level}`, officialUrl);
    this.level = level;
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.jlpt.jp/apply/domestic.html');
      const result = this.buildResult();
      result.source_url = 'https://www.jlpt.jp/apply/domestic.html';
      result.exam_fee = '6,500円';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      const examMatch = bodyText.match(/試験日.{0,200}/);
      if (examMatch) {
        const dates = [...examMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      const appMatch = bodyText.match(/申込受付期間.{0,200}|受付期間.{0,200}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（JLPT公式サイトより取得）`
        : `JLPT ${this.level}は年2回（7月・12月）実施。最新日程は公式サイトをご確認ください。`;

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
