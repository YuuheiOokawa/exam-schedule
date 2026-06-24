const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, '..', '..', 'data', 'exam_schedule.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS qualifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      official_url TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS qualification_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qualification_id INTEGER NOT NULL,
      exam_date TEXT,
      application_start_date TEXT,
      application_end_date TEXT,
      result_announcement_date TEXT,
      exam_fee TEXT,
      source_url TEXT,
      fetched_at DATETIME,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS fetch_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      qualification_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (qualification_id) REFERENCES qualifications(id) ON DELETE CASCADE
    );

    CREATE TRIGGER IF NOT EXISTS qualifications_updated_at
      AFTER UPDATE ON qualifications
    BEGIN
      UPDATE qualifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

    CREATE TRIGGER IF NOT EXISTS schedules_updated_at
      AFTER UPDATE ON qualification_schedules
    BEGIN
      UPDATE qualification_schedules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);

  seedInitialData();
}

function seedInitialData() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM qualifications').get();
  if (count.cnt > 0) return;

  const insertQual = db.prepare(`
    INSERT INTO qualifications (name, category, official_url, description)
    VALUES (?, ?, ?, ?)
  `);

  const qualifications = [
    {
      name: 'Oracle Master Bronze DBA 2019',
      category: 'データベース',
      official_url: 'https://education.oracle.com/ja/oracle-certification-path/pFamily_32',
      description: 'Oracle Databaseの基礎知識・スキルを認定する資格'
    },
    {
      name: '基本情報技術者試験',
      category: '国家資格',
      official_url: 'https://www.ipa.go.jp/shiken/kubun/fe.html',
      description: 'IPA（情報処理推進機構）が実施するIT系国家資格の基礎レベル'
    },
    {
      name: '応用情報技術者試験',
      category: '国家資格',
      official_url: 'https://www.ipa.go.jp/shiken/kubun/ap.html',
      description: 'IPA（情報処理推進機構）が実施するIT系国家資格の応用レベル'
    },
    {
      name: 'AWS Certified Cloud Practitioner',
      category: 'クラウド',
      official_url: 'https://aws.amazon.com/jp/certification/certified-cloud-practitioner/',
      description: 'AWSクラウドの基礎知識を認定する入門レベルの資格'
    },
    {
      name: 'AWS Certified Solutions Architect - Associate',
      category: 'クラウド',
      official_url: 'https://aws.amazon.com/jp/certification/certified-solutions-architect-associate/',
      description: 'AWSソリューション設計の知識・スキルを認定するアソシエイトレベルの資格'
    },
    {
      name: 'Java SE 11 Silver',
      category: 'Java',
      official_url: 'https://education.oracle.com/ja/java-se-11-programmer-i/pexam_1Z0-815',
      description: 'Javaプログラミングの基礎知識を認定するOracle資格'
    },
    {
      name: 'Java SE 11 Gold',
      category: 'Java',
      official_url: 'https://education.oracle.com/ja/java-se-11-programmer-ii/pexam_1Z0-816',
      description: 'Javaプログラミングの上級知識を認定するOracle資格'
    }
  ];

  const insertMany = db.transaction((items) => {
    for (const q of items) {
      const result = insertQual.run(q.name, q.category, q.official_url, q.description);
      db.prepare(`
        INSERT INTO qualification_schedules
          (qualification_id, exam_date, application_start_date, application_end_date,
           result_announcement_date, exam_fee, source_url, fetched_at, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        result.lastInsertRowid,
        null, null, null, null,
        '公式ページ上で確認できません',
        q.official_url,
        null,
        '初期データ。最新情報を取得ボタンで情報を更新してください。'
      );
    }
  });

  insertMany(qualifications);
}

module.exports = { db, initializeDatabase };
