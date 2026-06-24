import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class EShikakuScraper extends BaseScraper {
  constructor(officialUrl: string) {
    super('E資格 (エンジニア資格)', officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.jdla.org/certificate/engineer/');
      const result = this.buildResult();
      result.source_url = 'https://www.jdla.org/certificate/engineer/';
      result.exam_fee = '33,000円（認定プログラム受講者）';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      const examMatch = bodyText.match(/試験日.{0,200}/);
      if (examMatch) {
        const dates = [...examMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      const appMatch = bodyText.match(/申込.{0,200}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（JDLA公式サイトより取得）`
        : 'E資格は年2回（2月・8月）実施。最新日程は公式サイトをご確認ください。';

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
