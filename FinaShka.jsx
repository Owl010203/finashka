import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0a0d14", card: "#111827", border: "#1e2d45",
  accent: "#10b981", accentDim: "#064e3b",
  gold: "#f59e0b", goldDim: "#451a03",
  text: "#f1f5f9", muted: "#64748b",
  danger: "#ef4444", dangerDim: "#450a0a",
  info: "#3b82f6", purple: "#8b5cf6",
};

// ─── STORAGE ──────────────────────────────────────────────────────────────────
const KEYS = {
  months: "finashka:months",
  funds: "finashka:funds",
  fixed: "finashka:fixed",
  settings: "finashka:settings2",
  debts: "finashka:debts",
};
async function sGet(k) { try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function sSet(k, v) { try { await window.storage.set(k, JSON.stringify(v)); } catch {} }

// ─── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_FUNDS = [
  { id: "1", name: "Отпуск", icon: "✈️", target: 150000, current: 0, color: "#3b82f6", pct: 10 },
  { id: "2", name: "Резерв", icon: "🛡️", target: 100000, current: 0, color: "#10b981", pct: 15 },
  { id: "3", name: "Крупная покупка", icon: "🎯", target: 50000, current: 0, color: "#f59e0b", pct: 5 },
];
const DEFAULT_FIXED = [
  { id: "1", name: "Квартплата", amount: 5000, day: 20, icon: "🏠" },
  { id: "2", name: "Мобильная связь", amount: 399, day: 25, icon: "📱" },
  { id: "3", name: "Подписки", amount: 500, day: 1, icon: "📺" },
];
const DEFAULT_SETTINGS = {
  salary: 0,
  parentHelp: 0,
  parentRegular: false,
  salaryLimitPct: 65,
  baseAmount: 0,
  aiHistory: [],
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmt = (n) => `${Number(n || 0).toLocaleString("ru-RU")} ₽`;
const monthKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const monthLabel = (mk) => {
  const [y, m] = mk.split("-");
  return `${["Янв","Фев","Мар","Апр","Май","Июн","Июл","Авг","Сен","Окт","Ноя","Дек"][+m-1]} ${y}`;
};
const todayStr = () => new Date().toISOString().split("T")[0];
const daysInMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Card({ children, style = {}, onClick }) {
  return <div onClick={onClick} style={{ background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, padding: 16, marginBottom: 12, cursor: onClick ? "pointer" : undefined, ...style }}>{children}</div>;
}
function Badge({ label, color = T.accent }) {
  return <span style={{ background: color + "22", color, borderRadius: 8, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>{label}</span>;
}
function Inp({ label, value, onChange, type = "text", placeholder = "", icon = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      {label && <div style={{ color: T.muted, fontSize: 11, marginBottom: 4, letterSpacing: 0.5 }}>{icon} {label.toUpperCase()}</div>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: "#0f172a", border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, padding: "10px 12px", fontSize: 15, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}
function Btn({ label, onClick, color = T.accent, small, full, disabled, icon }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{ background: disabled ? T.border : color, color: "#fff", border: "none", borderRadius: small ? 8 : 12, padding: small ? "6px 12px" : "12px 20px", fontSize: small ? 12 : 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", width: full ? "100%" : undefined, opacity: disabled ? 0.5 : 1 }}>
      {icon && <span style={{ marginRight: 5 }}>{icon}</span>}{label}
    </button>
  );
}
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000b", zIndex: 999, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.card, borderRadius: "20px 20px 0 0", padding: 20, width: "100%", maxHeight: "85vh", overflowY: "auto", boxSizing: "border-box", border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.muted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Toggle({ value, onChange, label }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
      <span style={{ fontSize: 14, color: T.text }}>{label}</span>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? T.accent : T.border, cursor: "pointer", position: "relative", transition: "background 0.2s" }}>
        <div style={{ position: "absolute", top: 3, left: value ? 22 : 3, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left 0.2s" }} />
      </div>
    </div>
  );
}

const TABS = [
  { id: "today", icon: "🏠", label: "Главная" },
  { id: "debts", icon: "🤝", label: "Долги" },
  { id: "funds", icon: "💰", label: "Фонды" },
  { id: "stats", icon: "📊", label: "Статистика" },
  { id: "ai", icon: "🤖", label: "ИИ" },
  { id: "settings", icon: "⚙️", label: "Настройки" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [tab, setTab] = useState("today");
  const [months, setMonths] = useState({});
  const [funds, setFunds] = useState(DEFAULT_FUNDS);
  const [fixed, setFixed] = useState(DEFAULT_FIXED);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [debts, setDebts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const m = await sGet(KEYS.months); if (m) setMonths(m);
      const f = await sGet(KEYS.funds); if (f) setFunds(f);
      const fx = await sGet(KEYS.fixed); if (fx) setFixed(fx);
      const s = await sGet(KEYS.settings); if (s) setSettings(p => ({ ...p, ...s }));
      const d = await sGet(KEYS.debts); if (d) setDebts(d);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) sSet(KEYS.months, months); }, [months, loaded]);
  useEffect(() => { if (loaded) sSet(KEYS.funds, funds); }, [funds, loaded]);
  useEffect(() => { if (loaded) sSet(KEYS.fixed, fixed); }, [fixed, loaded]);
  useEffect(() => { if (loaded) sSet(KEYS.settings, settings); }, [settings, loaded]);
  useEffect(() => { if (loaded) sSet(KEYS.debts, debts); }, [debts, loaded]);

  const mk = monthKey();
  const entries = months[mk]?.entries || [];

  const totalFixed = fixed.reduce((a, f) => a + f.amount, 0);
  const plannedIncome = (settings.salary || 0) + (settings.parentRegular ? (settings.parentHelp || 0) : 0);
  const dailyLimit = settings.salary > 0 ? Math.round((settings.salary * ((settings.salaryLimitPct || 65) / 100)) / daysInMonth()) : 0;

  const totals = entries.reduce((acc, e) => ({
    salary: acc.salary + (e.salary || 0),
    parents: acc.parents + (e.parents || 0),
    other: acc.other + (e.other || 0),
    guaranteed: acc.guaranteed + (e.guaranteed || 0),
    planned: acc.planned + (e.planned || 0),
    unplanned: acc.unplanned + (e.unplanned || 0),
    transport: acc.transport + (e.transport || 0),
  }), { salary: 0, parents: 0, other: 0, guaranteed: 0, planned: 0, unplanned: 0, transport: 0 });

  const totalIncome = totals.salary + totals.parents + totals.other;
  const totalExpAll = totals.guaranteed + totals.planned + totals.unplanned + totals.transport;
  const balance = totalIncome - totalExpAll;
  const forecastBalance = plannedIncome - totalFixed - totals.planned - totals.unplanned - totals.transport;

  // Текущие средства = базовая сумма + все доходы за все месяцы − все расходы
  const allMonthTotals = Object.values(months).reduce((acc, m) => {
    const ents = m.entries || [];
    return {
      income: acc.income + ents.reduce((a, e) => a + (e.salary||0)+(e.parents||0)+(e.other||0), 0),
      expenses: acc.expenses + ents.reduce((a, e) => a + (e.guaranteed||0)+(e.planned||0)+(e.unplanned||0)+(e.transport||0), 0),
    };
  }, { income: 0, expenses: 0 });
  const currentFunds = (settings.baseAmount || 0) + allMonthTotals.income - allMonthTotals.expenses;

  const addEntry = useCallback((entry) => {
    setMonths(prev => {
      const m = prev[mk] || { entries: [] };
      return { ...prev, [mk]: { ...m, entries: [...m.entries, entry] } };
    });
    const inc = (entry.salary || 0) + (entry.parents || 0) + (entry.other || 0);
    if (inc > 0) setFunds(prev => prev.map(f => ({ ...f, current: f.current + Math.round(inc * (f.pct / 100)) })));
  }, [mk]);

  const updateEntry = useCallback((idx, entry) => {
    setMonths(prev => {
      const m = prev[mk] || { entries: [] };
      const arr = [...m.entries]; arr[idx] = entry;
      return { ...prev, [mk]: { ...m, entries: arr } };
    });
  }, [mk]);

  const deleteEntry = useCallback((idx) => {
    setMonths(prev => {
      const m = prev[mk] || { entries: [] };
      return { ...prev, [mk]: { ...m, entries: m.entries.filter((_, i) => i !== idx) } };
    });
  }, [mk]);

  if (!loaded) return <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: T.accent, fontSize: 32 }}>⏳</div>;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", maxWidth: 430, margin: "0 auto", fontFamily: "'SF Pro Display', -apple-system, sans-serif", color: T.text, paddingBottom: 80 }}>
      <div style={{ background: "linear-gradient(135deg,#0a0d14,#111827)", padding: "20px 20px 14px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: 1 }}>ФИНАШКА</div>
            <div style={{ fontSize: 20, fontWeight: 800 }}>{monthLabel(mk)}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: T.muted }}>Средства сейчас</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: currentFunds >= 0 ? T.accent : T.danger }}>{fmt(currentFunds)}</div>
            <div style={{ fontSize: 10, color: T.muted }}>месяц: <span style={{ color: balance >= 0 ? T.accent : T.danger }}>{balance >= 0 ? "+" : ""}{fmt(balance)}</span></div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        {tab === "today" && <TodayTab entries={entries} totals={totals} totalIncome={totalIncome} balance={balance} forecastBalance={forecastBalance} settings={settings} fixed={fixed} dailyLimit={dailyLimit} plannedIncome={plannedIncome} totalFixed={totalFixed} currentFunds={currentFunds} addEntry={addEntry} updateEntry={updateEntry} deleteEntry={deleteEntry} />}
        {tab === "debts" && <DebtsTab debts={debts} setDebts={setDebts} />}
        {tab === "funds" && <FundsTab funds={funds} setFunds={setFunds} />}
        {tab === "stats" && <StatsTab months={months} funds={funds} />}
        {tab === "ai" && <AITab months={months} funds={funds} fixed={fixed} settings={settings} totals={totals} totalIncome={totalIncome} balance={balance} dailyLimit={dailyLimit} plannedIncome={plannedIncome} debts={debts} currentFunds={currentFunds} setSettings={setSettings} />}
        {tab === "settings" && <SettingsTab fixed={fixed} setFixed={setFixed} settings={settings} setSettings={setSettings} dailyLimit={dailyLimit} />}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 430, background: "#0d1117", borderTop: `1px solid ${T.border}`, display: "flex", zIndex: 100 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, background: "none", border: "none", padding: "8px 2px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 18 }}>{t.icon}</span>
            <span style={{ fontSize: 9, color: tab === t.id ? T.accent : T.muted, fontWeight: tab === t.id ? 700 : 400 }}>{t.label}</span>
            {tab === t.id && <div style={{ width: 4, height: 4, borderRadius: 2, background: T.accent }} />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TODAY TAB
// ═══════════════════════════════════════════════════════════════════════════════
function TodayTab({ entries, totals, totalIncome, balance, forecastBalance, settings, fixed, dailyLimit, plannedIncome, totalFixed, currentFunds, addEntry, updateEntry, deleteEntry }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ date: todayStr(), salary: "", parents: "", other: "", guaranteed: "", planned: "", unplanned: "", transport: "", note: "" });

  const today = entries.filter(e => e.date === todayStr());
  const todayExp = today.reduce((a, e) => a + (e.guaranteed || 0) + (e.planned || 0) + (e.unplanned || 0) + (e.transport || 0), 0);
  const dailyOk = dailyLimit === 0 || todayExp <= dailyLimit;
  const day = new Date().getDate();
  const dueFix = fixed.filter(f => f.day === day);
  const dTotal = daysInMonth();
  const dPassed = new Date().getDate();
  const monthPct = Math.round((dPassed / dTotal) * 100);

  const openAdd = () => { setForm({ date: todayStr(), salary: "", parents: "", other: "", guaranteed: "", planned: "", unplanned: "", transport: "", note: "" }); setModal("add"); };
  const openEdit = (idx, e) => { setForm({ date: e.date, salary: e.salary || "", parents: e.parents || "", other: e.other || "", guaranteed: e.guaranteed || "", planned: e.planned || "", unplanned: e.unplanned || "", transport: e.transport || "", note: e.note || "" }); setModal({ idx, e }); };
  const save = () => {
    const e = { date: form.date, salary: +form.salary || 0, parents: +form.parents || 0, other: +form.other || 0, guaranteed: +form.guaranteed || 0, planned: +form.planned || 0, unplanned: +form.unplanned || 0, transport: +form.transport || 0, note: form.note, id: Date.now() };
    if (modal === "add") addEntry(e); else updateEntry(modal.idx, e);
    setModal(null);
  };

  return (
    <>
      {/* МЕСЯЧНЫЙ ОБЗОР */}
      <Card style={{ background: "linear-gradient(135deg,#0f2027,#1a3a2a)", border: `1px solid ${T.accent}33` }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: T.muted, letterSpacing: 0.5 }}>📅 ОБЗОР МЕСЯЦА</div>
          <div style={{ fontSize: 11, color: T.muted }}>{dPassed} из {dTotal} дней</div>
        </div>
        <div style={{ height: 5, background: T.border, borderRadius: 4, marginBottom: 14 }}>
          <div style={{ height: 5, borderRadius: 4, background: `linear-gradient(90deg,${T.accent},${T.gold})`, width: `${monthPct}%` }} />
        </div>

        {/* ПОСТУПЛЕНИЯ */}
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, letterSpacing: 0.5 }}>ПОСТУПЛЕНИЯ</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {[
            { label: "Зарплата", val: totals.salary, plan: settings.salary, icon: "💼", color: T.accent },
            { label: "Родители", val: totals.parents, plan: settings.parentRegular ? settings.parentHelp : null, icon: "👨‍👩‍👦", color: T.purple },
            { label: "Прочее", val: totals.other, plan: null, icon: "💸", color: T.info },
          ].map(r => (
            <div key={r.label} style={{ background: "#0a0f1a", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 15 }}>{r.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: r.color, marginTop: 2 }}>{fmt(r.val)}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{r.label}</div>
              {r.plan !== null && r.plan > 0 && (
                <div style={{ fontSize: 9, color: r.val >= r.plan ? T.accent : T.gold, marginTop: 1 }}>из {fmt(r.plan)}</div>
              )}
            </div>
          ))}
        </div>

        {/* РАСХОДЫ */}
        <div style={{ fontSize: 10, color: T.muted, marginBottom: 6, letterSpacing: 0.5 }}>РАСХОДЫ</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
          {[
            { label: "Гарантир.", val: totals.guaranteed, icon: "🏠", color: T.info },
            { label: "Плановые", val: totals.planned, icon: "📋", color: T.gold },
            { label: "Внеплан.", val: totals.unplanned, icon: "⚡", color: T.danger },
            { label: "Транспорт", val: totals.transport, icon: "🚗", color: "#a855f7" },
          ].map(r => (
            <div key={r.label} style={{ background: "#0a0f1a", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 15 }}>{r.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: r.color, marginTop: 2 }}>{fmt(r.val)}</div>
              <div style={{ fontSize: 9, color: T.muted }}>{r.label}</div>
            </div>
          ))}
        </div>

        {/* ТЕКУЩИЕ СРЕДСТВА */}
        <div style={{ background: "linear-gradient(135deg,#0f1e30,#0a1520)", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: plannedIncome > 0 ? 10 : 0 }}>
          <div>
            <div style={{ fontSize: 10, color: T.muted }}>💳 СРЕДСТВА СЕЙЧАС</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: currentFunds >= 0 ? T.accent : T.danger }}>{fmt(currentFunds)}</div>
          </div>
          <div style={{ fontSize: 28 }}>{currentFunds >= 0 ? "✅" : "❌"}</div>
        </div>

        {/* ПРОГНОЗ */}
        {plannedIncome > 0 && (
          <div style={{ background: "#0a0f1a", borderRadius: 12, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted }}>ПРОГНОЗ ОСТАТКА</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: forecastBalance >= 0 ? T.accent : T.danger }}>{fmt(forecastBalance)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: T.muted }}>Фикс. расходы</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.danger }}>−{fmt(totalFixed)}</div>
            </div>
          </div>
        )}
      </Card>

      {/* ДНЕВНОЙ ЛИМИТ */}
      {dailyLimit > 0 && (
        <Card style={{ border: `1px solid ${dailyOk ? T.accent + "44" : T.danger + "44"}`, padding: "12px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted }}>🎯 ЛИМИТ НА СЕГОДНЯ ({settings.salaryLimitPct || 65}% × зарплата ÷ {dTotal} дней)</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: dailyOk ? T.accent : T.danger }}>
                {fmt(todayExp)} <span style={{ fontSize: 13, color: T.muted, fontWeight: 400 }}>из {fmt(dailyLimit)}</span>
              </div>
            </div>
            <div style={{ fontSize: 26 }}>{dailyOk ? "✅" : "⚠️"}</div>
          </div>
          <div style={{ height: 8, background: T.border, borderRadius: 4 }}>
            <div style={{ height: 8, borderRadius: 4, background: dailyOk ? T.accent : T.danger, width: `${Math.min(100, dailyLimit > 0 ? (todayExp / dailyLimit) * 100 : 0)}%`, transition: "width 0.5s" }} />
          </div>
          <div style={{ fontSize: 11, color: dailyOk ? T.accent : T.danger, marginTop: 6 }}>
            {dailyOk ? `Остаток сегодня: ${fmt(dailyLimit - todayExp)}` : `Превышение: ${fmt(todayExp - dailyLimit)}`}
          </div>
        </Card>
      )}

      {/* ПЛАТЕЖИ СЕГОДНЯ */}
      {dueFix.length > 0 && (
        <Card style={{ border: `1px solid ${T.gold}44` }}>
          <div style={{ fontSize: 11, color: T.gold, marginBottom: 8 }}>⚠️ ОБЯЗАТЕЛЬНЫЕ ПЛАТЕЖИ СЕГОДНЯ</div>
          {dueFix.map(f => (
            <div key={f.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{f.icon} {f.name}</span>
              <span style={{ color: T.gold, fontWeight: 700 }}>{fmt(f.amount)}</span>
            </div>
          ))}
        </Card>
      )}

      <Btn label="+ Добавить запись" onClick={openAdd} full color={T.accent} icon="✏️" />

      {/* СПИСОК ЗАПИСЕЙ */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: 0.5 }}>ЗАПИСИ ЗА МЕСЯЦ</div>
        {entries.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "30px 0" }}>Записей пока нет</div>}
        {[...entries].reverse().map((e, ri) => {
          const idx = entries.length - 1 - ri;
          const inc = (e.salary || 0) + (e.parents || 0) + (e.other || 0);
          const exp = (e.guaranteed || 0) + (e.planned || 0) + (e.unplanned || 0) + (e.transport || 0);
          return (
            <Card key={e.id || idx} onClick={() => openEdit(idx, e)} style={{ padding: "12px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: T.muted }}>{e.date}</div>
                  {e.note && <div style={{ fontSize: 12, color: T.text, marginTop: 2 }}>{e.note}</div>}
                  <div style={{ marginTop: 6, display: "flex", gap: 5, flexWrap: "wrap" }}>
                    {e.salary > 0 && <Badge label={`💼 ${fmt(e.salary)}`} color={T.accent} />}
                    {e.parents > 0 && <Badge label={`👨‍👩‍👦 ${fmt(e.parents)}`} color={T.purple} />}
                    {e.other > 0 && <Badge label={`💸 ${fmt(e.other)}`} color={T.info} />}
                    {e.guaranteed > 0 && <Badge label={`🏠 ${fmt(e.guaranteed)}`} color={T.info} />}
                    {e.planned > 0 && <Badge label={`📋 ${fmt(e.planned)}`} color={T.gold} />}
                    {e.unplanned > 0 && <Badge label={`⚡ ${fmt(e.unplanned)}`} color={T.danger} />}
                    {e.transport > 0 && <Badge label={`🚗 ${fmt(e.transport)}`} color="#a855f7" />}
                  </div>
                </div>
                <div style={{ textAlign: "right", marginLeft: 8 }}>
                  {inc > 0 && <div style={{ color: T.accent, fontWeight: 800, fontSize: 14 }}>+{fmt(inc)}</div>}
                  {exp > 0 && <div style={{ color: T.danger, fontWeight: 700, fontSize: 13 }}>−{fmt(exp)}</div>}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* МОДАЛКА */}
      {modal && (
        <Modal title={modal === "add" ? "Новая запись" : "Редактировать запись"} onClose={() => setModal(null)}>
          <Inp label="Дата" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />

          <div style={{ fontSize: 11, color: T.accent, letterSpacing: 0.5, marginBottom: 8 }}>📥 ПОСТУПЛЕНИЯ</div>
          <Inp label="Зарплата" type="number" value={form.salary} onChange={v => setForm(p => ({ ...p, salary: v }))} placeholder="0" icon="💼" />
          <Inp label="Помощь родителей" type="number" value={form.parents} onChange={v => setForm(p => ({ ...p, parents: v }))} placeholder="0" icon="👨‍👩‍👦" />
          <Inp label="Прочий доход" type="number" value={form.other} onChange={v => setForm(p => ({ ...p, other: v }))} placeholder="0" icon="💸" />

          <div style={{ fontSize: 11, color: T.danger, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 }}>📤 РАСХОДЫ</div>
          <Inp label="Гарантированный расход" type="number" value={form.guaranteed} onChange={v => setForm(p => ({ ...p, guaranteed: v }))} placeholder="0" icon="🏠" />
          <Inp label="Предварительный расход" type="number" value={form.planned} onChange={v => setForm(p => ({ ...p, planned: v }))} placeholder="0" icon="📋" />
          <Inp label="Незапланированный расход" type="number" value={form.unplanned} onChange={v => setForm(p => ({ ...p, unplanned: v }))} placeholder="0" icon="⚡" />
          <Inp label="Транспорт" type="number" value={form.transport} onChange={v => setForm(p => ({ ...p, transport: v }))} placeholder="0" icon="🚗" />

          <Inp label="Заметка" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} placeholder="Описание..." icon="📝" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn label="Сохранить" onClick={save} color={T.accent} full />
            {modal !== "add" && <Btn label="🗑" onClick={() => { deleteEntry(modal.idx); setModal(null); }} color={T.danger} />}
          </div>
        </Modal>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBTS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function DebtsTab({ debts, setDebts }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", type: "owe_me", note: "", date: todayStr() });

  const oweMe = debts.filter(d => d.type === "owe_me" && !d.paid);
  const iOwe = debts.filter(d => d.type === "i_owe" && !d.paid);
  const paid = debts.filter(d => d.paid);
  const totalOweMe = oweMe.reduce((a, d) => a + d.amount, 0);
  const totalIOwe = iOwe.reduce((a, d) => a + d.amount, 0);

  const openNew = (type = "owe_me") => { setForm({ name: "", amount: "", type, note: "", date: todayStr() }); setModal("new"); };
  const save = () => {
    if (!form.name || !form.amount) return;
    const debt = { ...form, id: modal === "new" ? Date.now().toString() : modal, amount: +form.amount, paid: false };
    setDebts(prev => modal === "new" ? [...prev, debt] : prev.map(d => d.id === modal ? { ...d, ...debt, paid: d.paid } : d));
    setModal(null);
  };
  const markPaid = (id) => setDebts(prev => prev.map(d => d.id === id ? { ...d, paid: true } : d));
  const del = (id) => setDebts(prev => prev.filter(d => d.id !== id));
  const openEdit = (d) => { setForm({ name: d.name, amount: d.amount, type: d.type, note: d.note || "", date: d.date }); setModal(d.id); };

  const DebtItem = ({ d, color }) => (
    <Card style={{ padding: "12px 14px", marginBottom: 8, border: `1px solid ${color}33` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{d.name}</div>
          {d.note && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{d.note}</div>}
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>с {d.date}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color }}>{fmt(d.amount)}</div>
          <div style={{ display: "flex", gap: 5, marginTop: 6, justifyContent: "flex-end" }}>
            <Btn label="✓" onClick={() => markPaid(d.id)} color={T.accent} small />
            <Btn label="✏️" onClick={() => openEdit(d)} color={T.muted} small />
            <Btn label="🗑" onClick={() => del(d.id)} color={T.danger} small />
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        <Card style={{ marginBottom: 0, border: `1px solid ${T.accent}44`, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>💰</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>МНЕ ДОЛЖНЫ</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.accent }}>{fmt(totalOweMe)}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{oweMe.length} чел.</div>
        </Card>
        <Card style={{ marginBottom: 0, border: `1px solid ${T.danger}44`, textAlign: "center" }}>
          <div style={{ fontSize: 22 }}>😅</div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>Я ДОЛЖЕН</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: T.danger }}>{fmt(totalIOwe)}</div>
          <div style={{ fontSize: 11, color: T.muted }}>{iOwe.length} чел.</div>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        <Btn label="+ Мне должны" onClick={() => openNew("owe_me")} color={T.accent} full />
        <Btn label="+ Я должен" onClick={() => openNew("i_owe")} color={T.danger} full />
      </div>

      {oweMe.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.accent, marginBottom: 8, letterSpacing: 0.5 }}>💰 МНЕ ДОЛЖНЫ</div>
          {oweMe.map(d => <DebtItem key={d.id} d={d} color={T.accent} />)}
        </>
      )}

      {iOwe.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.danger, marginBottom: 8, letterSpacing: 0.5, marginTop: 8 }}>😅 Я ДОЛЖЕН</div>
          {iOwe.map(d => <DebtItem key={d.id} d={d} color={T.danger} />)}
        </>
      )}

      {paid.length > 0 && (
        <>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8, letterSpacing: 0.5, marginTop: 12 }}>✅ ЗАКРЫТЫЕ ({paid.length})</div>
          {paid.map(d => (
            <Card key={d.id} style={{ padding: "10px 14px", marginBottom: 6, opacity: 0.45 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>{d.type === "owe_me" ? "💰" : "😅"} {d.name}</span>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: T.muted, textDecoration: "line-through" }}>{fmt(d.amount)}</span>
                  <Btn label="🗑" onClick={() => del(d.id)} color={T.danger} small />
                </div>
              </div>
            </Card>
          ))}
        </>
      )}

      {debts.length === 0 && <div style={{ textAlign: "center", color: T.muted, padding: "40px 0" }}>Долгов нет 🎉</div>}

      {modal && (
        <Modal title={modal === "new" ? "Новый долг" : "Редактировать"} onClose={() => setModal(null)}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>ТИП</div>
            <div style={{ display: "flex", gap: 8 }}>
              {[{ id: "owe_me", label: "💰 Мне должны", color: T.accent }, { id: "i_owe", label: "😅 Я должен", color: T.danger }].map(opt => (
                <button key={opt.id} onClick={() => setForm(p => ({ ...p, type: opt.id }))} style={{ flex: 1, padding: 10, borderRadius: 10, border: `2px solid ${form.type === opt.id ? opt.color : T.border}`, background: form.type === opt.id ? opt.color + "22" : "#0f172a", color: T.text, cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <Inp label="Имя / кому" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Иван, Маша..." icon="👤" />
          <Inp label="Сумма (₽)" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} placeholder="5000" icon="💰" />
          <Inp label="Дата" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
          <Inp label="Заметка" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} placeholder="За что..." icon="📝" />
          <Btn label="Сохранить" onClick={save} color={T.accent} full />
        </Modal>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNDS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function FundsTab({ funds, setFunds }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", icon: "💰", target: "", current: "", pct: "", color: "#10b981" });
  const COLORS = ["#10b981","#3b82f6","#f59e0b","#ec4899","#8b5cf6","#ef4444","#06b6d4"];
  const totalInFunds = funds.reduce((a, f) => a + f.current, 0);

  const openNew = () => { setForm({ name: "", icon: "💰", target: "", current: "", pct: "", color: COLORS[funds.length % COLORS.length] }); setModal("new"); };
  const openEdit = (f) => { setForm({ ...f, target: f.target || "", current: f.current || "", pct: f.pct || "" }); setModal(f.id); };
  const save = () => {
    if (!form.name) return;
    const fund = { ...form, id: modal === "new" ? Date.now().toString() : modal, target: +form.target || 0, current: +form.current || 0, pct: +form.pct || 0 };
    setFunds(prev => modal === "new" ? [...prev, fund] : prev.map(f => f.id === modal ? fund : f));
    setModal(null);
  };

  return (
    <>
      <Card style={{ border: `1px solid ${T.gold}44` }}>
        <div style={{ fontSize: 11, color: T.muted }}>💼 ВСЕГО В ФОНДАХ</div>
        <div style={{ fontSize: 26, fontWeight: 800, color: T.gold }}>{fmt(totalInFunds)}</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 4 }}>{funds.length} активных фондов</div>
      </Card>

      {funds.map(f => {
        const pct = f.target > 0 ? Math.min(100, (f.current / f.target) * 100) : 0;
        return (
          <Card key={f.id} style={{ border: `1px solid ${f.color}33` }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 16, marginLeft: 6 }}>{f.name}</span>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{f.pct}% от каждого поступления</div>
              </div>
              <button onClick={() => openEdit(f)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}>✏️</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ color: f.color, fontWeight: 800, fontSize: 18 }}>{fmt(f.current)}</span>
              {f.target > 0 && <span style={{ color: T.muted, fontSize: 13 }}>из {fmt(f.target)}</span>}
            </div>
            {f.target > 0 && <>
              <div style={{ height: 8, background: T.border, borderRadius: 4, marginBottom: 4 }}>
                <div style={{ height: 8, borderRadius: 4, background: f.color, width: `${pct}%`, transition: "width 0.5s" }} />
              </div>
              <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>{pct.toFixed(1)}% достигнуто</div>
            </>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[500, 1000, 5000].map(a => <Btn key={a} label={`+${a}`} onClick={() => setFunds(prev => prev.map(x => x.id === f.id ? { ...x, current: x.current + a } : x))} color={f.color} small />)}
              <Btn label="🗑" onClick={() => setFunds(prev => prev.filter(x => x.id !== f.id))} color={T.danger} small />
            </div>
          </Card>
        );
      })}

      <Btn label="+ Создать фонд" onClick={openNew} full color={T.gold} icon="🎯" />

      {modal && (
        <Modal title={modal === "new" ? "Новый фонд" : "Редактировать фонд"} onClose={() => setModal(null)}>
          <Inp label="Название" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Отпуск, Машина..." icon="🏷️" />
          <Inp label="Иконка (эмодзи)" value={form.icon} onChange={v => setForm(p => ({ ...p, icon: v }))} placeholder="✈️" />
          <Inp label="Цель (₽)" type="number" value={form.target} onChange={v => setForm(p => ({ ...p, target: v }))} placeholder="150000" icon="🎯" />
          <Inp label="Накоплено (₽)" type="number" value={form.current} onChange={v => setForm(p => ({ ...p, current: v }))} placeholder="0" icon="💰" />
          <Inp label="% от каждого поступления" type="number" value={form.pct} onChange={v => setForm(p => ({ ...p, pct: v }))} placeholder="10" icon="📊" />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 6 }}>ЦВЕТ</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {COLORS.map(c => <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: 32, height: 32, borderRadius: 8, background: c, cursor: "pointer", border: form.color === c ? "2px solid white" : "2px solid transparent" }} />)}
            </div>
          </div>
          <Btn label="Сохранить" onClick={save} color={T.accent} full />
        </Modal>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function StatsTab({ months, funds }) {
  const monthKeys = Object.keys(months).sort();
  const chartData = monthKeys.map(mk => {
    const entries = months[mk]?.entries || [];
    const salary = entries.reduce((a, e) => a + (e.salary || 0), 0);
    const parents = entries.reduce((a, e) => a + (e.parents || 0), 0);
    const other = entries.reduce((a, e) => a + (e.other || 0), 0);
    const guaranteed = entries.reduce((a, e) => a + (e.guaranteed || 0), 0);
    const planned = entries.reduce((a, e) => a + (e.planned || 0), 0);
    const unplanned = entries.reduce((a, e) => a + (e.unplanned || 0), 0);
    const transport = entries.reduce((a, e) => a + (e.transport || 0), 0);
    const income = salary + parents + other;
    const expenses = guaranteed + planned + unplanned + transport;
    return { name: monthLabel(mk), income, salary, parents, other, guaranteed, planned, unplanned, transport, expenses, balance: income - expenses };
  });

  const fundsData = funds.map(f => ({ name: f.name, value: f.current, color: f.color, icon: f.icon })).filter(f => f.value > 0);
  const totalFunds = fundsData.reduce((a, f) => a + f.value, 0);

  if (chartData.length === 0) return <div style={{ textAlign: "center", color: T.muted, padding: "50px 0" }}>Данных пока нет</div>;

  return (
    <>
      <Card>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>📊 ДОХОДЫ vs РАСХОДЫ</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ left: -10, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} />
            <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={(v, n) => [fmt(v), n === "income" ? "Доход" : "Расходы"]} />
            <Bar dataKey="income" fill={T.accent} radius={[4,4,0,0]} name="Доход" />
            <Bar dataKey="expenses" fill={T.danger} radius={[4,4,0,0]} name="Расходы" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>💼 ИСТОЧНИКИ ДОХОДА (стек)</div>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={chartData} margin={{ left: -10, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} />
            <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={v => [fmt(v)]} />
            <Bar dataKey="salary" fill={T.accent} stackId="a" name="Зарплата" />
            <Bar dataKey="parents" fill={T.purple} stackId="a" name="Родители" />
            <Bar dataKey="other" fill={T.info} stackId="a" name="Прочее" />
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          {[{c:T.accent,l:"Зарплата"},{c:T.purple,l:"Родители"},{c:T.info,l:"Прочее"}].map(x => (
            <span key={x.l} style={{ fontSize: 11, color: T.muted }}><span style={{ color: x.c }}>●</span> {x.l}</span>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>🚗 ТРАНСПОРТ ПО МЕСЯЦАМ</div>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={chartData} margin={{ left: -10, right: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} />
            <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={v => [fmt(v), "Транспорт"]} />
            <Bar dataKey="transport" fill="#a855f7" radius={[4,4,0,0]} name="Транспорт" />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>📈 БАЛАНС ПО МЕСЯЦАМ</div>
        <ResponsiveContainer width="100%" height={150}>
          <AreaChart data={chartData} margin={{ left: -10, right: 5 }}>
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
            <XAxis dataKey="name" tick={{ fill: T.muted, fontSize: 10 }} />
            <YAxis tick={{ fill: T.muted, fontSize: 9 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}к` : v} />
            <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={v => [fmt(v), "Баланс"]} />
            <Area type="monotone" dataKey="balance" stroke={T.accent} fill="url(#bg)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {fundsData.length > 0 && (
        <Card>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 12 }}>💰 ФОНДЫ</div>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={fundsData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                {fundsData.map((f, i) => <Cell key={i} fill={f.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 8 }} formatter={v => [fmt(v)]} />
            </PieChart>
          </ResponsiveContainer>
          {fundsData.map(f => (
            <div key={f.name} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
              <span style={{ fontSize: 13 }}><span style={{ color: f.color }}>●</span> {f.icon} {f.name}</span>
              <span style={{ fontWeight: 700, color: f.color }}>{fmt(f.value)} ({totalFunds > 0 ? ((f.value/totalFunds)*100).toFixed(0) : 0}%)</span>
            </div>
          ))}
        </Card>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AI TAB
// ═══════════════════════════════════════════════════════════════════════════════
function AITab({ months, funds, fixed, settings, totals, totalIncome, balance, dailyLimit, plannedIncome, debts, setSettings }) {
  const [messages, setMessages] = useState(settings.aiHistory || []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, [messages]);

  const totalFixed = fixed.reduce((a, f) => a + f.amount, 0);
  const oweMe = debts.filter(d => d.type === "owe_me" && !d.paid).reduce((a, d) => a + d.amount, 0);
  const iOwe = debts.filter(d => d.type === "i_owe" && !d.paid).reduce((a, d) => a + d.amount, 0);

  const buildCtx = () => `Ты финансовый советник приложения "Финашка". Говоришь по-русски, кратко и конкретно. Даёшь практические советы с конкретными цифрами.

ДАННЫЕ ПОЛЬЗОВАТЕЛЯ:
Зарплата (план): ${settings.salary} ₽ | Помощь родителей: ${settings.parentHelp} ₽ (${settings.parentRegular ? "ежемесячно" : "разово"})
Плановый доход: ${plannedIncome} ₽ | Дневной лимит: ${dailyLimit} ₽ (${settings.salaryLimitPct || 65}% зарплаты ÷ ${daysInMonth()} дней)
Фикс. расходы: ${totalFixed} ₽/мес

ФАКТ ЭТОГО МЕСЯЦА:
Получено — зарплата: ${totals.salary} ₽, родители: ${totals.parents} ₽, прочее: ${totals.other} ₽
Потрачено — гарантир.: ${totals.guaranteed} ₽, плановые: ${totals.planned} ₽, внеплановые: ${totals.unplanned} ₽
Текущий баланс: ${balance} ₽

ДОЛГИ: мне должны ${oweMe} ₽, я должен ${iOwe} ₽

ФОНДЫ:
${funds.map(f => `${f.name}: ${f.current} ₽ / ${f.target} ₽ (отчисление ${f.pct}%)`).join("\n")}`;

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: buildCtx(), messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "Ошибка";
      const final = [...newMsgs, { role: "assistant", content: text }];
      setMessages(final);
      setSettings(p => ({ ...p, aiHistory: final.slice(-20) }));
    } catch { setMessages(p => [...p, { role: "assistant", content: "❌ Ошибка соединения." }]); }
    setLoading(false);
  };

  const quick = ["Оцени мой дневной лимит", "Как ускорить накопление на отпуск?", "Что сократить в расходах?", "Рассчитай % в фонды от зарплаты", "Как учитывать помощь родителей?", "Стоит ли брать долг?"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)" }}>
      {messages.length === 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>💡 БЫСТРЫЕ ВОПРОСЫ</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {quick.map(q => <button key={q} onClick={() => setInput(q)} style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accent}44`, borderRadius: 20, padding: "6px 12px", fontSize: 12, cursor: "pointer" }}>{q}</button>)}
          </div>
        </div>
      )}
      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", marginBottom: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: T.muted, padding: "30px 0" }}>
            <div style={{ fontSize: 40 }}>🤖</div>
            <div style={{ marginTop: 8, fontSize: 14 }}>Привет! Я знаю ваш бюджет.<br/>Задайте вопрос.</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{ maxWidth: "82%", padding: "10px 14px", borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: m.role === "user" ? T.accentDim : T.card, border: `1px solid ${m.role === "user" ? T.accent + "44" : T.border}`, fontSize: 14, lineHeight: 1.55 }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && <div style={{ display: "flex" }}><div style={{ padding: "10px 14px", borderRadius: "18px 18px 18px 4px", background: T.card, border: `1px solid ${T.border}`, color: T.muted, fontSize: 13 }}>✨ Думаю...</div></div>}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Спросите советника..."
          style={{ flex: 1, background: "#0f172a", border: `1px solid ${T.border}`, borderRadius: 12, color: T.text, padding: "12px 14px", fontSize: 14, outline: "none" }} />
        <button onClick={send} disabled={loading || !input.trim()} style={{ background: T.accent, border: "none", borderRadius: 12, padding: "0 16px", cursor: "pointer", fontSize: 18, opacity: loading ? 0.5 : 1 }}>➤</button>
      </div>
      {messages.length > 0 && <button onClick={() => setMessages([])} style={{ background: "none", border: "none", color: T.muted, fontSize: 11, cursor: "pointer", marginTop: 6 }}>Очистить чат</button>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SETTINGS TAB
// ═══════════════════════════════════════════════════════════════════════════════
function SettingsTab({ fixed, setFixed, settings, setSettings, dailyLimit }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: "", icon: "💳", amount: "", day: "" });
  const ICONS = ["🏠","📱","📺","🚗","💡","🌐","🏋️","📚","🎵","🛡️","💊","🍕"];
  const totalFixed = fixed.reduce((a, f) => a + f.amount, 0);

  const openNew = () => { setForm({ name: "", icon: "💳", amount: "", day: "" }); setModal("new"); };
  const openEdit = f => { setForm({ ...f, amount: f.amount || "", day: f.day || "" }); setModal(f.id); };
  const save = () => {
    if (!form.name || !form.amount) return;
    const item = { ...form, id: modal === "new" ? Date.now().toString() : modal, amount: +form.amount, day: +form.day || 1 };
    setFixed(prev => modal === "new" ? [...prev, item] : prev.map(f => f.id === modal ? item : f));
    setModal(null);
  };

  return (
    <>
      {/* ТЕКУЩИЕ СРЕДСТВА */}
      <Card style={{ border: `1px solid ${T.accent}66`, background: "linear-gradient(135deg,#0f2027,#0a1f1a)" }}>
        <div style={{ fontSize: 12, color: T.accent, marginBottom: 8, fontWeight: 700, letterSpacing: 0.5 }}>💳 ТЕКУЩИЕ СРЕДСТВА</div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 10 }}>Введите сумму на всех ваших счетах/наличных прямо сейчас. Приложение будет автоматически обновлять её с учётом доходов и расходов.</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            type="number"
            value={settings.baseAmount || ""}
            onChange={e => setSettings(p => ({ ...p, baseAmount: +e.target.value || 0 }))}
            placeholder="Введите текущую сумму..."
            style={{ flex: 1, background: "#0a0d14", border: `1px solid ${T.accent}`, borderRadius: 10, color: T.accent, padding: "12px 14px", fontSize: 20, fontWeight: 800, outline: "none" }}
          />
          <span style={{ color: T.muted, fontSize: 16, fontWeight: 700 }}>₽</span>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: T.muted }}>
          Базовая сумма: <span style={{ color: T.accent, fontWeight: 700 }}>{fmt(settings.baseAmount || 0)}</span>
        </div>
      </Card>

      {/* ДОХОДЫ */}
      <Card style={{ border: `1px solid ${T.accent}44` }}>
        <div style={{ fontSize: 12, color: T.accent, marginBottom: 12, fontWeight: 700, letterSpacing: 0.5 }}>💼 ДОХОДЫ ЭТОГО МЕСЯЦА</div>
        <Inp label="Зарплата (₽)" type="number" value={settings.salary || ""} onChange={v => setSettings(p => ({ ...p, salary: +v || 0 }))} placeholder="Введите зарплату..." icon="💼" />
        <Inp label="Помощь родителей (₽)" type="number" value={settings.parentHelp || ""} onChange={v => setSettings(p => ({ ...p, parentHelp: +v || 0 }))} placeholder="0" icon="👨‍👩‍👦" />
        <Toggle value={settings.parentRegular || false} onChange={v => setSettings(p => ({ ...p, parentRegular: v }))} label="Помощь родителей регулярная" />
        {settings.parentRegular && <div style={{ fontSize: 12, color: T.muted, marginTop: -6 }}>Учитывается в плановом доходе каждый месяц</div>}
      </Card>

      {/* ДНЕВНОЙ ЛИМИТ */}
      <Card style={{ border: `1px solid ${T.gold}44` }}>
        <div style={{ fontSize: 12, color: T.gold, marginBottom: 12, fontWeight: 700, letterSpacing: 0.5 }}>🎯 ДНЕВНОЙ ЛИМИТ</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input type="number" value={settings.salaryLimitPct || 65} onChange={e => setSettings(p => ({ ...p, salaryLimitPct: Math.min(100, Math.max(1, +e.target.value)) }))}
            style={{ width: 70, background: "#0f172a", border: `1px solid ${T.border}`, borderRadius: 10, color: T.gold, padding: "8px 10px", fontSize: 18, fontWeight: 800, outline: "none", textAlign: "center" }} />
          <span style={{ color: T.muted, fontSize: 15 }}>% от зарплаты</span>
        </div>
        {settings.salary > 0 ? (
          <div style={{ background: "#0a0f1a", borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 6 }}>РАСЧЁТ</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: T.muted, fontSize: 13 }}>Зарплата × {settings.salaryLimitPct || 65}%</span>
              <span style={{ color: T.text, fontSize: 13 }}>{fmt(settings.salary * ((settings.salaryLimitPct || 65) / 100))}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ color: T.muted, fontSize: 13 }}>÷ {daysInMonth()} дней</span>
              <span style={{ color: T.gold, fontSize: 16, fontWeight: 800 }}>{fmt(dailyLimit)} / день</span>
            </div>
            <div style={{ height: 4, background: T.border, borderRadius: 2 }}>
              <div style={{ height: 4, borderRadius: 2, background: T.gold, width: `${settings.salaryLimitPct || 65}%` }} />
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: T.muted }}>⚠️ Введите зарплату выше для расчёта</div>
        )}
      </Card>

      {/* ФИКСИРОВАННЫЕ РАСХОДЫ */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 700, letterSpacing: 0.5 }}>📌 ФИКСИРОВАННЫЕ РАСХОДЫ</div>
          <span style={{ fontSize: 13, color: T.danger, fontWeight: 700 }}>{fmt(totalFixed)}/мес</span>
        </div>
        {fixed.map(f => (
          <Card key={f.id} style={{ padding: "12px 14px", marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <span style={{ fontWeight: 600, marginLeft: 8 }}>{f.name}</span>
                <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Каждый {f.day}-й день</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: T.danger, fontWeight: 700 }}>{fmt(f.amount)}</span>
                <button onClick={() => openEdit(f)} style={{ background: "none", border: "none", color: T.muted, cursor: "pointer" }}>✏️</button>
                <button onClick={() => setFixed(prev => prev.filter(x => x.id !== f.id))} style={{ background: "none", border: "none", color: T.danger, cursor: "pointer" }}>🗑</button>
              </div>
            </div>
          </Card>
        ))}
        <Btn label="+ Добавить расход" onClick={openNew} full color={T.info} icon="📌" />
      </div>

      {modal && (
        <Modal title={modal === "new" ? "Новый фикс. расход" : "Редактировать"} onClose={() => setModal(null)}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {ICONS.map(ic => <button key={ic} onClick={() => setForm(p => ({ ...p, icon: ic }))} style={{ fontSize: 22, background: form.icon === ic ? T.accentDim : "none", border: form.icon === ic ? `1px solid ${T.accent}` : "1px solid transparent", borderRadius: 8, padding: 4, cursor: "pointer" }}>{ic}</button>)}
          </div>
          <Inp label="Название" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Квартплата..." />
          <Inp label="Сумма (₽)" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} placeholder="5000" icon="💳" />
          <Inp label="День месяца (1–31)" type="number" value={form.day} onChange={v => setForm(p => ({ ...p, day: v }))} placeholder="20" icon="📅" />
          <Btn label="Сохранить" onClick={save} color={T.accent} full />
        </Modal>
      )}
    </>
  );
}
