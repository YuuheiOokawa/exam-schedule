export const MAIN_CATEGORIES = ['国家資格', '民間資格', '公的資格'] as const;
export type MainCategory = (typeof MAIN_CATEGORIES)[number];

export const SUB_CATEGORIES: Record<string, string[]> = {
  国家資格: ['IT・情報', '医療・福祉', '法律・行政', '会計・税務', '建設・不動産', '工業・電気', '食品・調理', '美容・理容', '教育・保育'],
  民間資格: ['クラウド', 'データベース', 'プログラミング言語', 'セキュリティ', 'ネットワーク', 'プロジェクト管理', 'データ・AI', 'デザイン・Web', 'マーケティング', '人事・労務'],
  公的資格: ['語学', '会計・簿記', 'ビジネス・販売', 'IT・情報'],
};

export const MAIN_CATEGORY_COLORS: Record<string, string> = {
  国家資格: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  民間資格: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
  公的資格: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
};
