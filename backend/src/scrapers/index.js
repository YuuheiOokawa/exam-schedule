const JitecKihonScraper = require('./jitec-kihon');
const JitecOyoScraper = require('./jitec-oyo');
const OracleMasterScraper = require('./oracle-master');
const AwsCcpScraper = require('./aws-ccp');
const AwsSaaScraper = require('./aws-saa');
const JavaSilverScraper = require('./java-silver');
const JavaGoldScraper = require('./java-gold');

// 資格名とスクレイパーのマッピング
// 新しい資格を追加する場合はここに追記する
const SCRAPER_MAP = {
  '基本情報技術者試験': JitecKihonScraper,
  '応用情報技術者試験': JitecOyoScraper,
  'Oracle Master Bronze DBA 2019': OracleMasterScraper,
  'AWS Certified Cloud Practitioner': AwsCcpScraper,
  'AWS Certified Solutions Architect - Associate': AwsSaaScraper,
  'Java SE 11 Silver': JavaSilverScraper,
  'Java SE 11 Gold': JavaGoldScraper,
};

async function runScraper(qualificationName, qualificationId, officialUrl) {
  const ScraperClass = SCRAPER_MAP[qualificationName];
  if (!ScraperClass) {
    return {
      success: false,
      error: `スクレイパーが未実装: ${qualificationName}`,
      data: null
    };
  }

  const scraper = new ScraperClass(qualificationId, officialUrl);
  return scraper.fetch();
}

module.exports = { runScraper, SCRAPER_MAP };
