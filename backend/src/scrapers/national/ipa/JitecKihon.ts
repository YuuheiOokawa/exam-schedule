import { BaseScraper } from '../../base/BaseScraper.js';
import { ScraperResult } from '../../../types/index.js';

export class JitecKihonScraper extends BaseScraper {
  constructor(officialUrl: string) {
    super('基本情報技術者試験', officialUrl);
  }

  async fetch(): Promise<ScraperResult> {
    try {
      const result = this.buildResult();
      result.note = '基本情報技術者試験はCBT方式のため随時受験可能です。最新の試験情報は公式サイトをご確認ください。';
      result.exam_fee = '7,500円（税込）';
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
