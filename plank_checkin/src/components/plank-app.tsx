"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent } from "react";
import {
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Heart,
  Home,
  KeyRound,
  LogOut,
  MoonStar,
  Settings,
  ShieldCheck,
  Sun,
  Sunrise,
  Timer,
  Trophy,
  UserPlus,
  X,
} from "lucide-react";
import type { Bootstrap, PublicUser } from "@/lib/types";

const ParticipationChart = dynamic(
  () => import("@/components/charts").then((module) => module.ParticipationChart),
  { ssr: false },
);
const ReportChart = dynamic(
  () => import("@/components/charts").then((module) => module.ReportChart),
  { ssr: false },
);

type Tab = "today" | "ranking" | "report" | "admin";
type TabItem = { id: Tab; label: string; icon: typeof Home };

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

type GreetingPeriod = "welcome" | "morning" | "afternoon" | "evening" | "night";

function getGreetingPeriod(): GreetingPeriod {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function getServerGreetingPeriod(): GreetingPeriod {
  return "welcome";
}

function subscribeToClock(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
}

function GreetingHeader({ name }: { name: string }) {
  const period = useSyncExternalStore(subscribeToClock, getGreetingPeriod, getServerGreetingPeriod);
  const greeting = {
    welcome: "Welcome back",
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    night: "Welcome back",
  }[period];
  const GreetingIcon = period === "afternoon"
    ? Sun
    : period === "evening" || period === "night"
      ? MoonStar
      : Sunrise;

  return (
    <header className="workspace-header">
      <GreetingIcon size={28} aria-hidden="true" />
      <h1>{greeting}, {titleName(name)}</h1>
    </header>
  );
}

async function callApi(payload: Record<string, unknown>) {
  const response = await fetch("/api/app", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Please try again.");
  return result;
}

export function PlankApp() {
  const [data, setData] = useState<Bootstrap | null>(null);
  const [tab, setTab] = useState<Tab>("today");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/app", { cache: "no-store" });
      const nextData = await response.json();
      if (!response.ok) throw new Error(nextData.error || "Unable to load.");
      setData(nextData);
      setError("");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/app", { cache: "no-store" })
      .then(async (response) => {
        const nextData = await response.json();
        if (!response.ok) throw new Error(nextData.error || "Unable to load.");
        if (!cancelled) {
          setData(nextData);
          setError("");
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load.");
        }
      });
    return () => { cancelled = true; };
  }, []);

  const mutate = useCallback(async (payload: Record<string, unknown>, success?: string) => {
    setBusy(true);
    setError("");
    try {
      await callApi(payload);
      if (success) setMessage(success);
      await load();
      return true;
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : "Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }, [load]);

  if (!data) return <LoadingScreen />;
  if (!data.configured) return <SetupScreen />;
  if (!data.currentUser || !data.dashboard) {
    return <LoginScreen users={data.users} busy={busy} error={error} onLogin={async (userId, password) => {
      const ok = await mutate({ action: "authenticate", userId, password });
      if (ok) setTab("today");
    }} />;
  }

  const user = data.currentUser;
  const dashboard = data.dashboard;
  const tabs: TabItem[] = [
    { id: "today", label: "Today / 今日", icon: Home },
    { id: "ranking", label: "Ranking / 排名", icon: BarChart3 },
    { id: "report", label: "Report / 报告", icon: FileText },
    ...(user.isAdmin ? [{ id: "admin" as Tab, label: "Admin / 管理", icon: Settings }] : []),
  ];

  const selectTab = (nextTab: Tab) => {
    setTab(nextTab);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "auto" });
  };
  const switchUser = () => void mutate({ action: "logout" });

  return (
    <div className="app-shell">
      <aside className="desktop-sidebar">
        <div className="sidebar-brand"><BrandMark /><div><strong>Plank Check-in</strong><span>平板打卡</span></div></div>
        <AppNavigation tabs={tabs} activeTab={tab} onSelect={selectTab} variant="desktop" />
        <div className="sidebar-account">
          <div className="profile-avatar" aria-hidden="true">{user.name[0].toUpperCase()}</div>
          <strong>{titleName(user.name)}</strong>
          <span>{user.isAdmin ? "Admin / 管理员" : "Member / 成员"}</span>
          <button onClick={switchUser} disabled={busy}><LogOut size={17} /> Switch user</button>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar">
          <div className="mobile-brand"><BrandMark /><div><strong>Plank Check-in</strong><span>平板打卡</span></div></div>
          <button className="profile-button" onClick={switchUser} disabled={busy} aria-label="Switch user">
            <span>{user.name[0].toUpperCase()}</span><ChevronDown size={17} />
          </button>
        </header>

        <GreetingHeader name={user.name} />

        {error ? <div className="notice error" role="alert">{error}</div> : null}
        {message ? <div className="notice success" role="status">{message}</div> : null}

        <main className="app-content">
          <div className="screen-transition" key={tab}>
            {tab === "today" ? <TodayView dashboard={dashboard} busy={busy} mutate={mutate} setMessage={setMessage} /> : null}
            {tab === "ranking" ? <RankingView dashboard={dashboard} /> : null}
            {tab === "report" ? <ReportView name={user.name} dashboard={dashboard} /> : null}
            {tab === "admin" && user.isAdmin ? <AdminView dashboard={dashboard} busy={busy} mutate={mutate} /> : null}
          </div>
        </main>
      </div>

      <AppNavigation tabs={tabs} activeTab={tab} onSelect={selectTab} variant="mobile" />
    </div>
  );
}

function BrandMark() {
  return <span className="brand-mark" aria-hidden="true"><Timer size={27} strokeWidth={2.4} /></span>;
}

function AppNavigation({ tabs, activeTab, onSelect, variant }: {
  tabs: TabItem[];
  activeTab: Tab;
  onSelect: (tab: Tab) => void;
  variant: "mobile" | "desktop";
}) {
  return (
    <nav className={variant === "mobile" ? "bottom-nav" : "desktop-nav"} aria-label="Main navigation">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = activeTab === item.id;
        return (
          <button key={item.id} className={active ? "active" : ""} onClick={() => onSelect(item.id)} aria-current={active ? "page" : undefined}>
            <span className="nav-icon"><Icon size={22} strokeWidth={2.2} /></span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function LoginScreen({ users, busy, error, onLogin }: {
  users: PublicUser[];
  busy: boolean;
  error: string;
  onLogin: (userId: number, password: string) => Promise<void>;
}) {
  const [selected, setSelected] = useState<PublicUser | null>(users[0] || null);
  const [password, setPassword] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (selected && password) void onLogin(selected.id, password);
  };
  return (
    <div className="login-shell">
      <div className="login-panel glass-panel">
        <div className="brand-lockup">
          <Timer size={31} />
          <h1>Plank Check-in <span>/ 平板打卡</span></h1>
        </div>
        <p className="login-intro">Choose your name to continue. This browser will remember you.</p>
        <div className="user-list" role="listbox" aria-label="Choose user">
          {users.map((user) => (
            <button key={user.id} className={selected?.id === user.id ? "selected" : ""} onClick={() => { setSelected(user); setPassword(""); }}>
              <span>{titleName(user.name)}</span>
              <span className="user-role">{user.isAdmin ? "Admin" : "Member"}</span>
              {selected?.id === user.id ? <Check size={20} /> : null}
            </button>
          ))}
        </div>
        {selected ? (
          <form onSubmit={submit} className="login-form">
            <label htmlFor="password">
              {selected.hasPassword ? "Password / 密码" : "Set a password / 设置密码"}
            </label>
            <input id="password" type="text" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder={selected.hasPassword ? "Enter your password" : "Pick something memorable"} />
            <p>{selected.hasPassword ? "We’ll keep you signed in on this browser." : "It stays visible while you type, as requested."}</p>
            {error ? <div className="notice error" role="alert">{error}</div> : null}
            <button className="primary-button" disabled={busy || !password}>{busy ? "One moment…" : selected.hasPassword ? "Continue / 继续" : "Save & continue / 保存并继续"}</button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function TodayView({ dashboard, busy, mutate, setMessage }: {
  dashboard: NonNullable<Bootstrap["dashboard"]>;
  busy: boolean;
  mutate: (payload: Record<string, unknown>, success?: string) => Promise<boolean>;
  setMessage: (message: string) => void;
}) {
  const [seconds, setSeconds] = useState("");
  const [showLeave, setShowLeave] = useState(false);
  const [days, setDays] = useState("1");
  const [reason, setReason] = useState("");
  const average = dashboard.report.averageSeconds;
  const encouragement = useMemo(() => {
    const value = Number(seconds);
    if (!value) return "Consistency beats intensity. Every second counts.";
    if (!average) return "A first mark on the ice—show up and make it yours.";
    if (value >= average * 1.25) return "New altitude. That hold was well above your average.";
    if (value >= average) return "Strong and steady—you beat your average today.";
    return "You showed up. Small planks build lasting strength.";
  }, [seconds, average]);

  const submitCheckin = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await mutate({ action: "checkin", seconds: Number(seconds) });
    if (ok) {
      setMessage(`${encouragement} / 打卡成功！`);
      setSeconds("");
    }
  };
  const submitLeave = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await mutate({ action: "requestLeave", days: Number(days), reason }, "Leave request sent / 请假申请已提交");
    if (ok) { setShowLeave(false); setReason(""); }
  };

  return (
    <div className="today-view">
      <section className="money-strip glass-panel">
        <Metric label="Total penalty pool / 总罚款池" value={money.format(dashboard.totalPoolCents / 100)} />
        <Metric label="My amount due / 我应缴" value={money.format(dashboard.myDueCents / 100)} accent />
      </section>

      <section className="yesterday glass-panel">
        <div><Trophy size={22} /><span>Yesterday’s champion / 昨日冠军</span><strong>{dashboard.yesterday.champion ? titleName(dashboard.yesterday.champion) : "—"}</strong><small>{dashboard.yesterday.championSeconds || 0}s</small></div>
        <div><span>Average / 平均</span><strong>{dashboard.yesterday.averageSeconds}s</strong></div>
        <div><span>Median / 中位数</span><strong>{dashboard.yesterday.medianSeconds}s</strong></div>
      </section>

      <section className="checkin-panel glass-panel">
        <div className="section-heading"><div><span>Today’s plank time</span><small>今日平板时间（秒）</small></div><Timer size={25} /></div>
        <form onSubmit={submitCheckin}>
          <div className="seconds-input"><input inputMode="numeric" pattern="[0-9]*" min="1" max="7200" value={seconds} onChange={(event) => setSeconds(event.target.value.replace(/\D/g, ""))} placeholder="120" aria-label="Plank time in seconds" /><span>sec / 秒</span></div>
          <button className="primary-button" disabled={busy || !Number(seconds)}>Check in / 打卡</button>
        </form>
      </section>

      <section className="leave-panel glass-panel">
        <button className="leave-toggle" onClick={() => setShowLeave((value) => !value)} aria-expanded={showLeave}>
          <span className="row-icon"><CalendarDays size={23} /></span>
          <span className="row-copy"><strong>Need a break? / 需要休息？</strong><small>Request leave / 请假</small></span>
          <ChevronRight className={showLeave ? "expanded" : ""} size={22} />
        </button>
        {showLeave ? (
          <form className="leave-form" onSubmit={submitLeave}>
            <label>Days / 天数<input type="number" min="1" max="30" value={days} onChange={(event) => setDays(event.target.value)} /></label>
            <label>Reason (optional) / 原因<input type="text" maxLength={240} value={reason} onChange={(event) => setReason(event.target.value)} /></label>
            <button className="secondary-button" disabled={busy}>Submit request / 提交申请</button>
          </form>
        ) : null}
      </section>

      <section className="encouragement glass-panel"><span className="row-icon"><Heart size={25} /></span><p><strong>{encouragement}</strong><small>每天坚持一点点，我们更强大。</small></p></section>
    </div>
  );
}

function RankingView({ dashboard }: { dashboard: NonNullable<Bootstrap["dashboard"]> }) {
  return (
    <div className="screen-stack">
      <section className="glass-panel content-panel">
        <div className="section-title"><h2>Daily ranking / 今日排名</h2><span>{dashboard.exerciseDate}</span></div>
        <div className="ranking-table">
          {dashboard.ranking.map((row, index) => (
            <div className="ranking-row" key={row.id}>
              <span className="rank-number">{index + 1}</span><strong>{titleName(row.name)}</strong><span>{row.seconds == null ? "Not yet / 未打卡" : `${row.seconds}s`}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="glass-panel content-panel">
        <div className="section-title"><h2>10-day participation / 近10天参与</h2></div>
        <ParticipationChart data={dashboard.trend} />
        <div className="chart-legend"><span><i className="blue" /> Check-ins</span><span><i className="amber" /> Average seconds</span></div>
      </section>
    </div>
  );
}

function ReportView({ name, dashboard }: { name: string; dashboard: NonNullable<Bootstrap["dashboard"]> }) {
  return (
    <div className="screen-stack report-screen" id="personal-report">
      <section className="glass-panel content-panel">
        <div className="section-title"><div><h2>{titleName(name)}’s report</h2><span>个人打卡报告</span></div><button className="text-action print-button" onClick={() => window.print()}><FileText size={17} /> Generate / 生成</button></div>
        <div className="report-stats">
          <Metric label="Check-ins / 次数" value={String(dashboard.report.totalCheckins)} />
          <Metric label="Average / 平均" value={`${dashboard.report.averageSeconds}s`} />
          <Metric label="Median / 中位" value={`${dashboard.report.medianSeconds}s`} />
          <Metric label="Best / 最佳" value={`${dashboard.report.bestSeconds}s`} accent />
        </div>
      </section>
      <section className="glass-panel content-panel"><div className="section-title"><h2>Progress / 进步曲线</h2></div><ReportChart data={dashboard.report.history} /></section>
      <section className="glass-panel content-panel">
        <div className="section-title"><h2>All check-ins / 全部记录</h2></div>
        <div className="history-table"><div className="history-head"><span>Date / 日期</span><span>Time / 秒</span></div>{dashboard.report.history.map((row) => <div key={row.date}><span>{row.date}</span><strong>{row.seconds}s</strong></div>)}</div>
      </section>
    </div>
  );
}

function AdminView({ dashboard, busy, mutate }: {
  dashboard: NonNullable<Bootstrap["dashboard"]>;
  busy: boolean;
  mutate: (payload: Record<string, unknown>, success?: string) => Promise<boolean>;
}) {
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const addUser = async (event: FormEvent) => {
    event.preventDefault();
    const ok = await mutate({ action: "addUser", name, isAdmin }, "User added / 用户已添加");
    if (ok) { setName(""); setIsAdmin(false); }
  };
  return (
    <div className="screen-stack admin-screen">
      <section className="glass-panel content-panel">
        <div className="section-title"><h2>Pending leave / 待审批请假</h2><span>{dashboard.pendingLeaves.length}</span></div>
        {dashboard.pendingLeaves.length ? dashboard.pendingLeaves.map((request) => (
          <article className="leave-request" key={request.id}>
            <div><strong>{titleName(request.userName)}</strong><span>{request.startDate} · {request.days} day{request.days > 1 ? "s" : ""}</span><p>{request.reason || "No reason provided"}</p></div>
            <div className="request-actions"><button className="approve" disabled={busy} onClick={() => void mutate({ action: "reviewLeave", requestId: request.id, decision: "approved" }, "Leave approved / 已批准")}><Check size={17} /> Approve</button><button className="decline" disabled={busy} onClick={() => void mutate({ action: "reviewLeave", requestId: request.id, decision: "declined" }, "Leave declined / 已拒绝")}><X size={17} /> Decline</button></div>
          </article>
        )) : <p className="empty-copy">No requests waiting / 暂无待审批申请</p>}
      </section>

      <section className="glass-panel content-panel">
        <div className="section-title"><h2>Add user / 添加用户</h2><UserPlus size={20} /></div>
        <form className="add-user-form" onSubmit={addUser}><input value={name} maxLength={50} onChange={(event) => setName(event.target.value)} placeholder="Name / 姓名" /><label><input type="checkbox" checked={isAdmin} onChange={(event) => setIsAdmin(event.target.checked)} /> Admin / 管理员</label><button className="secondary-button" disabled={busy || !name.trim()}>Add / 添加</button></form>
      </section>

      <section className="glass-panel content-panel">
        <div className="section-title"><h2>People & payments / 用户与缴费</h2><ShieldCheck size={20} /></div>
        <div className="admin-users">
          {dashboard.adminUsers.map((user) => (
            <div className="admin-user" key={user.id}>
              <div><strong>{titleName(user.name)}</strong><span>{user.isAdmin ? "Admin" : "Member"} · Due {money.format(user.dueCents / 100)}</span></div>
              <div><button disabled={busy || !user.dueCents} onClick={() => void mutate({ action: "clearDue", userId: user.id }, "Payment recorded / 已清除欠款")}><CircleDollarSign size={17} /> Clear due</button><button disabled={busy || !user.hasPassword} onClick={() => { if (window.confirm(`Clear ${user.name}'s password and remembered logins?`)) void mutate({ action: "clearPassword", userId: user.id }, "Password cleared / 密码已清除"); }}><KeyRound size={17} /> Clear password</button></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="metric"><span>{label}</span><strong className={accent ? "accent" : ""}>{value}</strong></div>;
}

function LoadingScreen() { return <div className="center-screen"><div className="loader" /><p>Preparing the ice… / 正在加载</p></div>; }
function SetupScreen() { return <div className="center-screen"><div className="setup-card glass-panel"><Settings size={32} /><h1>Database connection needed</h1><p>The app is built and ready. Connect the free Postgres resource in Vercel to begin.</p></div></div>; }
function titleName(value: string) { return value ? value[0].toUpperCase() + value.slice(1) : value; }
