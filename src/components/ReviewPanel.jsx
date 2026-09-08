import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BookOpen, Calculator, Users, Building2 } from 'lucide-react';

const CATEGORY = [
  { key: 'udayman', label: 'Udayman', short: 'U', color: '#f0473f', light: '#ffe1df' },
  { key: 'pragatishil', label: 'Pragatishil', short: 'P', color: '#f9a007', light: '#fff3c4' },
  { key: 'nipun', label: 'Nipun', short: 'N', color: '#22b566', light: '#d5f9e2' },
];

const THEMES = {
  school: {
    border: 'border-sky-300',
    ring: 'ring-sky-100',
    header: 'bg-gradient-to-r from-sky-600 to-sky-500',
    headerText: 'text-white',
    subheader: 'text-sky-100',
    kpiBg: 'bg-sky-50 border-sky-100',
    gujarati: {
      border: 'border-orange-300',
      header: 'bg-gradient-to-r from-orange-500 to-amber-500',
      body: 'bg-gradient-to-b from-orange-50 to-white',
      label: 'ગુજરાતી · Gujarati',
    },
    maths: {
      border: 'border-indigo-300',
      header: 'bg-gradient-to-r from-indigo-600 to-violet-500',
      body: 'bg-gradient-to-b from-indigo-50 to-white',
      label: 'ગણિત · Maths',
    },
  },
  verifier: {
    border: 'border-violet-300',
    ring: 'ring-violet-100',
    header: 'bg-gradient-to-r from-violet-700 to-purple-600',
    headerText: 'text-white',
    subheader: 'text-violet-100',
    kpiBg: 'bg-violet-50 border-violet-100',
    gujarati: {
      border: 'border-orange-300',
      header: 'bg-gradient-to-r from-orange-500 to-amber-500',
      body: 'bg-gradient-to-b from-orange-50 to-white',
      label: 'ગુજરાતી · Gujarati',
    },
    maths: {
      border: 'border-indigo-300',
      header: 'bg-gradient-to-r from-indigo-600 to-violet-500',
      body: 'bg-gradient-to-b from-indigo-50 to-white',
      label: 'ગણિત · Maths',
    },
  },
};

function CategoryPill({ cat, pct, count }) {
  return (
    <div
      className="rounded-xl p-3 text-center shadow-sm border border-white/60"
      style={{ backgroundColor: cat.light }}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cat.color }}>
        {cat.label}
      </p>
      <p className="font-heading text-2xl font-bold mt-0.5" style={{ color: cat.color }}>
        {pct}%
      </p>
      <p className="text-[10px] text-sky-900/45 mt-0.5">{count.toLocaleString()} reviews</p>
    </div>
  );
}

function StackedBar({ subjectStats }) {
  const total = CATEGORY.reduce((s, c) => s + subjectStats[`${c.key}Pct`], 0) || 1;
  return (
    <div className="mt-3">
      <div className="flex h-3 rounded-full overflow-hidden shadow-inner bg-sky-100">
        {CATEGORY.map((c) => {
          const w = (subjectStats[`${c.key}Pct`] / total) * 100;
          if (w <= 0) return null;
          return (
            <div
              key={c.key}
              style={{ width: `${w}%`, backgroundColor: c.color }}
              title={`${c.label}: ${subjectStats[`${c.key}Pct`]}%`}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-1.5">
        {CATEGORY.map((c) => (
          <span key={c.key} className="text-[9px] font-semibold" style={{ color: c.color }}>
            {c.short} {subjectStats[`${c.key}Pct`]}%
          </span>
        ))}
      </div>
    </div>
  );
}

function SubjectPanel({ theme, icon: Icon, label, subjectStats, studentsReviewed }) {
  return (
    <div className={`rounded-xl border-2 ${theme.border} overflow-hidden shadow-sm flex flex-col h-full`}>
      <div className={`px-4 py-3 ${theme.header} text-white flex items-center gap-3`}>
        <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5" strokeWidth={2.25} />
        </div>
        <div className="min-w-0">
          <p className="font-heading font-bold text-sm leading-tight truncate">{label}</p>
          <p className="text-[10px] text-white/80 mt-0.5">
            Based on {studentsReviewed.toLocaleString()} reviewed students
          </p>
        </div>
      </div>

      <div className={`p-4 flex-1 ${theme.body}`}>
        <div className="space-y-3">
          {CATEGORY.map((c) => (
            <div key={c.key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: c.color }}>
                  {c.label}
                </span>
                <span className="text-xs font-bold text-sky-900">
                  {subjectStats[`${c.key}Pct`]}%
                  <span className="font-normal text-sky-600/60 ml-1">
                    ({subjectStats[c.key].toLocaleString()})
                  </span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-white/80 border border-sky-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(subjectStats[`${c.key}Pct`], 100)}%`,
                    backgroundColor: c.color,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
        <StackedBar subjectStats={subjectStats} />
      </div>
    </div>
  );
}

export default function ReviewPanel({ variant, title, subtitle, icon: HeaderIcon, stats }) {
  const theme = THEMES[variant];
  const chartData = CATEGORY.map((c) => ({
    name: c.label,
    pct: stats.combined[`${c.key}Pct`],
    fill: c.color,
  }));

  return (
    <article className={`rounded-2xl border-2 ${theme.border} bg-white shadow-md ring-4 ${theme.ring} overflow-hidden`}>
      {/* Header */}
      <div className={`${theme.header} px-5 py-4`}>
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <HeaderIcon className={`w-6 h-6 ${theme.headerText}`} />
          </div>
          <div>
            <h2 className={`font-heading text-lg font-bold ${theme.headerText}`}>{title}</h2>
            <p className={`text-xs mt-0.5 ${theme.subheader}`}>{subtitle}</p>
          </div>
        </div>

      </div>

      <div className="p-5 space-y-5">
        {/* Combined overview */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Combined (Gujarati + Maths)
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORY.map((c) => (
              <CategoryPill
                key={c.key}
                cat={c}
                pct={stats.combined[`${c.key}Pct`]}
                count={stats.combined[c.key]}
              />
            ))}
          </div>
        </section>

        {/* Subject-wise — prominent */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800">
              Subject-wise breakdown
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SubjectPanel
              theme={theme.gujarati}
              icon={BookOpen}
              label={theme.gujarati.label}
              subjectStats={stats.gujarati}
              studentsReviewed={stats.studentsReviewed}
            />
            <SubjectPanel
              theme={theme.maths}
              icon={Calculator}
              label={theme.maths.label}
              subjectStats={stats.maths}
              studentsReviewed={stats.studentsReviewed}
            />
          </div>
        </section>

        {/* Mini chart */}
        <section className={`rounded-xl border ${theme.kpiBg} p-4`}>
          <p className="text-[11px] font-semibold text-sky-700/70 mb-3 uppercase tracking-wide">
            Combined category distribution
          </p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#125a8c' }} />
                <YAxis tick={{ fontSize: 10, fill: '#125a8c' }} unit="%" domain={[0, 100]} />
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Share']}
                  contentStyle={{ borderRadius: 10, border: '1px solid #b8e6ff', fontSize: 11 }}
                />
                <Bar dataKey="pct" radius={[6, 6, 0, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </article>
  );
}
