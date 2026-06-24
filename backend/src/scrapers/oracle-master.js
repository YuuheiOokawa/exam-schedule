const { BaseScraper, NOT_AVAILABLE } = require('./base');

// Oracle Master Bronze スクレイパー
// Oracle認定試験はPearson VUEで随時受験
class OracleMasterScraper extends BaseScraper {
  async fetch() {
    try {
      const result = this.buildResult({ source_url: this.officialUrl });

      // Oracle認定試験はPearson VUEで随時受験可能（特定試験日なし）
      result.exam_date = 'Pearson VUEテストセンターにて随時受験可能';
      result.application_start_date = '随時申込可能';
      result.application_end_date = '随時申込可能';
      result.result_announcement_date = '受験直後に結果表示';
      result.exam_fee = '公式ページ上で確認できません（Pearson VUEで確認）';
      result.note = 'Oracle認定試験はPearson VUEのテストセンターまたはオンラインで随時受験できます。詳細な受験料はPearson VUE公式サイト（https://home.pearsonvue.com/oracle）で確認してください。';

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

module.exports = OracleMasterScraper;
