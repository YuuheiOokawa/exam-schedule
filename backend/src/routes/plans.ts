import { Router, Response } from 'express';
import { query, queryOne, queryRun } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { checkCountLimit, getUserTier } from '../middleware/entitlements.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const rows = await query(
    `SELECT p.id, p.qualification_id, p.planned_date, p.notes, p.result, p.created_at,
            q.name AS qualification_name, q.sub_category
     FROM user_exam_plans p
     JOIN qualifications q ON q.id = p.qualification_id
     WHERE p.user_id = $1
     ORDER BY p.planned_date ASC`,
    [req.user!.id]
  );
  res.json({ success: true, data: rows });
});

router.get('/qualification/:qualId', requireAuth, async (req: AuthRequest, res: Response) => {
  const qualId = Number(req.params.qualId);
  if (!qualId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  const rows = await query(
    `SELECT id, qualification_id, planned_date, notes, result, created_at
     FROM user_exam_plans
     WHERE user_id = $1 AND qualification_id = $2
     ORDER BY planned_date ASC`,
    [req.user!.id, qualId]
  );
  res.json({ success: true, data: rows });
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  const { qualification_id, planned_date, notes } = req.body as {
    qualification_id?: number;
    planned_date?: string;
    notes?: string;
  };

  if (!qualification_id || !planned_date) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'qualification_id と planned_date は必須です' },
    });
    return;
  }

  const countRow = await queryOne<{ cnt: string }>(
    `SELECT COUNT(*) as cnt FROM user_exam_plans WHERE user_id = $1`,
    [req.user!.id]
  );
  const { allowed, max } = await checkCountLimit(req.user!.id, 'max_exam_plans', Number(countRow?.cnt ?? 0));
  if (!allowed) {
    res.status(403).json({
      success: false,
      error: {
        code: 'LIMIT_EXCEEDED',
        feature: 'max_exam_plans',
        max,
        message: `受験予定の登録は${max}件が上限です。プレミアムプランで無制限にご利用いただけます。`,
      },
    });
    return;
  }

  const result = await queryRun(
    `INSERT INTO user_exam_plans (user_id, qualification_id, planned_date, notes)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [req.user!.id, qualification_id, planned_date, notes ?? null]
  );

  res.status(201).json({ success: true, data: { id: result.id } });
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const planId = Number(req.params.id);
  const { planned_date, notes } = req.body as { planned_date?: string; notes?: string };

  if (!planId || !planned_date) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '受験日は必須です' } });
    return;
  }

  const plan = await queryOne(
    `SELECT id FROM user_exam_plans WHERE id = $1 AND user_id = $2`,
    [planId, req.user!.id]
  );
  if (!plan) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '受験予定が見つかりません' } });
    return;
  }

  await queryRun(
    `UPDATE user_exam_plans SET planned_date = $1, notes = $2 WHERE id = $3`,
    [planned_date, notes ?? null, planId]
  );
  res.json({ success: true, data: null });
});

router.patch('/:id/result', requireAuth, async (req: AuthRequest, res: Response) => {
  const planId = Number(req.params.id);
  const { result } = req.body as { result?: string };

  if (!planId || !['passed', 'failed'].includes(result ?? '')) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: '不正な入力です' } });
    return;
  }

  const plan = await queryOne<{ id: number; user_id: number; qualification_id: number; planned_date: string }>(
    `SELECT id, user_id, qualification_id, planned_date FROM user_exam_plans WHERE id = $1 AND user_id = $2`,
    [planId, req.user!.id]
  );
  if (!plan) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '受験予定が見つかりません' } });
    return;
  }

  await queryRun(`UPDATE user_exam_plans SET result = $1 WHERE id = $2`, [result, planId]);

  if (result === 'passed') {
    await queryRun(
      `INSERT INTO user_held_qualifications (user_id, qualification_id, acquired_at)
       VALUES ($1, $2, $3) ON CONFLICT (user_id, qualification_id) DO NOTHING`,
      [plan.user_id, plan.qualification_id, plan.planned_date]
    );
  }

  res.json({ success: true, data: null });
});

// ─── 学習計画自動生成（プレミアム限定）────────────────────────
// POST /api/plans/study-plan/generate
router.post('/study-plan/generate', requireAuth, async (req: AuthRequest, res: Response) => {
  const tier = await getUserTier(req.user!.id);
  if (tier !== 'premium') {
    res.status(403).json({
      success: false,
      error: { code: 'PREMIUM_REQUIRED', message: '学習計画自動作成はプレミアムプランでご利用いただけます' },
    });
    return;
  }

  const { qualification_id, exam_date } = req.body as {
    qualification_id?: number; exam_date?: string;
  };

  if (!qualification_id || !exam_date) {
    res.status(400).json({
      success: false,
      error: { code: 'MISSING_FIELDS', message: 'qualification_id と exam_date は必須です' },
    });
    return;
  }

  const qual = await queryOne<{ name: string; sub_category: string | null }>(
    `SELECT name, sub_category FROM qualifications WHERE id = $1`,
    [qualification_id]
  );
  if (!qual) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: '資格が見つかりません' } });
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(exam_date);
  target.setHours(0, 0, 0, 0);
  const daysRemaining = Math.round((target.getTime() - today.getTime()) / 86_400_000);

  if (daysRemaining <= 0) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_DATE', message: '試験日は今日以降の日付を指定してください' },
    });
    return;
  }

  interface StudyPhase {
    phase: number;
    name: string;
    duration_days: number;
    start_date: string;
    end_date: string;
    daily_hours: number;
    tasks: string[];
  }

  function addDays(base: Date, days: number): string {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  const phases: StudyPhase[] = [];

  if (daysRemaining >= 91) {
    // 3ヶ月以上：4フェーズ構成
    const p1 = Math.floor(daysRemaining * 0.30);
    const p2 = Math.floor(daysRemaining * 0.30);
    const p3 = Math.floor(daysRemaining * 0.25);
    const p4 = daysRemaining - p1 - p2 - p3;
    let offset = 0;
    phases.push({ phase: 1, name: '基礎学習', duration_days: p1, start_date: addDays(today, offset), end_date: addDays(today, offset + p1 - 1), daily_hours: 1, tasks: ['テキストを1章ずつ精読する', '重要用語・公式を暗記カードに整理する', '各章末問題で理解度を確認する'] });
    offset += p1;
    phases.push({ phase: 2, name: '応用学習', duration_days: p2, start_date: addDays(today, offset), end_date: addDays(today, offset + p2 - 1), daily_hours: 1.5, tasks: ['応用問題集を1日1テーマずつ解く', '間違えた問題を反復演習する', '実務事例・具体例と結びつけて理解を深める'] });
    offset += p2;
    phases.push({ phase: 3, name: '問題演習', duration_days: p3, start_date: addDays(today, offset), end_date: addDays(today, offset + p3 - 1), daily_hours: 2, tasks: ['過去問を年度別に解く（時間測定）', '正答率70%を目標に弱点を洗い出す', '解説を熟読して答え方のパターンを習得する'] });
    offset += p3;
    phases.push({ phase: 4, name: '総仕上げ', duration_days: p4, start_date: addDays(today, offset), end_date: addDays(today, offset + p4 - 1), daily_hours: 2, tasks: ['模擬試験を本番同様の環境で実施する', '苦手分野を集中的に補強する', '体調管理と試験当日の準備を整える'] });
  } else if (daysRemaining >= 31) {
    // 1〜3ヶ月：3フェーズ構成
    const p1 = Math.floor(daysRemaining * 0.30);
    const p2 = Math.floor(daysRemaining * 0.45);
    const p3 = daysRemaining - p1 - p2;
    let offset = 0;
    phases.push({ phase: 1, name: 'インプット', duration_days: p1, start_date: addDays(today, offset), end_date: addDays(today, offset + p1 - 1), daily_hours: 1.5, tasks: ['重要ポイントをまとめたノートを作成する', '頻出テーマを優先して学習する', '公式・定義を確実に覚える'] });
    offset += p1;
    phases.push({ phase: 2, name: '問題演習', duration_days: p2, start_date: addDays(today, offset), end_date: addDays(today, offset + p2 - 1), daily_hours: 2, tasks: ['過去問を1日20〜30問解く', '間違えた問題を翌日に再挑戦する', '時間配分を意識した演習を行う'] });
    offset += p2;
    phases.push({ phase: 3, name: '総仕上げ', duration_days: p3, start_date: addDays(today, offset), end_date: addDays(today, offset + p3 - 1), daily_hours: 2.5, tasks: ['模擬試験で本番をシミュレーションする', '弱点分野を重点的に復習する', '前日は軽い復習と十分な睡眠を取る'] });
  } else if (daysRemaining >= 15) {
    // 2週間〜1ヶ月：2フェーズ構成
    const p1 = Math.floor(daysRemaining * 0.50);
    const p2 = daysRemaining - p1;
    let offset = 0;
    phases.push({ phase: 1, name: '集中学習', duration_days: p1, start_date: addDays(today, offset), end_date: addDays(today, offset + p1 - 1), daily_hours: 2.5, tasks: ['頻出問題を中心に1日集中して解く', 'テキストの要点を短時間で見直す', '解けない問題は解説を見て即理解する'] });
    offset += p1;
    phases.push({ phase: 2, name: '演習・直前対策', duration_days: p2, start_date: addDays(today, offset), end_date: addDays(today, offset + p2 - 1), daily_hours: 3, tasks: ['過去問を繰り返し解いて得点力を上げる', '間違いノートを見直して最終確認する', '試験直前は新しい内容よりも復習を優先する'] });
  } else {
    // 2週間未満：直前対策
    phases.push({ phase: 1, name: '直前対策', duration_days: daysRemaining, start_date: addDays(today, 0), end_date: addDays(today, daysRemaining - 1), daily_hours: 3, tasks: ['頻出問題・重要ポイントだけに絞って復習する', '過去問の解き直しで解法を再確認する', '前日は体調管理を最優先にする'] });
  }

  const totalStudyHours = phases.reduce((sum, p) => sum + p.duration_days * p.daily_hours, 0);

  res.json({
    success: true,
    data: {
      qualification_name: qual.name,
      exam_date,
      days_remaining: daysRemaining,
      total_study_hours: Math.round(totalStudyHours),
      phases,
      tips: [
        '毎日同じ時間帯に学習することで習慣化しやすくなります',
        '理解が浅い箇所は先に進まず、その日のうちに解決しましょう',
        '週1回は学習記録を振り返り、遅れがあれば計画を調整してください',
      ],
    },
  });
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  const planId = Number(req.params.id);
  if (!planId) {
    res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: '無効なIDです' } });
    return;
  }
  await queryRun(
    `DELETE FROM user_exam_plans WHERE id = $1 AND user_id = $2`,
    [planId, req.user!.id]
  );
  res.json({ success: true, data: null });
});

export default router;
