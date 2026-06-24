// DBから資格データをCSVエクスポートするスクリプト
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

// 直近の試験日スケジュールと資格名を結合
const rows = await sql`
  SELECT
    q.name                               AS "資格名称",
    s.exam_date                          AS "試験日（直近）",
    s.application_start_date             AS "申込開始日",
    s.application_end_date               AS "申込締切日",
    s.result_announcement_date           AS "合格発表日",
    s.exam_fee                           AS "受験料"
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
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const headers = ['資格名称', '試験日（直近）', '申込開始日', '申込締切日', '合格発表日', '受験料'];
const lines = [
  '﻿' + headers.join(','), // BOM付きUTF-8でExcel対応
  ...rows.map(row => headers.map(h => escapeCsv(row[h])).join(',')),
];

const outPath = path.join(__dirname, 'qualifications_schedule.csv');
fs.writeFileSync(outPath, lines.join('\r\n'), 'utf8');

console.log(`出力完了: ${outPath}`);
console.log(`総件数: ${rows.length} 件`);

const withFee  = rows.filter(r => r['受験料']).length;
const withDate = rows.filter(r => r['試験日（直近）']).length;
console.log(`試験日あり: ${withDate} 件`);
console.log(`受験料あり: ${withFee} 件`);
