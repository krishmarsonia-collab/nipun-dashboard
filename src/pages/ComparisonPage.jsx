import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { School, ShieldCheck, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import ReviewPanel from '../components/ReviewPanel';
import ClusterComparisonList from '../components/ClusterComparisonList';
import { CATEGORY, pct } from '../utils';

function DeltaBadge({ schoolPct, verifierPct }) {
  const delta = Math.round((verifierPct - schoolPct) * 10) / 10;
  if (Math.abs(delta) < 0.5) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-600 bg-sky-100 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" /> ~same
      </span>
    );
  }
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? 'text-leaf-600 bg-good-light' : 'text-bad bg-bad-light';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}{delta}pp vs schools
    </span>
  );
}

function ComparisonChart({ schoolStats, verifierStats }) {
  const data = CATEGORY.map((c) => ({
    name: c.label,
    Schools: schoolStats.combined[`${c.key}Pct`],
    Verifiers: verifierStats.combined[`${c.key}Pct`],
  }));

  return (
    <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
      <h2 className="font-heading text-lg font-bold text-sky-900 mb-1">Side-by-side comparison</h2>
      <p className="text-xs text-sky-700/60 mb-4">
        Percentage share of all subject reviews (Gujarati + Maths) in selected scope
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0f0fa" />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#125a8c' }} />
            <YAxis tick={{ fontSize: 11, fill: '#125a8c' }} unit="%" domain={[0, 100]} />
            <Tooltip
              formatter={(v) => [`${v}%`, '']}
              contentStyle={{ borderRadius: 12, border: '1px solid #b8e6ff', fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Schools" fill="#1084d1" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Verifiers" fill="#7c3aed" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function InsightPanel({ schoolStats, verifierStats, scope, filters }) {
  const nipunDelta = verifierStats.combined.nipunPct - schoolStats.combined.nipunPct;
  const reviewedShare = pct(verifierStats.studentsReviewed, schoolStats.studentsReviewed);

  let insight = '';
  if (!filters.districtId) {
    insight = `State-wide view: comparing all ${schoolStats.rowCount.toLocaleString()} schools (teacher reviews) with ${verifierStats.rowCount.toLocaleString()} verifier cluster samples (1 school per cluster, up to ~60 students each).`;
  } else if (filters.schoolId) {
    insight = `Single school view: teacher data for the selected school vs the verifier sample assigned to verify one school in this cluster.`;
  } else if (filters.clusterId) {
    insight = `Cluster view: teacher data across ${schoolStats.rowCount} schools in this cluster vs 1 verifier sample school.`;
  } else {
    insight = `${scope} view: aggregated teacher review data across ${schoolStats.rowCount} schools compared with ${verifierStats.rowCount} verifier samples in the same area.`;
  }

  if (nipunDelta > 2) {
    insight += ` Verifier sample shows ${nipunDelta.toFixed(1)}pp higher Nipun than the school average in this scope.`;
  } else if (nipunDelta < -2) {
    insight += ` Verifier sample shows ${Math.abs(nipunDelta).toFixed(1)}pp lower Nipun than the school average in this scope.`;
  }

  return (
    <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-sky-50 p-5">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-bold text-sky-900">Insight</h3>
          <p className="text-sm text-sky-800/80 mt-1 leading-relaxed">{insight}</p>
          <div className="flex flex-wrap gap-4 mt-3 text-xs font-medium">
            <span className="bg-white/80 px-3 py-1.5 rounded-lg border border-sky-100">
              Verifier sample = {reviewedShare}% of school reviewed students in scope
            </span>
            {CATEGORY.map((c) => (
              <span key={c.key} className="bg-white/80 px-3 py-1.5 rounded-lg border border-sky-100 inline-flex items-center gap-2">
                {c.label}
                <DeltaBadge
                  schoolPct={schoolStats.combined[`${c.key}Pct`]}
                  verifierPct={verifierStats.combined[`${c.key}Pct`]}
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonPage({ schoolStats, verifierStats, scope, filters, clusterComparisons }) {
  return (
    <div className="space-y-6">
      <InsightPanel
        schoolStats={schoolStats}
        verifierStats={verifierStats}
        scope={scope}
        filters={filters}
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReviewPanel
          variant="school"
          title="Schools (Teacher reviews)"
          subtitle="Full population — all teacher-reviewed students in selected scope"
          icon={School}
          stats={schoolStats}
        />
        <ReviewPanel
          variant="verifier"
          title="Verifiers (Sample)"
          subtitle="External verifier sample — 1 school per cluster, ~60 students max"
          icon={ShieldCheck}
          stats={verifierStats}
        />
      </div>

      <ComparisonChart schoolStats={schoolStats} verifierStats={verifierStats} />

      <ClusterComparisonList rows={clusterComparisons} />
    </div>
  );
}
