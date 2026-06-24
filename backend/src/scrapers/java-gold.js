const { BaseScraper, NOT_AVAILABLE } = require('./base');

// Java Gold スクレイパー
class JavaGoldScraper extends BaseScraper {
  async fetch() {
    try {
      const result = this.buildResult({ source_url: this.officialUrl });

      result.exam_date = 'Pearson VUEテストセンターにて随時受験可能';
      result.application_start_date = '随時申込可能';
      result.application_end_date = '随時申込可能';
      result.result_announcement_date = '受験直後に結果表示';
      result.exam_fee = '公式ページ上で確認できません（Pearson VUEで確認）';
      result.note = 'Java SE 11 Gold（1Z0-816）はPearson VUEで受験できます。試験時間：180分、問題数：80問、合格基準：63%。Silver合格後に受験を推奨。Pearson VUE公式サイトで受験料を確認してください。';

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

module.exports = JavaGoldScraper;
