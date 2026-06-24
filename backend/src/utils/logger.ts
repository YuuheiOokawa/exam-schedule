import fs from 'fs';
import path from 'path';

// C:\Users\y-okawa\Desktop\exam-schedule-app\log\backend.log
const LOG_DIR = path.resolve(process.cwd(), '..', 'log');
const LOG_FILE = path.join(LOG_DIR, 'backend.log');
const ERROR_FILE = path.join(LOG_DIR, 'backend-error.log');

// ディレクトリが存在しなければ作成
try {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
} catch {
  // ディレクトリ作成失敗時はコンソールのみ
}

function writeToFile(filePath: string, line: string): void {
  try {
    fs.appendFileSync(filePath, line + '\n', 'utf8');
  } catch {
    // ファイル書き込み失敗時は無視（コンソールには出力済み）
  }
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ' ' + JSON.stringify(meta) : '';
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;

  // コンソール出力
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }

  // ファイル出力（全レベル → backend.log）
  writeToFile(LOG_FILE, line);

  // エラー・警告は backend-error.log にも記録
  if (level === 'error' || level === 'warn') {
    writeToFile(ERROR_FILE, line);
  }
}

export const logger = {
  info:  (msg: string, meta?: Record<string, unknown>) => log('info',  msg, meta),
  warn:  (msg: string, meta?: Record<string, unknown>) => log('warn',  msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => log('error', msg, meta),
  debug: (msg: string, meta?: Record<string, unknown>) => log('debug', msg, meta),
};
