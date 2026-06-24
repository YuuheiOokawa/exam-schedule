const { BaseScraper, NOT_AVAILABLE } = require('./base');

// AWS Certified Solutions Architect - Associate スクレイパー
class AwsSaaScraper extends BaseScraper {
  async fetch() {
    try {
      const result = this.buildResult({ source_url: this.officialUrl });

      result.exam_date = 'テストセンターまたはオンラインで随時受験可能';
      result.application_start_date = '随時申込可能';
      result.application_end_date = '随時申込可能';
      result.result_announcement_date = '受験直後に仮スコア表示（正式結果は5営業日以内）';
      result.exam_fee = '20,000円（税込）※時期により変動する場合あり';
      result.note = 'AWS Certified Solutions Architect - Associate（SAA-C03）はPearson VUEまたはPSIで受験できます。試験時間：130分、問題数：65問。公式サイトで最新の受験料を確認してください。';

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

module.exports = AwsSaaScraper;
