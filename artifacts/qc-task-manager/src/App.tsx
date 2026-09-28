import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, ArrowUpRight, Bell, CalendarClock, Check, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Filter, Gauge, LayoutDashboard, ListFilter, Menu,
  Pencil, Plus, RefreshCw, Search, Settings2, ShieldCheck, SlidersHorizontal, Sparkles,
  Trash2, X, Zap
} from 'lucide-react';
import { Link, Route, Switch, useLocation } from 'wouter';
import {
  getGetDashboardSummaryQueryKey, getGetSystemStatusQueryKey, getGetTaskQueryKey,
  getHealthCheckQueryKey, getListTasksQueryKey, useCompleteTask, useCreateTask,
  useDeleteTask, useGetDashboardSummary, useGetSystemStatus, useGetTask, useHealthCheck,
  useListTasks, useUpdateTask
} from '@workspace/api-client-react';
import type { Task } from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();

const formatDate = (value?: string | null, withYear = false) => value ? new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', ...(withYear ? { year: 'numeric' } : {}), hour: 'numeric', minute: '2-digit'
}).format(new Date(value)) : '—';

const relativeLabel = (value: string) => {
  const delta = new Date(value).getTime() - Date.now();
  const hours = Math.round(Math.abs(delta) / 3600000);
  if (Math.abs(delta) < 3600000) return delta >= 0 ? `in ${Math.max(1, Math.round(Math.abs(delta) / 60000))} min` : `${Math.max(1, Math.round(Math.abs(delta) / 60000))} min late`;
  if (Math.abs(delta) < 86400000) return delta >= 0 ? `in ${hours}h` : `${hours}h late`;
  const days = Math.round(Math.abs(delta) / 86400000);
  return delta >= 0 ? `in ${days}d` : `${days}d late`;
};

function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const status = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey(), refetchInterval: 30000 } });
  const health = useHealthCheck({ query: { queryKey: getHealthCheckQueryKey(), refetchInterval: 30000 } });
  const tasks = useListTasks({ status: 'pending' }, { query: { queryKey: getListTasksQueryKey({ status: 'pending' }), refetchInterval: 15000 } });
  const [reminder, setReminder] = useState<Task | null>(null);
  const remindedTasks = useRef(new Set<string>());
  const system = status.data;
  const operational = system?.status === 'operational' && health.data?.status !== 'down';
  useEffect(() => {
    const dueTask = tasks.data?.find((task) => task.status === 'pending' && new Date(task.scheduledAt).getTime() <= Date.now());
    if (!dueTask) return;
    const reminderKey = `${dueTask.id}:${dueTask.scheduledAt}`;
    if (remindedTasks.current.has(reminderKey)) return;
    remindedTasks.current.add(reminderKey);
    setReminder(dueTask);
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('QC check due', { body: dueTask.title });
    }
  }, [tasks.data]);
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[258px] bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col px-5 py-6">
          <div className="mb-11 flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <ShieldCheck size={21} strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-[17px] font-bold tracking-tight">vericline</div>
              <div className="font-mono-ui text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/45">quality operations</div>
            </div>
          </div>
          <div className="mb-3 px-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Workspace</div>
          <nav className="space-y-1">
            <NavLink href="/" active={location === '/'} icon={<LayoutDashboard size={17} />} label="Overview" testId="link-overview" onClick={() => setMobileOpen(false)} />
            <NavLink href="/tasks" active={location.startsWith('/tasks')} icon={<ClipboardCheck size={17} />} label="Task queue" testId="link-task-queue" onClick={() => setMobileOpen(false)} />
          </nav>
          <div className="mt-10 px-3 font-mono-ui text-[10px] uppercase tracking-[.18em] text-sidebar-foreground/40">Monitor</div>
          <div className="mt-3 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold">
              <span className={`status-dot h-2 w-2 rounded-full ${operational ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {operational ? 'All systems clear' : 'Checking systems'}
            </div>
            <div className="mt-2 flex items-center justify-between font-mono-ui text-[10px] text-sidebar-foreground/45">
              <span>API {system?.apiStatus ?? '—'}</span>
              <span>{system?.responseTimeMs ?? '—'}ms</span>
            </div>
          </div>
          <div className="mt-auto border-t border-sidebar-border pt-4">
            <button type="button" data-testid="button-settings" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground">
              <Settings2 size={16} /> Preferences <span className="ml-auto font-mono-ui text-[9px] text-sidebar-foreground/35">soon</span>
            </button>
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-sidebar-accent/65 p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-[12px] font-bold text-sidebar-primary-foreground">QC</div>
              <div className="min-w-0"><div className="truncate text-xs font-semibold">Quality control</div><div className="truncate text-[10px] text-sidebar-foreground/45">Operations team</div></div>
            </div>
          </div>
        </div>
      </aside>
      {mobileOpen && <button aria-label="Close menu" data-testid="button-close-menu" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-sidebar/35 lg:hidden" />}
      <main className="min-h-[100dvh] lg:pl-[258px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md lg:px-10">
          <div className="flex items-center gap-3">
            <button aria-label="Open menu" data-testid="button-open-menu" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 hover:bg-muted lg:hidden"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.16em] text-muted-foreground sm:flex"><span className="text-primary">QC /</span> {location === '/tasks' ? 'Task queue' : 'Today at a glance'}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Live workspace</div>
            <button type="button" data-testid="button-notifications" onClick={() => requestNotifications()} className="relative rounded-lg border border-border bg-card p-2.5 text-muted-foreground hover:text-foreground"><Bell size={16} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" /></button>
          </div>
        </header>
        {reminder && <div role="alert" aria-live="assertive" className="fixed right-5 top-[88px] z-40 flex max-w-sm items-start gap-3 rounded-xl border border-primary/30 bg-card p-4 shadow-xl">
          <div className="rounded-lg bg-primary/15 p-2 text-primary"><Bell size={16} /></div>
          <div className="min-w-0 flex-1"><div className="font-mono-ui text-[10px] uppercase tracking-[.14em] text-primary">Check due now</div><div className="mt-1 text-sm font-semibold">{reminder.title}</div><div className="mt-1 text-xs text-muted-foreground">Open the task queue to complete or reschedule it.</div></div>
          <button type="button" aria-label="Dismiss reminder" data-testid="button-dismiss-reminder" onClick={() => setReminder(null)} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X size={15} /></button>
        </div>}
        <div className="mx-auto max-w-[1500px] px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}

function NavLink({ href, active, icon, label, testId, onClick }: { href: string; active: boolean; icon: ReactNode; label: string; testId: string; onClick: () => void }) {
  return <Link href={href} onClick={onClick} data-testid={testId} className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}>{icon}<span>{label}</span>{active && <ChevronRight size={14} className="ml-auto opacity-60" />}</Link>;
}

function requestNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') void Notification.requestPermission();
}

function Button({ children, variant = 'primary', onClick, type = 'button', disabled = false, testId, className = '' }: { children: ReactNode; variant?: 'primary' | 'quiet' | 'danger' | 'outline'; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; testId: string; className?: string }) {
  const styles = { primary: 'bg-primary text-primary-foreground hover:bg-primary/90', quiet: 'bg-secondary text-secondary-foreground hover:bg-secondary/75', danger: 'bg-destructive/10 text-destructive hover:bg-destructive/15', outline: 'border border-border bg-card text-foreground hover:bg-muted' };
  return <button type={type} disabled={disabled} onClick={onClick} data-testid={testId} className={`inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}>{children}</button>;
}

function MetricCard({ label, value, detail, tone, icon }: { label: string; value?: number; detail: string; tone: string; icon: ReactNode }) {
  return <div className="soft-shadow rounded-xl border border-card-border bg-card p-5">
    <div className="flex items-start justify-between"><span className="font-mono-ui text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</span><span className={`rounded-lg p-2 ${tone}`}>{icon}</span></div>
    <div data-testid={`metric-${label.toLowerCase()}`} className="mt-5 font-display text-4xl font-bold tracking-tight">{value ?? <span className="inline-block h-9 w-12 animate-pulse rounded bg-muted" />}</div>
    <div className="mt-2 text-[11px] text-muted-foreground">{detail}</div>
  </div>;
}

function TaskRow({ task, onComplete, onEdit, onDelete, compact = false }: { task: Task; onComplete: (id: number) => void; onEdit: (id: number) => void; onDelete: (id: number) => void; compact?: boolean }) {
  const late = task.status === 'pending' && new Date(task.scheduledAt).getTime() < Date.now();
  return <div data-testid={`task-row-${task.id}`} className={`group flex items-center gap-3 border-b border-border/70 py-3.5 last:border-0 ${compact ? '' : 'px-1'}`}>
    <button type="button" data-testid={`button-complete-${task.id}`} aria-label={`Complete ${task.title}`} onClick={() => onComplete(task.id)} disabled={task.status === 'completed'} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${task.status === 'completed' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-border bg-background text-transparent hover:border-primary hover:bg-primary/10'}`}><Check size={14} strokeWidth={3} /></button>
    <div className="min-w-0 flex-1">
      <div className={`truncate text-[13px] font-semibold ${task.status === 'completed' ? 'text-muted-foreground line-through' : ''}`}>{task.title}</div>
      <div className={`mt-1 flex items-center gap-2 font-mono-ui text-[10px] ${late ? 'text-destructive' : 'text-muted-foreground'}`}><Clock3 size={11} />{formatDate(task.scheduledAt)}<span className="text-border">·</span><span>{task.status === 'completed' ? 'completed' : relativeLabel(task.scheduledAt)}</span></div>
    </div>
    {!compact && <div className="hidden items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
      <button type="button" data-testid={`button-edit-${task.id}`} onClick={() => onEdit(task.id)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
      <button type="button" data-testid={`button-delete-${task.id}`} onClick={() => onDelete(task.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
    </div>}
  </div>;
}

function TaskForm({ editingId, onClose, onSaved }: { editingId: number | null; onClose: () => void; onSaved: () => void }) {
  const taskQuery = useGetTask(editingId ?? 0, { query: { enabled: editingId !== null, queryKey: getGetTaskQueryKey(editingId ?? 0) } });
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (taskQuery.data) {
      setTitle(taskQuery.data.title);
      const date = new Date(taskQuery.data.scheduledAt);
      setScheduledAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else if (editingId === null) {
      const date = new Date(Date.now() + 3600000);
      setScheduledAt(new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    }
  }, [taskQuery.data, editingId]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !scheduledAt) { setError('Add a title and schedule time.'); return; }
    setError('');
    const data = { title: title.trim(), scheduledAt: new Date(scheduledAt).toISOString() };
    if (editingId === null) createTask.mutate({ data }, { onSuccess: () => { onSaved(); onClose(); } });
    else updateTask.mutate({ id: editingId, data }, { onSuccess: () => { onSaved(); onClose(); } });
  };
  const pending = createTask.isPending || updateTask.isPending;
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5">
    <div role="dialog" aria-modal="true" className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl">
      <div className="flex items-start justify-between"><div><div className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-primary">{editingId === null ? 'New checkpoint' : 'Edit checkpoint'}</div><h2 className="mt-2 font-display text-2xl font-bold">{editingId === null ? 'Schedule a quality check' : 'Adjust this check'}</h2><p className="mt-1 text-sm text-muted-foreground">Keep the next handoff clear and timed.</p></div><button type="button" data-testid="button-close-task-form" onClick={onClose} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button></div>
      {taskQuery.isLoading ? <div className="mt-8 space-y-4"><div className="h-11 animate-pulse rounded-lg bg-muted" /><div className="h-11 animate-pulse rounded-lg bg-muted" /></div> : <form onSubmit={submit} className="mt-7 space-y-5">
        <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Check name</span><input data-testid="input-task-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Verify lot 24B labels" className="w-full rounded-lg border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
        <label className="block"><span className="mb-2 block text-[11px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Scheduled for</span><input data-testid="input-task-scheduled-at" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3.5 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
        {error && <div data-testid="status-form-error" className="flex items-center gap-2 text-xs text-destructive"><AlertCircle size={14} />{error}</div>}
        <div className="flex justify-end gap-2 border-t border-border pt-5"><Button testId="button-cancel-task" variant="quiet" onClick={onClose}>Cancel</Button><Button testId="button-save-task" type="submit" disabled={pending}>{pending ? 'Saving…' : editingId === null ? <><Plus size={15} /> Add checkpoint</> : <><Check size={15} /> Save changes</>}</Button></div>
      </form>}
    </div>
  </div>;
}

function useTaskActions() {
  const qc = useQueryClient();
  const complete = useCompleteTask();
  const remove = useDeleteTask();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: getListTasksQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    void qc.invalidateQueries({ queryKey: getGetSystemStatusQueryKey() });
  };
  return {
    complete: (id: number) => complete.mutate({ id }, { onSuccess: refresh }),
    remove: (id: number) => { if (window.confirm('Delete this checkpoint? This cannot be undone.')) remove.mutate({ id }, { onSuccess: refresh }); },
    refresh,
    pending: complete.isPending || remove.isPending
  };
}

function Dashboard() {
  const summary = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey(), refetchInterval: 30000 } });
  const list = useListTasks({ status: 'all' }, { query: { queryKey: getListTasksQueryKey({ status: 'all' }) } });
  const actions = useTaskActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const upcoming = useMemo(() => (summary.data?.upcoming ?? list.data ?? []).filter((task) => task.status === 'pending').slice(0, 5), [summary.data?.upcoming, list.data]);
  const overdue = useMemo(() => (list.data ?? []).filter((task) => task.status === 'pending' && new Date(task.scheduledAt).getTime() < Date.now()).slice(0, 3), [list.data]);
  const openEdit = (id: number) => { setEditingId(id); setFormOpen(true); };
  const todayLabel = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date());
  return <div className="space-y-8">
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><div className="mb-3 flex items-center gap-2 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> {todayLabel}</div><h1 className="font-display text-4xl font-bold tracking-[-.04em] sm:text-5xl">Keep the line moving.</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">A clear view of every check, before it becomes a question.</p></div><Button testId="button-add-task" onClick={() => { setEditingId(null); setFormOpen(true); }}><Plus size={16} /> Schedule check</Button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total checks" value={summary.data?.total} detail="Across the active queue" tone="bg-primary/15 text-primary" icon={<ClipboardCheck size={17} />} />
      <MetricCard label="In progress" value={summary.data?.pending} detail={summary.data?.overdue ? `${summary.data.overdue} need attention` : 'No overdue checks'} tone="bg-accent text-foreground" icon={<Clock3 size={17} />} />
      <MetricCard label="Completed" value={summary.data?.completed} detail="Checks closed out" tone="bg-emerald-100 text-emerald-700" icon={<CheckCircle2 size={17} />} />
      <MetricCard label="Overdue" value={summary.data?.overdue} detail="Past their scheduled time" tone="bg-red-100 text-red-700" icon={<AlertCircle size={17} />} />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_.85fr]">
      <section className="soft-shadow rounded-xl border border-card-border bg-card p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between"><div><div className="flex items-center gap-2"><CalendarClock size={17} className="text-primary" /><h2 className="font-display text-xl font-bold">Next on the line</h2></div><p className="mt-1 text-xs text-muted-foreground">Upcoming quality checks, ordered by time.</p></div><Link href="/tasks" data-testid="link-view-all-tasks" className="text-[11px] font-semibold text-primary hover:underline">View all <ArrowUpRight size={13} className="ml-1 inline" /></Link></div>
        {summary.isLoading && <div className="space-y-2 pt-3">{[1, 2, 3].map((n) => <div key={n} className="h-14 animate-pulse rounded-lg bg-muted" />)}</div>}
        {summary.isError && <InlineError onRetry={() => void summary.refetch()} />}
        {!summary.isLoading && !summary.isError && upcoming.length === 0 && <EmptyState onAdd={() => { setEditingId(null); setFormOpen(true); }} />}
        <div>{upcoming.map((task) => <TaskRow key={task.id} task={task} onComplete={actions.complete} onEdit={openEdit} onDelete={actions.remove} />)}</div>
      </section>
      <section className="paper-grid relative overflow-hidden rounded-xl border border-card-border bg-card p-5 sm:p-6">
        <div className="relative"><div className="flex items-center gap-2"><Zap size={17} className="text-primary" /><h2 className="font-display text-xl font-bold">Watch list</h2></div><p className="mt-1 text-xs text-muted-foreground">Small things worth seeing early.</p>
        {overdue.length > 0 ? <div className="mt-5 space-y-1">{overdue.map((task) => <div key={task.id} className="rounded-lg border border-destructive/15 bg-destructive/5 p-3"><div className="flex items-start gap-2"><AlertCircle size={14} className="mt-0.5 shrink-0 text-destructive" /><div className="min-w-0"><div className="truncate text-xs font-semibold">{task.title}</div><div className="mt-1 font-mono-ui text-[10px] text-destructive">{relativeLabel(task.scheduledAt)}</div></div><button type="button" data-testid={`button-watch-edit-${task.id}`} onClick={() => openEdit(task.id)} className="ml-auto rounded-md p-1 text-muted-foreground hover:bg-background"><Pencil size={13} /></button></div></div>)}</div> : <div className="mt-8 rounded-lg border border-dashed border-border bg-background/55 p-5 text-center"><CheckCircle2 className="mx-auto text-emerald-600" size={22} /><div className="mt-2 text-sm font-semibold">No loose ends</div><div className="mt-1 text-xs text-muted-foreground">Your queue is in good shape.</div></div>}
        </div>
        <div className="relative mt-6 border-t border-border/70 pt-4"><div className="flex items-center justify-between font-mono-ui text-[10px] uppercase tracking-[.12em] text-muted-foreground"><span>Queue depth</span><span data-testid="text-queue-depth">{summary.data ? `${summary.data.pending} open` : '—'}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, ((summary.data?.pending ?? 0) / Math.max(1, summary.data?.total ?? 1)) * 100)}%` }} /></div></div>
      </section>
    </div>
    <section className="rounded-xl border border-card-border bg-sidebar p-5 text-sidebar-foreground sm:p-6"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-center"><div className="flex items-start gap-3"><div className="rounded-lg bg-sidebar-primary p-2 text-sidebar-primary-foreground"><Gauge size={18} /></div><div><div className="font-display text-lg font-bold">System pulse</div><p className="mt-1 text-xs text-sidebar-foreground/55">The workspace checks in every 30 seconds.</p></div></div><SystemPulse /></div></section>
    {formOpen && <TaskForm editingId={editingId} onClose={() => setFormOpen(false)} onSaved={actions.refresh} />}
  </div>;
}

function SystemPulse() {
  const status = useGetSystemStatus({ query: { queryKey: getGetSystemStatusQueryKey() } });
  const system = status.data;
  return <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-xs sm:grid-cols-4"><div><div className="font-mono-ui text-[9px] uppercase tracking-wider text-sidebar-foreground/40">API status</div><div data-testid="status-api" className="mt-1 font-semibold">{system?.apiStatus ?? '—'}</div></div><div><div className="font-mono-ui text-[9px] uppercase tracking-wider text-sidebar-foreground/40">Response</div><div data-testid="status-response" className="mt-1 font-semibold">{system?.responseTimeMs ? `${system.responseTimeMs} ms` : '—'}</div></div><div><div className="font-mono-ui text-[9px] uppercase tracking-wider text-sidebar-foreground/40">Next check</div><div data-testid="status-next-task" className="mt-1 max-w-[110px] truncate font-semibold">{system?.nextTask ?? 'Queue clear'}</div></div><div><div className="font-mono-ui text-[9px] uppercase tracking-wider text-sidebar-foreground/40">Checked</div><div className="mt-1 font-semibold">{system?.checkedAt ? formatDate(system.checkedAt) : '—'}</div></div></div>;
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return <div className="my-5 rounded-lg border border-dashed border-border bg-background/50 p-8 text-center"><div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles size={19} /></div><div className="mt-3 text-sm font-semibold">Nothing scheduled yet</div><div className="mx-auto mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Put the first check on the line and give your team a clear next move.</div><Button testId="button-empty-add-task" onClick={onAdd} className="mt-4"><Plus size={14} /> Schedule first check</Button></div>;
}

function InlineError({ onRetry }: { onRetry: () => void }) {
  return <div data-testid="status-dashboard-error" className="my-5 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-xs text-destructive"><span className="flex items-center gap-2"><AlertCircle size={15} /> Could not load the queue.</span><button type="button" data-testid="button-retry-dashboard" onClick={onRetry} className="font-semibold underline">Try again</button></div>;
}

function TasksPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const params = useMemo(() => ({ status, ...(search.trim() ? { search: search.trim() } : {}) }), [status, search]);
  const tasks = useListTasks(params, { query: { queryKey: getListTasksQueryKey(params) } });
  const actions = useTaskActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const openEdit = (id: number) => { setEditingId(id); setFormOpen(true); };
  const clearFilters = () => { setSearch(''); setStatus('all'); };
  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><div className="mb-3 font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">Task queue / all checks</div><h1 className="font-display text-4xl font-bold tracking-[-.04em]">The workbench.</h1><p className="mt-2 text-sm text-muted-foreground">Search, adjust, and close the loop on scheduled work.</p></div><Button testId="button-add-task-list" onClick={() => { setEditingId(null); setFormOpen(true); }}><Plus size={16} /> Schedule check</Button></div>
    <div className="flex flex-col gap-3 rounded-xl border border-card-border bg-card p-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><input type="search" data-testid="input-search-tasks" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search checkpoints…" className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></div><div className="flex items-center gap-2"><ListFilter size={15} className="ml-1 text-muted-foreground" /><select data-testid="select-task-status" value={status} onChange={(e) => setStatus(e.target.value as 'all' | 'pending' | 'completed')} className="rounded-lg border border-input bg-background px-3 py-2.5 text-xs font-semibold outline-none focus:border-primary"><option value="all">All checks</option><option value="pending">Open only</option><option value="completed">Completed</option></select><button type="button" data-testid="button-clear-filters" onClick={clearFilters} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Clear filters"><RefreshCw size={15} /></button></div></div>
    <div className="flex items-center justify-between"><div className="text-xs text-muted-foreground">{tasks.data ? <><span className="font-semibold text-foreground">{tasks.data.length}</span> {tasks.data.length === 1 ? 'checkpoint' : 'checkpoints'} shown</> : 'Loading queue…'}</div><div className="hidden items-center gap-1 font-mono-ui text-[10px] uppercase tracking-wider text-muted-foreground sm:flex"><SlidersHorizontal size={13} /> Sort: scheduled time</div></div>
    <section className="soft-shadow overflow-hidden rounded-xl border border-card-border bg-card">
      <div className="hidden grid-cols-[1fr_170px_120px_86px] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-mono-ui text-[10px] uppercase tracking-[.13em] text-muted-foreground sm:grid"><div>Checkpoint</div><div>Scheduled</div><div>Status</div><div /></div>
      {tasks.isLoading && <div className="space-y-1 p-4">{[1, 2, 3, 4].map((n) => <div key={n} className="h-[62px] animate-pulse rounded-lg bg-muted" />)}</div>}
      {tasks.isError && <div className="p-10 text-center"><AlertCircle className="mx-auto text-destructive" size={23} /><div className="mt-3 text-sm font-semibold">The queue is unavailable</div><div className="mt-1 text-xs text-muted-foreground">Try again in a moment.</div><Button testId="button-retry-tasks" variant="outline" onClick={() => void tasks.refetch()} className="mt-4">Retry</Button></div>}
      {!tasks.isLoading && !tasks.isError && tasks.data?.length === 0 && <div data-testid="status-empty-task-list" className="p-12 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Filter size={19} /></div><div className="mt-3 text-sm font-semibold">{search || status !== 'all' ? 'No checks match these filters' : 'Your workbench is empty'}</div><div className="mt-1 text-xs text-muted-foreground">{search || status !== 'all' ? 'Try a different search or clear the filters.' : 'Schedule a check to start the queue.'}</div>{(search || status !== 'all') ? <Button testId="button-empty-clear-filters" variant="quiet" onClick={clearFilters} className="mt-4">Clear filters</Button> : <Button testId="button-empty-add-list" onClick={() => { setEditingId(null); setFormOpen(true); }} className="mt-4"><Plus size={14} /> Schedule check</Button>}</div>}
      <div className="divide-y divide-border/70 px-4 sm:px-5">{tasks.data?.map((task) => <div key={task.id} className="grid items-center gap-3 py-2 sm:grid-cols-[1fr_170px_120px_86px] sm:gap-4"><div><TaskRow task={task} compact onComplete={actions.complete} onEdit={openEdit} onDelete={actions.remove} /></div><div className="hidden font-mono-ui text-[10px] text-muted-foreground sm:block">{formatDate(task.scheduledAt, true)}</div><div className="hidden sm:block"><StatusPill task={task} /></div><div className="hidden justify-end gap-1 sm:flex"><button type="button" data-testid={`button-list-edit-${task.id}`} onClick={() => openEdit(task.id)} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button><button type="button" data-testid={`button-list-delete-${task.id}`} onClick={() => actions.remove(task.id)} className="rounded-md p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></div>)}</div>
    </section>
    {formOpen && <TaskForm editingId={editingId} onClose={() => setFormOpen(false)} onSaved={actions.refresh} />}
  </div>;
}

function StatusPill({ task }: { task: Task }) {
  const late = task.status === 'pending' && new Date(task.scheduledAt).getTime() < Date.now();
  return <span data-testid={`status-task-${task.id}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono-ui text-[10px] uppercase tracking-wider ${task.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : late ? 'bg-red-100 text-red-700' : 'bg-primary/15 text-foreground'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{task.status === 'completed' ? 'Done' : late ? 'Overdue' : 'Open'}</span>;
}

function Router() {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}><AppShell><Switch><Route path="/" component={Dashboard} /><Route path="/tasks" component={TasksPage} /><Route component={NotFound} /></Switch></AppShell></ErrorBoundary>;
}

export default function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><Router /><Toaster /></TooltipProvider></QueryClientProvider>;
}