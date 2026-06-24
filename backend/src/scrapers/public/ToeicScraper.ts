import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class ToeicScraper extends BaseScraper {
  constructor(officialUrl: string) {
    super('TOEIC Listening & Reading Test', officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.iibc-global.org/toeic/test/lr/schedule.html');
      const result = this.buildResult();
      result.source_url = 'https://www.iibc-global.org/toeic/test/lr/schedule.html';
      result.exam_fee = '7,810円（税込）';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // 最初に出てくる「試験日」の日付を取得
      const examMatch = bodyText.match(/試験日[\s：:]*(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (examMatch) {
        result.exam_date = `${examMatch[1]}-${examMatch[2].padStart(2, '0')}-${examMatch[3].padStart(2, '0')}`;
      }

      // 申込受付期間
      const appSection = bodyText.match(/申込受付.{0,200}/);
      if (appSection) {
        const dates = [...appSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（IIBC公式サイトより取得）`
        : 'TOEIC L&Rは年10回程度実施。最新の試験日程は公式サイトをご確認ください。';

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
