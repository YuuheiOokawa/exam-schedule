import { BaseScraper } from '../base/BaseScraper.js';
import { ScraperResult } from '../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

const FEES: Record<string, string> = {
  '第1種': '11,300円',
  '第2種': '9,600円',
};

const URLS: Record<string, string> = {
  '第1種': 'https://www.shiken.or.jp/examination/e-construction01.html',
  '第2種': 'https://www.shiken.or.jp/examination/e-construction02.html',
};

export class DenkiKojiScraper extends BaseScraper {
  private readonly type: string;

  constructor(officialUrl: string, type: string) {
    super(`電気工事士 ${type}`, officialUrl);
    this.type = type;
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const url = URLS[this.type] ?? this.officialUrl;
      const $ = await this.fetchHtml(url);
      const result = this.buildResult();
      result.source_url = url;
      result.exam_fee = FEES[this.type] ?? '要確認';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // 上期・下期のうち直近の筆記試験日を取得
      const examMatch = bodyText.match(/筆記試験.{0,200}|試験日.{0,200}/);
      if (examMatch) {
        const dates = [...examMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.exam_date = toIso(dates[0][0]);
      }

      const appMatch = bodyText.match(/受付期間.{0,200}|申込期間.{0,200}/);
      if (appMatch) {
        const dates = [...appMatch[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（電気技術者試験センター公式サイトより取得）`
        : `電気工事士${this.type}は年2回（上期・下期）実施。最新日程は公式サイトをご確認ください。`;

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
