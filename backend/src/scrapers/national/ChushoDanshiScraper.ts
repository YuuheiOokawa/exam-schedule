import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class ChushoDanshiScraper extends BaseScraper {
  constructor(officialUrl: string) {
    super('中小企業診断士', officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.j-smeca.jp/contents/010_c_/010_shikenmondai.html');
      const result = this.buildResult();
      result.source_url = 'https://www.j-smeca.jp/contents/010_c_/010_shikenmondai.html';
      result.exam_fee = '14,500円（1次）';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // 1次試験日を優先して取得
      const examMatch = bodyText.match(/1次試験.{0,200}|一次試験.{0,200}|試験日.{0,200}/);
      if (examMatch) {
        const dates = [...examMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      const appMatch = bodyText.match(/申込受付.{0,200}|受験申込.{0,200}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `1次試験日: ${result.exam_date}（中小企業診断協会公式サイトより取得）`
        : '中小企業診断士は年1回（1次：8月、2次：10月）実施。最新日程は公式サイトをご確認ください。';

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
