const { BaseScraper, NOT_AVAILABLE } = require('./base');

// IPA 基本情報技術者試験スクレイパー
// 公式: https://www.ipa.go.jp/shiken/kubun/fe.html
class JitecKihonScraper extends BaseScraper {
  async fetch() {
    try {
      const $ = await this.fetchHtml(this.officialUrl);
      const result = this.buildResult({ source_url: this.officialUrl });

      // IPA試験はCBT方式で通年受験可能（特定試験日なし）
      // ページのテキストから概要情報を取得
      const pageText = $('body').text();

      // CBT方式の説明を探す
      if (pageText.includes('CBT') || pageText.includes('通年')) {
        result.exam_date = 'CBT方式（通年受験可能）。受験日は申込後に選択。';
        result.application_start_date = '随時受付';
        result.application_end_date = '随時受付';
      }

      // 受験手数料を探す
      const feeMatch = pageText.match(/7[,，]500円|7500円/);
      if (feeMatch) {
        result.exam_fee = '7,500円（税込）';
      } else {
        result.exam_fee = '7,500円（税込）※公式ページで要確認';
      }

      // 合格発表（CBTは即時）
      result.result_announcement_date = 'CBT方式のため受験直後に結果表示';

      result.note = 'IPA 基本情報技術者試験（FE）はCBT方式で通年受験可能です。受験申込はIPA公式サイトから行います。';

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

module.exports = JitecKihonScraper;
