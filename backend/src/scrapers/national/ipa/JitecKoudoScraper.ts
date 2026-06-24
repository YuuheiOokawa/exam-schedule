import { BaseScraper } from '../../base/BaseScraper.js';
import { ScraperResult } from '../../../types/index.js';

const toIso = (jpDate: string): string => {
  const m = jpDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  if (!m) return '';
  return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Generic scraper for all IPA 高度情報処理技術者試験.
// All share the same schedule page and exam fee.
export class JitecKoudoScraper extends BaseScraper {
  constructor(officialUrl: string, qualName: string) {
    super(qualName, officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const $ = await this.fetchHtml('https://www.ipa.go.jp/shiken/schedule/index.html');
      const result = this.buildResult();
      result.exam_fee = '7,500円（税込）';
      result.source_url = 'https://www.ipa.go.jp/shiken/schedule/index.html';

      const bodyText = $('body').text().replace(/[\r\n\t]+/g, ' ');

      const section = bodyText.match(new RegExp(`${escapeRegex(this.qualificationName)}.{0,500}`));
      if (section) {
        const dates: string[] = [];
        for (const d of section[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)) {
          dates.push(`${d[1]}-${d[2].padStart(2, '0')}-${d[3].padStart(2, '0')}`);
        }
        if (dates[0]) result.exam_date = dates[0];
        if (dates[1]) result.result_announcement_date = dates[1];
      }

      // 受付期間 is shared across IPA exams on the same page
      const appSection = bodyText.match(/受付期間.{0,200}/);
      if (appSection) {
        const dates = [...appSection[0].matchAll(/(\d{4})年(\d{1,2})月(\d{1,2})日/g)];
        if (dates[0]) result.application_start_date = toIso(dates[0][0]);
        if (dates[1]) result.application_end_date = toIso(dates[1][0]);
      }

      result.note = result.exam_date
        ? `次回試験日: ${result.exam_date}（IPAスケジュールページより取得）`
        : `${this.qualificationName}は年2回（春4月・秋10月）実施。最新日程は公式サイトをご確認ください。`;

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
