import { BaseScraper } from '../../base/BaseScraper.js';
import { ScraperResult } from '../../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

export class JitecOyoScraper extends BaseScraper {
  constructor(officialUrl: string) {
    super('応用情報技術者試験', officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      // IPAスケジュールページから日程を取得
      const $ = await this.fetchHtml('https://www.ipa.go.jp/shiken/schedule/index.html');
      const result = this.buildResult();
      result.exam_fee = '7,500円（税込）';
      result.source_url = 'https://www.ipa.go.jp/shiken/schedule/index.html';

      // テーブルの各行を走査して応用情報の日程を探す
      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      // "応用情報技術者試験" の近辺にある日付パターンを探す
      const apSection = bodyText.match(/応用情報技術者試験.{0,500}/);
      if (apSection) {
        const dates = apSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g);
        const found: string[] = [];
        for (const d of dates) {
          found.push(`${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}`);
        }
        // 最初が試験日、2番目が結果発表日のことが多い
        if (found[0]) result.exam_date = found[0];
        if (found[1]) result.result_announcement_date = found[1];
      }

      // 受付期間を探す（"受付期間" の後の日付）
      const appSection = bodyText.match(/受付期間.{0,200}/);
      if (appSection) {
        const dates = [...appSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（IPAスケジュールページより取得）`
        : '応用情報技術者試験は年2回（春4月・秋10月）実施。最新日程は公式サイトをご確認ください。';

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
