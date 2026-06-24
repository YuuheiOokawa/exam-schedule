const axios = require('axios');
const cheerio = require('cheerio');

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3',
};

const NOT_AVAILABLE = '公式ページ上で確認できません';

class BaseScraper {
  constructor(qualificationId, officialUrl) {
    this.qualificationId = qualificationId;
    this.officialUrl = officialUrl;
  }

  async fetchHtml(url) {
    const response = await axios.get(url, {
      headers: DEFAULT_HEADERS,
      timeout: 15000,
    });
    return cheerio.load(response.data);
  }

  buildResult(overrides = {}) {
    return {
      exam_date: NOT_AVAILABLE,
      application_start_date: NOT_AVAILABLE,
      application_end_date: NOT_AVAILABLE,
      result_announcement_date: NOT_AVAILABLE,
      exam_fee: NOT_AVAILABLE,
      source_url: this.officialUrl,
      note: NOT_AVAILABLE,
      ...overrides,
    };
  }

  // サブクラスで実装
  async fetch() {
    throw new Error('fetch() must be implemented by subclass');
  }
}

module.exports = { BaseScraper, NOT_AVAILABLE };
