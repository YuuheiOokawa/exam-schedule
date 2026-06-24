// DBから資格データをCSVエクスポート + スクレイパー既知受験料をマージ
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATABASE_URL = 'postgresql://neondb_owner:npg_FBLM7E2gCnIk@ep-still-sun-apxqpesr.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require';

const sql = postgres(DATABASE_URL, {
  ssl: 'require',
  max: 3,
  connect_timeout: 15,
});

// スクレイパーから得られる既知の受験料（DBにデータがない場合のフォールバック）
const KNOWN_FEES = {
  '基本情報技術者試験':                       '7,500円（税込）',
  '応用情報技術者試験':                       '7,500円（税込）',
  '情報安全確保支援士試験':                   '7,500円（税込）',
  'ネットワークスペシャリスト試験':           '7,500円（税込）',
  'データベーススペシャリスト試験':           '7,500円（税込）',
  'プロジェクトマネージャ試験':               '7,500円（税込）',
  'システムアーキテクト試験':                 '7,500円（税込）',
  'ITストラテジスト試験':                     '7,500円（税込）',
  'システム監査技術者試験':                   '7,500円（税込）',
  'ITサービスマネージャ試験':                 '7,500円（税込）',
  'エンベデッドシステムスペシャリスト試験':   '7,500円（税込）',
  '実用英語技能検定 (英検) 1級':              '12,900円',
  '実用英語技能検定 (英検) 準1級':            '12,000円',
  '実用英語技能検定 (英検) 2級':              '9,800円',
  '実用英語技能検定 (英検) 準2級':            '9,800円',
  '実用英語技能検定 (英検) 3級':              '9,800円',
  'TOEIC Listening & Reading Test':            '7,810円（税込）',
  '日本語能力試験 (JLPT) N1':                 '6,500円',
  '日本語能力試験 (JLPT) N2':                 '6,500円',
  '日商簿記 1級':                             '7,850円',
  '日商簿記 2級':                             '4,720円',
  '日商簿記 3級':                             '2,850円',
  '宅地建物取引士 (宅建士)':                  '8,200円',
  '行政書士':                                 '10,400円',
  '社会保険労務士 (社労士)':                  '15,000円',
  '中小企業診断士':                           '14,500円（1次）',
  'ファイナンシャルプランナー 1級 (FP1級)':   '12,000円',
  'ファイナンシャルプランナー 2級 (FP2級)':   '8,700円',
  'ファイナンシャルプランナー 3級 (FP3級)':   '6,000円',
  '電気工事士 第1種':                         '11,300円',
  '電気工事士 第2種':                         '9,600円',
  'G検定 (ジェネラリスト検定)':               '12,000円（税込）',
  'E資格 (エンジニア資格)':                   '33,000円（認定プログラム受講者）',
};

// DBから全資格 + 直近スケジュールを取得
const rows = await sql`
  SELECT
    q.name,
    q.main_category,
    q.sub_category,
    s.exam_date,
    s.application_start_date,
    s.application_end_date,
    s.result_announcement_date,
    s.exam_fee
  FROM qualifications q
  LEFT JOIN LATERAL (
    SELECT *
    FROM qualification_schedules
    WHERE qualification_id = q.id
    ORDER BY
      CASE WHEN exam_date IS NOT NULL THEN 0 ELSE 1 END,
      exam_date DESC,
      created_at DESC
    LIMIT 1
  ) s ON true
  ORDER BY q.main_category, q.sub_category, q.name
`;

await sql.end();

// CSV 生成
function escapeCsv(val) {
  if (val == null || val === '') return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const headers = ['資格名称', '試験日（直近）', '申込開始日', '申込締切日', '合格発表日', '受験料'];

const csvRows = rows.map(row => {
  const fee = row.exam_fee || KNOWN_FEES[row.name] || '';
  return [
    escapeCsv(row.name),
    escapeCsv(row.exam_date),
    escapeCsv(row.application_start_date),
    escapeCsv(row.application_end_date),
    escapeCsv(row.result_announcement_date),
    escapeCsv(fee),
  ].join(',');
});

const lines = [
  '﻿' + headers.join(','),  // BOM付きUTF-8（Excel対応）
  ...csvRows,
];

// data ディレクトリへ出力
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const outPath = path.join(dataDir, 'qualifications_schedule.csv');
fs.writeFileSync(outPath, lines.join('\r\n'), 'utf8');

// 統計
const total      = rows.length;
const withDate   = rows.filter(r => r.exam_date).length;
const withFeeDb  = rows.filter(r => r.exam_fee).length;
const withFeeAll = rows.filter(r => r.exam_fee || KNOWN_FEES[r.name]).length;

console.log(`\n出力完了: ${outPath}`);
console.log(`総件数          : ${total} 件`);
console.log(`試験日あり      : ${withDate} 件（DBからスクレイピング済み）`);
console.log(`受験料（DB）    : ${withFeeDb} 件`);
console.log(`受験料（補完後） : ${withFeeAll} 件`);
