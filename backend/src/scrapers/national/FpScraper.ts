import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

const FP_FEES: Record<string, string> = {
  '1級': '12,000円',
  '2級': '8,700円',
  '3級': '6,000円',
};

export class FpScraper extends BaseScraper {
  private readonly grade: string;

  constructor(officialUrl: string, grade: string) {
    super(`ファイナンシャルプランナー ${grade} (FP${grade})`, officialUrl);
    this.grade = grade;
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.jafp.or.jp/exam/schedule/');
      const result = this.buildResult();
      result.source_url = 'https://www.jafp.or.jp/exam/schedule/';
      result.exam_fee = FP_FEES[this.grade] ?? '要確認';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      const examMatch = bodyText.match(/試験日.{0,200}/);
      if (examMatch) {
        const dates = [...examMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      const appMatch = bodyText.match(/申込受付.{0,200}|受付期間.{0,200}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（JAFP公式サイトより取得）`
        : `FP${this.grade}は年3回（1月・5月・9月）実施。最新日程は公式サイトをご確認ください。`;

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
