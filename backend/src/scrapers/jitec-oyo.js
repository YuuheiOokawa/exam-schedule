const { BaseScraper, NOT_AVAILABLE } = require('./base');

// IPA 応用情報技術者試験スクレイパー
// 公式: https://www.ipa.go.jp/shiken/kubun/ap.html
class JitecOyoScraper extends BaseScraper {
  async fetch() {
    try {
      const $ = await this.fetchHtml(this.officialUrl);
      const result = this.buildResult({ source_url: this.officialUrl });
      const pageText = $('body').text();

      // 応用情報は年2回（春期4月・秋期10月）
      result.exam_date = '年2回実施（春期：4月第3日曜日、秋期：10月第3日曜日）';
      result.application_start_date = '各試験の約3〜4ヶ月前';
      result.application_end_date = '各試験の約2ヶ月前';
      result.result_announcement_date = '各試験の約2ヶ月後';

      // 受験手数料
      const feeMatch = pageText.match(/7[,，]500円|7500円/);
      if (feeMatch) {
        result.exam_fee = '7,500円（税込）';
      } else {
        result.exam_fee = '7,500円（税込）※公式ページで要確認';
      }

      result.note = 'IPA 応用情報技術者試験（AP）は年2回（春期・秋期）実施されます。具体的な日程は公式サイトで確認してください。';

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: this.buildResult({ note: `取得エラー: ${error.message}` })
      };
    }
  }
}

module.exports = JitecOyoScraper;
