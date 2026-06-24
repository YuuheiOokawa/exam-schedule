import { useState, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { EventClickArg, DatesSetArg } from '@fullcalendar/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LoadingState } from '@/components/feedback/LoadingState';
import { ErrorState } from '@/components/feedback/ErrorState';
import { EmptyState } from '@/components/feedback/EmptyState';
import { EventFilter } from '@/features/calendar/components/EventFilter';
import { EventLegend } from '@/features/calendar/components/EventLegend';
import { EventPopup } from '@/features/calendar/components/EventPopup';
import { useCalendarEvents } from '@/features/calendar/hooks/useCalendarEvents';
import { planService } from '@/services/planService';
import { subscriptionService } from '@/services/subscriptionService';
import { apiClient } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import type { CalendarEvent, CalendarEventType } from '@/types/calendar';
import { ROUTES } from '@/constants/routes';
import { Calendar, ChevronRight, Download, Crown } from 'lucide-react';

type FilterValue = 'all' | CalendarEventType;

export default function CalendarPage() {
  const [filter, setFilter]             = useState<FilterValue>('all');
  const [showMyPlans, setShowMyPlans]   = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<(CalendarEvent & { start: string }) | null>(null);
  const [currentViewStart, setCurrentViewStart] = useState<Date>(() => {
    const d = new Date(); d.setDate(1); d.setHours(0,0,0,0); return d;
  });
  const [currentViewEnd, setCurrentViewEnd] = useState<Date>(() => {
    const d = new Date(); d.setMonth(d.getMonth() + 1); d.setDate(0); d.setHours(23,59,59,999); return d;
  });
  const calendarRef = useRef<InstanceType<typeof FullCalendar>>(null);
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient  = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ['subscription-status'],
    queryFn:  subscriptionService.getStatus,
    enabled:  !!user,
  });
  const isPremium = statusData?.is_premium ?? false;

  async function downloadIcal() {
    try {
      const res = await apiClient.get('/calendar/ical', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'exam-schedule.ics';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast('error', 'ダウンロードに失敗しました');
    }
  }

  const { data: events = [], isLoading, isError, refetch } = useCalendarEvents();

  const { data: myPlans = [] } = useQuery({
    queryKey: ['exam-plans-all'],
    queryFn:  planService.getAll,
    enabled:  !!user,
  });

  // 受験予定をカレンダーイベント形式に変換
  const planEvents: CalendarEvent[] = useMemo(() =>
    myPlans.map((p) => ({
      id:              `plan-${p.id}`,
      title:           `📌 ${p.qualification_name}`,
      start:           p.planned_date,
      backgroundColor: '#0d9488',
      borderColor:     '#0d9488',
      type:            'my_plan' as CalendarEventType,
      extendedProps: {
        qualification_id:   p.qualification_id,
        qualification_name: p.qualification_name,
        event_type:         'my_plan',
        exam_fee:           null,
        note:               p.notes,
      },
    })),
  [myPlans]);

  const filteredOfficialEvents = filter === 'all'
    ? events
    : filter === 'my_plan' ? [] : events.filter((e) => e.type === filter);

  const allDisplayEvents = [
    ...filteredOfficialEvents,
    ...(showMyPlans || filter === 'my_plan' ? planEvents : []),
  ];

  // 既存の受験予定: qualId → date の Set (重複チェック用)
  const plannedSet = useMemo(
    () => new Set(myPlans.map((p) => `${p.qualification_id}::${p.planned_date}`)),
    [myPlans]
  );

  // 現在のカレンダー表示範囲外で最も直近の受験予定
  const nextPlanOutsideView = useMemo(() => {
    if (!myPlans.length) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const future = myPlans
      .filter((p) => {
        const d = new Date(p.planned_date);
        return d >= today && (d < currentViewStart || d > currentViewEnd);
      })
      .sort((a, b) => a.planned_date.localeCompare(b.planned_date));
    return future[0] ?? null;
  }, [myPlans, currentViewStart, currentViewEnd]);

  function handleDatesSet(arg: DatesSetArg) {
    setCurrentViewStart(arg.start);
    setCurrentViewEnd(arg.end);
  }

  function jumpToNextPlan() {
    if (!nextPlanOutsideView || !calendarRef.current) return;
    calendarRef.current.getApi().gotoDate(nextPlanOutsideView.planned_date);
  }

  async function handleAddPlan(qualId: number, date: string) {
    try {
      await planService.add(qualId, date);
      await queryClient.invalidateQueries({ queryKey: ['exam-plans-all'] });
      showToast('success', '受験予定に追加しました');
    } catch {
      showToast('error', '受験予定の追加に失敗しました');
    }
  }

  function handleEventClick(arg: EventClickArg) {
    const ev = arg.event;
    setSelectedEvent({
      id:              ev.id,
      title:           ev.title,
      start:           ev.startStr,
      backgroundColor: ev.backgroundColor,
      borderColor:     ev.borderColor,
      type:            (ev.extendedProps as CalendarEvent).type,
      extendedProps:   ev.extendedProps as CalendarEvent['extendedProps'],
    });
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] page-enter">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-[var(--bg)]/90 backdrop-blur-md border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
            <Calendar className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-[15px] font-extrabold text-[var(--text-1)]">試験カレンダー</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-2 sm:px-6 py-4 space-y-3">
        {/* Filter + legend */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2 sm:px-0">
          <EventFilter value={filter} onChange={setFilter} />
          <div className="flex items-center gap-2 flex-wrap">
            <EventLegend />
            {user && isPremium && (
              <button
                onClick={downloadIcal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
                           bg-indigo-600 text-white hover:bg-indigo-700 transition-colors active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                iCal
              </button>
            )}
            {user && !isPremium && (
              <Link
                to={ROUTES.PRICING}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold
                           bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30
                           hover:bg-amber-500/20 transition-colors active:scale-95"
              >
                <Crown className="w-3 h-3" />
                カレンダー連携
              </Link>
            )}
          </div>
        </div>

        {/* My plans toggle (ログイン時のみ) */}
        {user && (
          <div className="flex items-center gap-2 px-2 sm:px-0">
            <button
              onClick={() => setShowMyPlans((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold
                          border transition-all active:scale-95 ${
                showMyPlans
                  ? 'bg-teal-600 border-teal-600 text-white'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-3)]'
              }`}
            >
              <span>📌</span>
              受験予定を表示
              {myPlans.length > 0 && (
                <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full min-w-[16px] text-center ${
                  showMyPlans ? 'bg-white/25' : 'bg-[var(--surface-3)] text-[var(--text-3)]'
                }`}>
                  {myPlans.length}
                </span>
              )}
            </button>
            {myPlans.length > 0 && (
              <span className="text-[11px] text-[var(--text-3)]">
                緑＝あなたの受験予定
              </span>
            )}
          </div>
        )}

        {/* 表示月外に受験予定がある場合のバナー */}
        {user && nextPlanOutsideView && showMyPlans && (
          <button
            onClick={jumpToNextPlan}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl
                       bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800/30
                       text-teal-700 dark:text-teal-300 text-[12px] font-semibold
                       hover:bg-teal-100 dark:hover:bg-teal-900/30 transition-colors active:scale-[0.99]"
          >
            <span>📌</span>
            <span className="flex-1 text-left">
              次の受験予定: {new Date(nextPlanOutsideView.planned_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
              {nextPlanOutsideView.qualification_name && (
                <span className="ml-1 text-teal-500 font-normal">
                  ({nextPlanOutsideView.qualification_name})
                </span>
              )}
            </span>
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        )}

        {isLoading && <LoadingState />}
        {isError && <ErrorState onRetry={refetch} />}

        {!isLoading && !isError && events.length === 0 && myPlans.length === 0 && (
          <EmptyState
            title="カレンダーにイベントがありません"
            description="管理画面から試験日程を登録するか、資格の詳細ページから受験予定を追加してください"
            icon={<Calendar className="w-10 h-10" />}
          />
        )}

        {!isLoading && !isError && (
          <div className="card px-1 py-3 sm:p-5">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={jaLocale}
              events={allDisplayEvents}
              eventClick={handleEventClick}
              datesSet={handleDatesSet}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth',
              }}
              height="auto"
              eventDisplay="block"
              dayMaxEvents={2}
              eventMouseEnter={(info) => { info.el.style.cursor = 'pointer'; }}
            />
          </div>
        )}

        {selectedEvent && (
          <EventPopup
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onAddPlan={user ? handleAddPlan : undefined}
            alreadyPlanned={plannedSet.has(
              `${selectedEvent.extendedProps.qualification_id}::${selectedEvent.start}`
            )}
          />
        )}

        <div className="h-2" />
      </div>
    </div>
  );
}
