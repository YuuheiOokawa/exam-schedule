import 'dotenv/config';
// 最初に async ルートの自動エラー捕捉パッチを適用（ルート登録より前に実行が必要）
import './utils/asyncPatch.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { initializeDatabase } from './database/db.js';
import apiRouter from './routes/index.js';
import { setupCronScheduler } from './scrapers/scheduler.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { PORT } from './constants/index.js';
import { logger } from './utils/logger.js';

// ── プロセスレベルの未捕捉エラーをファイルに記録 ────────────────────
process.on('unhandledRejection', (reason: unknown) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack   = reason instanceof Error ? reason.stack  : undefined;
  logger.error('UnhandledRejection', { message, stack });
});

process.on('uncaughtException', (err: Error) => {
  logger.error('UncaughtException', { message: err.message, stack: err.stack });
  process.exit(1);
});

const app = express();

app.use(helmet());

// HTTP アクセスログ: コンソール（カラー付き dev）+ ファイル（combined）
app.use(morgan('dev'));
app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
  stream: { write: (msg: string) => logger.info(`[ACCESS] ${msg.trim()}`) },
}));

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({ origin: corsOrigins, credentials: true }));

// レート制限
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 10,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1時間
  max: 5,
  message: { success: false, error: 'Too many signup attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1分
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path.startsWith('/stripe/webhook'),
});

// Stripe webhook は raw body が必要なため json() より先に登録
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use('/api/auth/signup', signupLimiter);
app.use('/api/auth/verify', signupLimiter);
app.use('/api/auth/complete', signupLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);
app.use('/api/auth/reset-password', authLimiter);
app.use('/api', generalLimiter);
app.use('/api', apiRouter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use(notFoundHandler);
app.use(errorHandler);

async function main() {
  try {
    await initializeDatabase();
    setupCronScheduler();
    app.listen(PORT, () => {
      logger.info(`Backend server started`, { port: PORT, url: `http://localhost:${PORT}` });
    });
  } catch (err) {
    logger.error('Failed to start server', { error: err });
    process.exit(1);
  }
}

main();

export default app;
