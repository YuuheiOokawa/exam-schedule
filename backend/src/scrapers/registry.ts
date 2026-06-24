import { BaseScraper } from './base/BaseScraper.js';
import { JitecKihonScraper } from './national/ipa/JitecKihon.js';
import { JitecOyoScraper } from './national/ipa/JitecOyo.js';
import { JitecKoudoScraper } from './national/ipa/JitecKoudoScraper.js';
import { EikenScraper } from './public/EikenScraper.js';
import { ToeicScraper } from './public/ToeicScraper.js';
import { NisshoBookkeepingScraper } from './public/NisshoBookkeepingScraper.js';
import { JlptScraper } from './public/JlptScraper.js';
import { DenkiKojiScraper } from './public/DenkiKojiScraper.js';
import { GKenteiScraper } from './private/GKenteiScraper.js';
import { EShikakuScraper } from './private/EShikakuScraper.js';
import { TakkenScraper } from './national/TakkenScraper.js';
import { GyoseiScraper } from './national/GyoseiScraper.js';
import { SharosiScraper } from './national/SharosiScraper.js';
import { FpScraper } from './national/FpScraper.js';
import { ChushoDanshiScraper } from './national/ChushoDanshiScraper.js';

type ScraperFactory = (officialUrl: string) => BaseScraper;

export const SCRAPER_REGISTRY: Record<string, ScraperFactory> = {
  // ─── 国家資格 / IT・情報 (IPA) ─────────────────────────────────────
  '基本情報技術者試験':                       (url) => new JitecKihonScraper(url),
  '応用情報技術者試験':                       (url) => new JitecOyoScraper(url),
  '情報安全確保支援士試験':                   (url) => new JitecKoudoScraper(url, '情報安全確保支援士試験'),
  'ネットワークスペシャリスト試験':           (url) => new JitecKoudoScraper(url, 'ネットワークスペシャリスト試験'),
  'データベーススペシャリスト試験':           (url) => new JitecKoudoScraper(url, 'データベーススペシャリスト試験'),
  'プロジェクトマネージャ試験':               (url) => new JitecKoudoScraper(url, 'プロジェクトマネージャ試験'),
  'システムアーキテクト試験':                 (url) => new JitecKoudoScraper(url, 'システムアーキテクト試験'),
  'ITストラテジスト試験':                     (url) => new JitecKoudoScraper(url, 'ITストラテジスト試験'),
  'システム監査技術者試験':                   (url) => new JitecKoudoScraper(url, 'システム監査技術者試験'),
  'ITサービスマネージャ試験':                 (url) => new JitecKoudoScraper(url, 'ITサービスマネージャ試験'),
  'エンベデッドシステムスペシャリスト試験':   (url) => new JitecKoudoScraper(url, 'エンベデッドシステムスペシャリスト試験'),

  // ─── 公的資格 / 語学 ───────────────────────────────────────────────
  '実用英語技能検定 (英検) 1級':   (url) => new EikenScraper(url, '1級'),
  '実用英語技能検定 (英検) 準1級': (url) => new EikenScraper(url, '準1級'),
  '実用英語技能検定 (英検) 2級':   (url) => new EikenScraper(url, '2級'),
  '実用英語技能検定 (英検) 準2級': (url) => new EikenScraper(url, '準2級'),
  '実用英語技能検定 (英検) 3級':   (url) => new EikenScraper(url, '3級'),
  'TOEIC Listening & Reading Test': (url) => new ToeicScraper(url),
  '日本語能力試験 (JLPT) N1':      (url) => new JlptScraper(url, 'N1'),
  '日本語能力試験 (JLPT) N2':      (url) => new JlptScraper(url, 'N2'),

  // ─── 公的資格 / 会計・簿記 ────────────────────────────────────────
  '日商簿記 1級': (url) => new NisshoBookkeepingScraper(url, '1級'),
  '日商簿記 2級': (url) => new NisshoBookkeepingScraper(url, '2級'),
  '日商簿記 3級': (url) => new NisshoBookkeepingScraper(url, '3級'),

  // ─── 国家資格 / 法律・行政 ────────────────────────────────────────
  '宅地建物取引士 (宅建士)': (url) => new TakkenScraper(url),
  '行政書士':                (url) => new GyoseiScraper(url),
  '社会保険労務士 (社労士)': (url) => new SharosiScraper(url),
  '中小企業診断士':          (url) => new ChushoDanshiScraper(url),

  // ─── 国家資格 / 会計・税務 ────────────────────────────────────────
  'ファイナンシャルプランナー 1級 (FP1級)': (url) => new FpScraper(url, '1級'),
  'ファイナンシャルプランナー 2級 (FP2級)': (url) => new FpScraper(url, '2級'),
  'ファイナンシャルプランナー 3級 (FP3級)': (url) => new FpScraper(url, '3級'),

  // ─── 国家資格 / 工業・電気 ────────────────────────────────────────
  '電気工事士 第1種': (url) => new DenkiKojiScraper(url, '第1種'),
  '電気工事士 第2種': (url) => new DenkiKojiScraper(url, '第2種'),

  // ─── 民間資格 / データ・AI ────────────────────────────────────────
  'G検定 (ジェネラリスト検定)': (url) => new GKenteiScraper(url),
  'E資格 (エンジニア資格)':     (url) => new EShikakuScraper(url),
};

// Map version for scheduler (uses .get())
export const scraperRegistry = new Map<string, ScraperFactory>(Object.entries(SCRAPER_REGISTRY));

export function createScraper(qualificationName: string, officialUrl: string): BaseScraper | null {
  const factory = SCRAPER_REGISTRY[qualificationName];
  if (!factory) return null;
  return factory(officialUrl);
}

export function isScrapable(qualificationName: string): boolean {
  return qualificationName in SCRAPER_REGISTRY;
}

export function getScrapableNames(): string[] {
  return Object.keys(SCRAPER_REGISTRY);
}
