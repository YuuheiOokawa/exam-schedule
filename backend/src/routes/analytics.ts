import { Router, Response } from 'express';
import { query, queryOne } from '../database/db.js';
import { requireAuth, type AuthRequest } from '../middleware/auth.js';
import { getUserTier } from '../middleware/entitlements.js';

const router = Router();

// ─── 学習進捗分析（プレミアム限定）────────────────────────────
// GET /api/analytics/progress
router.get('/progress', requireAuth, async (req: AuthRequest, res: Response) => {
  const tier = await getUserTier(req.user!.id);
  if (tier !== 'premium') {
    res.status(403).json({
      success: false,
      error: { code: 'PREMIUM_REQUIRED', message: '学習進捗分析はプレミアムプランでご利用いただけます' },
    });
    return;
  }

  const userId = req.user!.id;

  // 合格率・受験数
  const examStats = await queryOne<{
    total: string; passed: string; failed: string;
  }>(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE result = 'passed') AS passed,
       COUNT(*) FILTER (WHERE result = 'failed') AS failed
     FROM user_exam_plans
     WHERE user_id = $1 AND result IS NOT NULL`,
    [userId]
  );

  // 月別受験数（直近12ヶ月）
  const monthlyExams = await query<{ month: string; count: string; passed: string }>(
    `SELECT
       TO_CHAR(planned_date, 'YYYY-MM') AS month,
       COUNT(*) AS count,
       COUNT(*) FILTER (WHERE result = 'passed') AS passed
     FROM user_exam_plans
     WHERE user_id = $1
       AND planned_date >= NOW() - INTERVAL '12 months'
     GROUP BY month
     ORDER BY month ASC`,
    [userId]
  );

  // カテゴリ別合格率
  const categoryStats = await query<{
    category: string; total: string; passed: string;
  }>(
    `SELECT
       q.main_category AS category,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE uep.result = 'passed') AS passed
     FROM user_exam_plans uep
     JOIN qualifications q ON q.id = uep.qualification_id
     WHERE uep.user_id = $1 AND uep.result IS NOT NULL
     GROUP BY q.main_category
     ORDER BY total DESC`,
    [userId]
  );

  // スコア傾向（直近スコア記録）
  const scoreTrends = await query<{
    qualification_id: number; qualification_name: string;
    score: string; unit: string; taken_at: string;
  }>(
    `SELECT
       sh.qualification_id,
       q.name AS qualification_name,
       sh.score,
       COALESCE(q.score_unit, 'pt') AS unit,
       sh.taken_at
     FROM qualification_score_history sh
     JOIN qualifications q ON q.id = sh.qualification_id
     WHERE sh.user_id = $1
     ORDER BY sh.taken_at DESC
     LIMIT 30`,
    [userId]
  );

  // 直近の活動（最後にスコア/計画を更新した日）
  const lastActivity = await queryOne<{ last_at: string }>(
    `SELECT MAX(ts) AS last_at FROM (
       SELECT MAX(created_at) AS ts FROM user_exam_plans WHERE user_id = $1
       UNION ALL
       SELECT MAX(created_at) AS ts FROM qualification_score_history WHERE user_id = $1
       UNION ALL
       SELECT MAX(created_at) AS ts FROM user_held_qualifications WHERE user_id = $1
     ) sub`,
    [userId]
  );

  // 次回の受験予定
  const nextExam = await queryOne<{ qualification_name: string; planned_date: string }>(
    `SELECT q.name AS qualification_name, uep.planned_date
     FROM user_exam_plans uep
     JOIN qualifications q ON q.id = uep.qualification_id
     WHERE uep.user_id = $1 AND uep.result IS NULL AND uep.planned_date >= CURRENT_DATE
     ORDER BY uep.planned_date ASC
     LIMIT 1`,
    [userId]
  );

  const total  = Number(examStats?.total  ?? 0);
  const passed = Number(examStats?.passed ?? 0);
  const failed = Number(examStats?.failed ?? 0);

  res.json({
    success: true,
    data: {
      exam_stats: {
        total,
        passed,
        failed,
        pass_rate: total > 0 ? Math.round((passed / total) * 100) : null,
      },
      monthly_exams: monthlyExams.map((r) => ({
        month:  r.month,
        count:  Number(r.count),
        passed: Number(r.passed),
      })),
      category_stats: categoryStats.map((r) => ({
        category:  r.category,
        total:     Number(r.total),
        passed:    Number(r.passed),
        pass_rate: Number(r.total) > 0 ? Math.round((Number(r.passed) / Number(r.total)) * 100) : 0,
      })),
      score_trends: scoreTrends,
      last_activity_at: lastActivity?.last_at ?? null,
      next_exam: nextExam ?? null,
    },
  });
});

export default router;
