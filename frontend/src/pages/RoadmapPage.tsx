import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, CheckCircle2, Circle, ArrowRight, Zap } from 'lucide-react';
import { useHeldQualifications } from '@/contexts/HeldQualificationsContext';
import { useQualifications } from '@/features/qualifications/hooks/useQualifications';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

interface RoadmapStep {
  name: string;
  duration: string;
  level: 'entry' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  note?: string;
}

interface Roadmap {
  id: string;
  title: string;
  icon: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
  steps: RoadmapStep[];
}

const ROADMAPS: Roadmap[] = [
  {
    id: 'it-engineer',
    title: 'ITエンジニア',
    icon: '💻',
    description: 'エンジニア・SE向け資格ロードマップ',
    gradientFrom: '#6366f1',
    gradientTo: '#8b5cf6',
    steps: [
      { name: 'ITパスポート試験',       duration: '1〜2ヶ月',  level: 'entry' },
      { name: '基本情報技術者試験',      duration: '3〜6ヶ月',  level: 'basic' },
      { name: '応用情報技術者試験',      duration: '6〜12ヶ月', level: 'intermediate' },
      { name: 'G検定 (ジェネラリスト検定)', duration: '1〜3ヶ月', level: 'intermediate', note: '並行取得OK' },
      { name: '情報処理安全確保支援士試験', duration: '6〜12ヶ月', level: 'advanced' },
    ],
  },
  {
    id: 'language',
    title: '語学・英語',
    icon: '🌏',
    description: '英語・語学資格ロードマップ',
    gradientFrom: '#0ea5e9',
    gradientTo: '#06b6d4',
    steps: [
      { name: '実用英語技能検定 (英検) 3級',   duration: '3〜6ヶ月',  level: 'entry' },
      { name: 'TOEIC Listening & Reading Test', duration: '6〜12ヶ月', level: 'basic',        note: '600点目標' },
      { name: '実用英語技能検定 (英検) 準1級',  duration: '1〜2年',    level: 'intermediate' },
      { name: 'TOEIC Listening & Reading Test', duration: '1〜2年',    level: 'intermediate', note: '800点目標' },
      { name: 'IELTS',                          duration: '2〜3年',    level: 'advanced',     note: '6.5以上' },
    ],
  },
  {
    id: 'finance',
    title: '会計・金融',
    icon: '💰',
    description: '会計・財務系資格ロードマップ',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    steps: [
      { name: '日商簿記 3級', duration: '2〜3ヶ月',  level: 'entry' },
      { name: '日商簿記 2級', duration: '6〜12ヶ月', level: 'basic' },
      { name: 'ファイナンシャル・プランニング技能士 3級', duration: '3〜6ヶ月', level: 'intermediate', note: '並行取得OK' },
      { name: '日商簿記 1級', duration: '1〜2年',    level: 'advanced' },
    ],
  },
  {
    id: 'cloud',
    title: 'クラウド',
    icon: '☁️',
    description: 'AWS・Azure・GCPクラウド資格',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    steps: [
      { name: 'AWS Certified Cloud Practitioner',            duration: '1〜2ヶ月', level: 'entry' },
      { name: 'AWS Certified Solutions Architect Associate', duration: '3〜6ヶ月', level: 'intermediate' },
      { name: 'AWS Certified Solutions Architect Professional', duration: '6〜12ヶ月', level: 'advanced' },
    ],
  },
  {
    id: 'security',
    title: 'セキュリティ',
    icon: '🔐',
    description: 'セキュリティ系資格ロードマップ',
    gradientFrom: '#ef4444',
    gradientTo: '#dc2626',
    steps: [
      { name: 'ITパスポート試験',          duration: '1〜2ヶ月',  level: 'entry' },
      { name: '基本情報技術者試験',         duration: '3〜6ヶ月',  level: 'basic' },
      { name: '情報処理安全確保支援士試験', duration: '6〜12ヶ月', level: 'advanced' },
    ],
  },
];

const LEVEL_COLORS = {
  entry:        '#10b981',
  basic:        '#3b82f6',
  intermediate: '#f59e0b',
  advanced:     '#ef4444',
  expert:       '#8b5cf6',
};

const LEVEL_LABELS = {
  entry:        '入門',
  basic:        '基礎',
  intermediate: '中級',
  advanced:     '上級',
  expert:       '専門家',
};

export default function RoadmapPage() {
  const [expanded, setExpanded] = useState<string>('it-engineer');
  const { heldIds } = useHeldQualifications();
  const { data: allQuals = [] } = useQualifications({});

  const nameToId = new Map(allQuals.map((q) => [q.name, q.id]));

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600
                          flex items-center justify-center shrink-0">
            <span className="text-[14px]">🗺️</span>
          </div>
          <div>
            <h1 className="text-[15px] font-extrabold text-[var(--text-1)]">資格ロードマップ</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <p className="text-[12px] text-[var(--text-3)]">
          目指すキャリアを選んで、必要な資格の取得順序を確認しましょう
        </p>

        {ROADMAPS.map((roadmap) => {
          const isOpen = expanded === roadmap.id;
          const completedCount = roadmap.steps.filter((s) => {
            const id = nameToId.get(s.name);
            return id !== undefined && heldIds.has(id);
          }).length;
          const progress = Math.round((completedCount / roadmap.steps.length) * 100);

          return (
            <div key={roadmap.id} className="card overflow-hidden">
              {/* Card header */}
              <button
                onClick={() => setExpanded(isOpen ? '' : roadmap.id)}
                className="w-full flex items-center gap-3 p-4 text-left active:scale-[0.99] transition-transform"
              >
                {/* Gradient icon */}
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center text-[20px] shrink-0 shadow-sm"
                  style={{ background: `linear-gradient(135deg, ${roadmap.gradientFrom}, ${roadmap.gradientTo})` }}
                >
                  {roadmap.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-extrabold text-[var(--text-1)]">{roadmap.title}</p>
                    {completedCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full
                                       bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {completedCount}/{roadmap.steps.length}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text-3)] mt-0.5">{roadmap.description}</p>
                  {/* Progress bar */}
                  {completedCount > 0 && (
                    <div className="mt-2 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[var(--text-3)] shrink-0" />
                )}
              </button>

              {/* Expanded steps */}
              {isOpen && (
                <div className="border-t border-[var(--border)] px-4 py-3 space-y-0">
                  {roadmap.steps.map((step, index) => {
                    const qualId = nameToId.get(step.name);
                    const held = qualId !== undefined && heldIds.has(qualId);
                    const isLast = index === roadmap.steps.length - 1;

                    return (
                      <div key={index} className="flex gap-3">
                        {/* Connector line */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-2',
                            held
                              ? 'bg-emerald-500'
                              : 'bg-[var(--surface-2)] border border-[var(--border)]'
                          )}>
                            {held ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                            ) : (
                              <Circle className="w-3 h-3 text-[var(--text-4)]" strokeWidth={2} />
                            )}
                          </div>
                          {!isLast && (
                            <div className="w-px flex-1 my-1"
                              style={{
                                background: held
                                  ? 'linear-gradient(to bottom, #10b981, #d1fae5)'
                                  : 'var(--border)',
                              }}
                            />
                          )}
                        </div>

                        <div className={cn('flex-1 pb-3', isLast && 'pb-1')}>
                          <div className="flex items-start gap-2 flex-wrap">
                            {qualId ? (
                              <Link
                                to={ROUTES.QUALIFICATION_DETAIL(qualId)}
                                className="text-[13px] font-bold text-[var(--text-1)] hover:text-indigo-600
                                           dark:hover:text-indigo-400 transition-colors"
                              >
                                {step.name}
                              </Link>
                            ) : (
                              <span className="text-[13px] font-bold text-[var(--text-1)]">{step.name}</span>
                            )}
                            {step.note && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold
                                               px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700
                                               dark:bg-indigo-900/30 dark:text-indigo-400">
                                <Zap className="w-2.5 h-2.5" />
                                {step.note}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                              style={{
                                backgroundColor: LEVEL_COLORS[step.level] + '22',
                                color: LEVEL_COLORS[step.level],
                              }}>
                              {LEVEL_LABELS[step.level]}
                            </span>
                            <span className="text-[11px] text-[var(--text-3)]">
                              目安：{step.duration}
                            </span>
                            {held && (
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                ✓ 取得済み
                              </span>
                            )}
                          </div>
                          {!isLast && (
                            <div className="flex items-center gap-1 mt-1">
                              <ArrowRight className="w-3 h-3 text-[var(--text-4)]" />
                              <span className="text-[10px] text-[var(--text-4)]">次のステップへ</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="text-center py-4">
          <p className="text-[11px] text-[var(--text-4)]">
            ロードマップは一般的な取得順序の目安です
          </p>
        </div>
      </div>
    </div>
  );
}
