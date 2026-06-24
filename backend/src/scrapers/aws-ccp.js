const { BaseScraper, NOT_AVAILABLE } = require('./base');

// AWS Certified Cloud Practitioner スクレイパー
// AWS認定試験はPearson VUEまたはPSIで随時受験
class AwsCcpScraper extends BaseScraper {
  async fetch() {
    try {
      const result = this.buildResult({ source_url: this.officialUrl });

      // AWS認定試験は随時受験可能
      result.exam_date = 'テストセンターまたはオンラインで随時受験可能';
      result.application_start_date = '随時申込可能';
      result.application_end_date = '随時申込可能';
      result.result_announcement_date = '受験直後に仮スコア表示（正式結果は5営業日以内）';
      result.exam_fee = '15,000円（税込）※時期により変動する場合あり';
      result.note = 'AWS Certified Cloud Practitioner（CLF-C02）はPearson VUEまたはPSIで受験できます。試験時間：90分、問題数：65問。公式サイトで最新の受験料を確認してください。';

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

module.exports = AwsCcpScraper;
