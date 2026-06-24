import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Calendar, Upload, CheckCircle, AlertCircle, CreditCard, ExternalLink, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '@/services/subscriptionService';
import type { Plan } from '@/services/subscriptionService';
import { PageContainer } from '@/components/layout/PageContainer';
import { Button, Input, Select, Textarea, Modal } from '@/components/ui';
import { Badge } from '@/components/ui';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { formatDatetime } from '@/utils/date';
import { MAIN_CATEGORIES, SUB_CATEGORIES } from '@/constants/categories';
import type { QualificationWithSchedule } from '@/types/qualification';
import { adminService } from '@/services/adminService';
import type { QualificationFormData, ScheduleFormData } from '@/services/adminService';
import { useToast } from '@/contexts/ToastContext';
import {
  useAdminQualifications,
  useCreateQualification,
  useUpdateQualification,
  useDeleteQualification,
  useUpdateSchedule,
  useUploadScheduleCsv,
} from '@/features/admin/hooks/useAdminQualifications';

type TabValue = 'list' | 'add' | 'schedule' | 'csv' | 'billing';

const EMPTY_QUAL_FORM: QualificationFormData = {
  name: '', main_category: '民間資格', sub_category: 'クラウド',
  official_url: '', description: '', is_scrapable: false,
  exam_format: 'fixed_date', requires_renewal: false, renewal_period_years: null,
  score_enabled: false, score_unit: '', score_max: '',
};

const EMPTY_SCHEDULE_FORM: ScheduleFormData = {
  exam_date: '', application_start_date: '', application_end_date: '',
  result_announcement_date: '', exam_fee: '', source_url: '', note: '',
};

/* ── 課金設定タブ ──────────────────────────────────────────── */
function BillingTab() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [priceInputs, setPriceInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const { data: plans = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: subscriptionService.getPlans,
  });

  const syncMutation = useMutation({
    mutationFn: ({ planCode, priceId }: { planCode: string; priceId: string }) =>
      adminService.syncStripePrice(planCode, priceId),
    onSuccess: (_, { planCode }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      showToast('success', `${planCode} の Price ID を保存しました`);
    },
    onError: () => showToast('error', '保存に失敗しました'),
  });

  async function handleSync(plan: Plan) {
    const priceId = (priceInputs[plan.plan_code] ?? '').trim();
    if (!priceId) { showToast('warning', 'Stripe Price ID を入力してください'); return; }
    setSaving(plan.plan_code);
    try {
      await syncMutation.mutateAsync({ planCode: plan.plan_code, priceId });
      setPriceInputs((p) => ({ ...p, [plan.plan_code]: '' }));
    } finally {
      setSaving(null);
    }
  }

  const paidPlans = plans.filter((p) => p.plan_code !== 'free');

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">課金設定</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Stripe ダッシュボードで作成した Price ID をプランに紐付けます。
        </p>
        <a
          href="https://dashboard.stripe.com/prices"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Stripe ダッシュボードを開く
        </a>
      </div>

      <div className="card p-4 bg-slate-50 dark:bg-slate-700/30 text-sm space-y-2">
        <p className="font-semibold text-slate-700 dark:text-slate-300">設定手順</p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 dark:text-slate-400">
          <li>Stripe ダッシュボード → 製品 → 価格を作成</li>
          <li>Price ID（<code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">price_xxxx</code>）をコピー</li>
          <li>下記フォームに貼り付けて保存</li>
          <li>Webhook URL と <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">STRIPE_WEBHOOK_SECRET</code> も設定が必要</li>
        </ol>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} />}

      {!isLoading && !isError && (
        <div className="space-y-3">
          {paidPlans.map((plan) => {
            const currentInput = priceInputs[plan.plan_code] ?? '';
            const hasId = Boolean(plan.stripe_price_id);

            return (
              <div key={plan.plan_code} className="card p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{plan.name}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 ml-6">
                      ¥{plan.price_jpy.toLocaleString()} / {plan.interval_months}ヶ月
                      {plan.discount_pct > 0 && (
                        <span className="ml-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                          {plan.discount_pct}% OFF
                        </span>
                      )}
                    </p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    hasId
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                  }`}>
                    {hasId ? '設定済み' : '未設定'}
                  </span>
                </div>

                {hasId && (
                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-3 truncate">
                    現在: {plan.stripe_price_id}
                  </p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={currentInput}
                    onChange={(e) => setPriceInputs((p) => ({ ...p, [plan.plan_code]: e.target.value }))}
                    placeholder={hasId ? '新しい Price ID で上書き...' : 'price_xxxxxxxxxxxx'}
                    className="input-base text-sm py-2 flex-1"
                  />
                  <button
                    onClick={() => handleSync(plan)}
                    disabled={saving === plan.plan_code || !currentInput.trim()}
                    className="btn-primary px-4 py-2 text-sm whitespace-nowrap flex items-center gap-1.5"
                  >
                    {saving === plan.plan_code
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : <><Save className="w-3.5 h-3.5" />保存</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="card p-4 bg-slate-50 dark:bg-slate-700/30">
        <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm mb-2">必要な環境変数（.env）</p>
        <div className="space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
          {[
            'STRIPE_SECRET_KEY',
            'STRIPE_WEBHOOK_SECRET',
            'STRIPE_PRICE_MONTHLY（フォールバック）',
            'STRIPE_PRICE_QUARTERLY（フォールバック）',
            'STRIPE_PRICE_BIANNUAL（フォールバック）',
            'STRIPE_PRICE_ANNUAL（フォールバック）',
          ].map((v) => (
            <div key={v} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
              <code>{v}</code>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
          ※ Price ID はDBに保存するか環境変数で設定。DBの値が優先されます。
        </p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<TabValue>('list');
  const [qualForm, setQualForm] = useState<QualificationFormData>(EMPTY_QUAL_FORM);
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>(EMPTY_SCHEDULE_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [scheduleEditingId, setScheduleEditingId] = useState<number | null>(null);
  const [scheduleEditingScheduleId, setScheduleEditingScheduleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<QualificationWithSchedule | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: qualifications = [], isLoading, isError, refetch } = useAdminQualifications();
  const createMutation = useCreateQualification();
  const updateMutation = useUpdateQualification();
  const deleteMutation = useDeleteQualification();
  const scheduleMutation = useUpdateSchedule();
  const uploadCsvMutation = useUploadScheduleCsv();

  const currentSubCategories = SUB_CATEGORIES[qualForm.main_category] ?? [];

  function handleEditQual(q: QualificationWithSchedule) {
    setQualForm({
      name: q.name, main_category: q.main_category, sub_category: q.sub_category,
      official_url: q.official_url ?? '', description: q.description ?? '',
      is_scrapable: Boolean(q.is_scrapable), exam_format: q.exam_format,
      requires_renewal: Boolean(q.requires_renewal), renewal_period_years: q.renewal_period_years,
      score_enabled: Boolean(q.score_enabled), score_unit: q.score_unit ?? '', score_max: q.score_max ?? '',
    });
    setEditingId(q.id);
    setTab('add');
  }

  function handleEditSchedule(q: QualificationWithSchedule) {
    setScheduleForm({
      exam_date: q.exam_date ?? '', application_start_date: q.application_start_date ?? '',
      application_end_date: q.application_end_date ?? '', result_announcement_date: q.result_announcement_date ?? '',
      exam_fee: q.exam_fee ?? '', source_url: q.source_url ?? '', note: q.note ?? '',
    });
    setScheduleEditingId(q.id);
    setScheduleEditingScheduleId(q.schedule_id ?? null);
    setTab('schedule');
  }

  async function handleSaveQual(e: React.FormEvent) {
    e.preventDefault();
    if (!qualForm.name.trim()) return;
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, data: qualForm });
    } else {
      await createMutation.mutateAsync(qualForm);
    }
    setQualForm(EMPTY_QUAL_FORM);
    setEditingId(null);
    setTab('list');
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!scheduleEditingId) return;
    await scheduleMutation.mutateAsync({ scheduleId: scheduleEditingScheduleId, qualificationId: scheduleEditingId, data: scheduleForm });
    setScheduleForm(EMPTY_SCHEDULE_FORM);
    setScheduleEditingId(null);
    setScheduleEditingScheduleId(null);
    setTab('list');
  }

  function handleFileSelect(file: File) {
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setCsvText((e.target?.result as string) ?? '');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFileSelect(file);
  }

  async function handleUpload() {
    if (!csvText.trim()) return;
    await uploadCsvMutation.mutateAsync(csvText);
  }

  const TAB_LIST: Array<{ value: TabValue; label: string }> = [
    { value: 'list', label: '資格一覧' },
    { value: 'add', label: editingId ? '資格編集' : '資格追加' },
    { value: 'schedule', label: 'スケジュール編集' },
    { value: 'csv', label: 'CSVアップロード' },
    { value: 'billing', label: '課金設定' },
  ];

  return (
    <PageContainer title="管理画面">
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex gap-1 -mb-px" aria-label="管理タブ">
          {TAB_LIST.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => {
                setTab(value);
                if (value === 'add' && !editingId) { setQualForm(EMPTY_QUAL_FORM); }
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === value
                  ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      {tab === 'list' && (
        <div>
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">{qualifications.length} 件</p>
            <Button size="sm" onClick={() => setTab('csv')}>
              <Upload className="w-4 h-4" />
              CSVアップロード
            </Button>
          </div>

          {isLoading && <LoadingState />}
          {isError && <ErrorState onRetry={refetch} />}
          {!isLoading && !isError && qualifications.length === 0 && (
            <EmptyState title="資格がありません" description="「資格追加」タブから登録してください" />
          )}

          {!isLoading && !isError && qualifications.length > 0 && (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      {['資格名', 'カテゴリ', '試験日', '受験料', '最終更新', '操作'].map((h) => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {qualifications.map((q) => (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs">
                          <p className="truncate">{q.name}</p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <Badge variant="category" category={q.main_category} className="text-xs">{q.main_category}</Badge>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{q.sub_category}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                          {q.exam_date ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs whitespace-nowrap">
                          {q.exam_fee ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                          {q.fetched_at ? formatDatetime(q.fetched_at) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <button onClick={() => handleEditQual(q)} className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors" aria-label="編集">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleEditSchedule(q)} className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors" aria-label="日程編集">
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setDeleteTarget(q)} className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" aria-label="削除">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'add' && (
        <form onSubmit={handleSaveQual} className="max-w-xl space-y-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
            {editingId ? '資格を編集' : '資格を追加'}
          </h2>
          <Input label="資格名 *" value={qualForm.name} onChange={(e) => setQualForm((f) => ({ ...f, name: e.target.value }))} required />
          <Select
            label="大カテゴリ *"
            value={qualForm.main_category}
            onChange={(e) => setQualForm((f) => ({ ...f, main_category: e.target.value, sub_category: SUB_CATEGORIES[e.target.value]?.[0] ?? '' }))}
          >
            {MAIN_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select
            label="小カテゴリ *"
            value={qualForm.sub_category}
            onChange={(e) => setQualForm((f) => ({ ...f, sub_category: e.target.value }))}
          >
            {currentSubCategories.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <Select
            label="試験形式"
            value={qualForm.exam_format}
            onChange={(e) => setQualForm((f) => ({ ...f, exam_format: e.target.value }))}
          >
            <option value="fixed_date">固定日程</option>
            <option value="anytime">随時受験</option>
            <option value="regional">地域別日程</option>
          </Select>
          <Input label="公式URL" type="url" value={qualForm.official_url ?? ''} onChange={(e) => setQualForm((f) => ({ ...f, official_url: e.target.value }))} placeholder="https://..." />
          <Textarea label="説明" value={qualForm.description ?? ''} onChange={(e) => setQualForm((f) => ({ ...f, description: e.target.value }))} />

          {/* スコア機能設定 */}
          <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">スコア記録機能</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={qualForm.score_enabled ?? false}
                onChange={(e) => setQualForm((f) => ({ ...f, score_enabled: e.target.checked }))}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">スコア記録を有効にする</span>
            </label>
            {qualForm.score_enabled && (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="スコア単位（例: 点、%）"
                  value={qualForm.score_unit ?? ''}
                  onChange={(e) => setQualForm((f) => ({ ...f, score_unit: e.target.value }))}
                  placeholder="点"
                />
                <Input
                  label="最大スコア（空欄可）"
                  value={qualForm.score_max ?? ''}
                  onChange={(e) => setQualForm((f) => ({ ...f, score_max: e.target.value }))}
                  placeholder="例: 990"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={createMutation.isPending || updateMutation.isPending}>
              <Plus className="w-4 h-4" />
              {editingId ? '更新' : '追加'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => { setTab('list'); setEditingId(null); setQualForm(EMPTY_QUAL_FORM); }}>
              キャンセル
            </Button>
          </div>
        </form>
      )}

      {tab === 'schedule' && scheduleEditingId !== null && (
        <form onSubmit={handleSaveSchedule} className="max-w-xl space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">スケジュールを手動登録</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              日付は <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded text-xs">YYYY-MM-DD</code> 形式で入力するとカレンダーに表示されます
            </p>
          </div>
          <Input label="試験日" value={scheduleForm.exam_date ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, exam_date: e.target.value }))} placeholder="例: 2026-10-18" />
          <Input label="申込開始日" value={scheduleForm.application_start_date ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, application_start_date: e.target.value }))} />
          <Input label="申込締切日" value={scheduleForm.application_end_date ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, application_end_date: e.target.value }))} />
          <Input label="合格発表日" value={scheduleForm.result_announcement_date ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, result_announcement_date: e.target.value }))} />
          <Input label="受験料" value={scheduleForm.exam_fee ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, exam_fee: e.target.value }))} placeholder="例: 7,500円（税込）" />
          <Input label="情報取得元URL" type="url" value={scheduleForm.source_url ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, source_url: e.target.value }))} placeholder="https://..." />
          <Textarea label="備考" value={scheduleForm.note ?? ''} onChange={(e) => setScheduleForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={scheduleMutation.isPending}>保存</Button>
            <Button type="button" variant="secondary" onClick={() => { setTab('list'); setScheduleEditingId(null); setScheduleEditingScheduleId(null); setScheduleForm(EMPTY_SCHEDULE_FORM); }}>
              キャンセル
            </Button>
          </div>
        </form>
      )}

      {tab === 'csv' && (
        <div className="max-w-2xl space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">CSVから試験日程を一括登録</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              CSVファイルをアップロードして試験日程を一括登録します。既存データは上書き更新されます。
            </p>
          </div>

          <div className="card p-4 bg-slate-50 dark:bg-slate-700/30 text-sm">
            <p className="font-semibold text-slate-700 dark:text-slate-300 mb-2">CSV形式（1行目はヘッダー）</p>
            <code className="block text-xs text-slate-600 dark:text-slate-400 font-mono bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-600 whitespace-pre">
              {`資格名称,試験日（直近）,申込開始日,申込締切日,合格発表日,受験料,公式URL,情報状態
基本情報技術者試験,2026-10-18,2026-07-07,2026-07-28,2026-12-19,7500円（税込）,https://...,
TOEIC Listening & Reading Test,毎月実施,,,,7810円（税込）,https://...,`}
            </code>
            <ul className="mt-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5 list-disc list-inside">
              <li>日付は <code className="bg-slate-100 dark:bg-slate-700 px-1 rounded">YYYY-MM-DD</code> 形式。テキスト形式（例: 毎月実施）も可（備考に保存）</li>
              <li>公式URL列があれば資格マスタの公式URLも更新されます</li>
              <li>資格名はDBの資格名と完全一致が必要です</li>
              <li>公式URL・情報状態列は省略可（6列形式も対応）</li>
              <li>文字コード: UTF-8（BOM付きも可）</li>
            </ul>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-brand-400 bg-brand-50 dark:bg-brand-900/20'
                : 'border-slate-300 dark:border-slate-600 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            <Upload className="w-8 h-8 mx-auto mb-3 text-slate-400" />
            {csvFileName ? (
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">{csvFileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">CSVファイルをドラッグ＆ドロップ</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">または クリックしてファイルを選択</p>
              </>
            )}
          </div>

          {csvText && (
            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                loading={uploadCsvMutation.isPending}
                disabled={!csvText.trim()}
              >
                <Upload className="w-4 h-4" />
                アップロード
              </Button>
              <Button
                variant="secondary"
                onClick={() => { setCsvText(''); setCsvFileName(null); uploadCsvMutation.reset(); }}
              >
                クリア
              </Button>
            </div>
          )}

          {uploadCsvMutation.data && (
            <div className="card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">アップロード完了</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">更新: {uploadCsvMutation.data.updated}件</span>
                <span className="text-brand-700 dark:text-brand-400 font-medium">新規: {uploadCsvMutation.data.inserted}件</span>
                {uploadCsvMutation.data.urlUpdated > 0 && (
                  <span className="text-violet-700 dark:text-violet-400 font-medium">URL更新: {uploadCsvMutation.data.urlUpdated}件</span>
                )}
                <span className="text-slate-500 dark:text-slate-400">スキップ: {uploadCsvMutation.data.skipped}件</span>
              </div>
              {uploadCsvMutation.data.errors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">エラー ({uploadCsvMutation.data.errors.length}件)</p>
                  </div>
                  {uploadCsvMutation.data.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'billing' && <BillingTab />}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="資格を削除"
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          「<strong>{deleteTarget?.name}</strong>」を削除しますか？この操作は取り消せません。
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>キャンセル</Button>
          <Button
            variant="danger"
            loading={deleteMutation.isPending}
            onClick={async () => {
              if (!deleteTarget) return;
              await deleteMutation.mutateAsync(deleteTarget.id);
              setDeleteTarget(null);
              setTab('list');
            }}
          >
            削除する
          </Button>
        </div>
      </Modal>
    </PageContainer>
  );
}
