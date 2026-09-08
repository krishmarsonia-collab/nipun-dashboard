import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';

const CATEGORY = [
  { key: 'udayman', label: 'Udayman', color: '#f0473f' },
  { key: 'pragatishil', label: 'Pragatishil', color: '#f9a007' },
  { key: 'nipun', label: 'Nipun', color: '#22b566' },
];

function isSchoolFavorable(categoryKey, diff) {
  if (Math.abs(diff) < 0.5) return false;
  if (categoryKey === 'nipun') return diff > 0;
  return diff < 0;
}

function isSchoolUnfavorable(categoryKey, diff) {
  if (Math.abs(diff) < 0.5) return false;
  if (categoryKey === 'nipun') return diff < 0;
  return diff > 0;
}

function PctCell({ stats, categoryKey }) {
  if (!stats || stats.studentsReviewed === 0) {
    return <span className="text-sky-300">—</span>;
  }
  const cat = CATEGORY.find((c) => c.key === categoryKey);
  const pctVal = stats.combined[`${categoryKey}Pct`];
  const count = stats.combined[categoryKey];
  return (
    <div className="leading-tight">
      <span className="font-heading font-bold text-base" style={{ color: cat.color }}>
        {pctVal}%
      </span>
      <p className="text-xs text-sky-600/55 mt-1">{count.toLocaleString()}</p>
    </div>
  );
}

function DiffCell({ schoolPct, verifierPct, categoryKey }) {
  if (verifierPct == null || schoolPct == null) {
    return <span className="text-sky-300">—</span>;
  }
  const diff = Math.round((schoolPct - verifierPct) * 10) / 10;
  const favorable = isSchoolFavorable(categoryKey, diff);
  const unfavorable = isSchoolUnfavorable(categoryKey, diff);

  let cls = 'text-sky-700';
  if (favorable) cls = 'bg-emerald-100 text-emerald-800 font-bold';
  if (unfavorable) cls = 'bg-red-50 text-red-700';

  return (
    <span className={`inline-block rounded-md px-2.5 py-1.5 text-sm font-semibold ${cls}`}>
      {diff > 0 ? '+' : ''}{diff}pp
    </span>
  );
}

export default function ClusterComparisonList({ rows }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.clusterName.toLowerCase().includes(q)
        || r.clusterId.includes(q)
        || r.districtName.toLowerCase().includes(q)
        || r.blockName.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-sky-200 bg-white p-8 text-center text-sm text-sky-600">
        No clusters match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-sky-900">Cluster comparison</h2>
          <p className="text-xs text-sky-700/60 mt-0.5">
            Verifier sample vs schools in cluster · {filtered.length.toLocaleString()} clusters
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
          <input
            type="text"
            placeholder="Search cluster…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-sky-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-sky-50 border-b border-sky-100">
              <th rowSpan={2} className="text-left py-4 px-4 text-sm font-bold text-sky-800 sticky left-0 bg-sky-50 z-10 min-w-[200px]">
                Cluster
              </th>
              <th colSpan={3} className="py-3 px-2 text-sm font-bold text-violet-700 border-l border-sky-100 text-center">
                Verifier
              </th>
              <th colSpan={3} className="py-3 px-2 text-sm font-bold text-sky-700 border-l border-sky-100 text-center">
                Schools
              </th>
              <th colSpan={3} className="py-3 px-2 text-sm font-bold text-emerald-700 border-l border-sky-100 text-center">
                Difference
              </th>
            </tr>
            <tr className="bg-sky-50/80 border-b border-sky-100 text-xs uppercase tracking-wide">
              {CATEGORY.map((c) => (
                <th
                  key={`v-${c.key}`}
                  className="py-2.5 px-2 font-semibold border-l border-sky-100 text-center"
                  style={{ color: c.color }}
                >
                  {c.label}
                </th>
              ))}
              {CATEGORY.map((c) => (
                <th
                  key={`s-${c.key}`}
                  className="py-2.5 px-2 font-semibold border-l border-sky-100 text-center"
                  style={{ color: c.color }}
                >
                  {c.label}
                </th>
              ))}
              {CATEGORY.map((c) => (
                <th
                  key={`d-${c.key}`}
                  className="py-2.5 px-2 font-semibold border-l border-sky-100 text-center text-emerald-700"
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.clusterId} className="border-b border-sky-50 hover:bg-sky-50/40">
                <td className="py-4 px-4 sticky left-0 bg-white hover:bg-sky-50/40 z-10">
                  <p className="font-semibold text-sm text-sky-900">{row.clusterName}</p>
                  <p className="text-xs text-sky-500 mt-1">
                    {row.districtName}{row.blockName ? ` · ${row.blockName}` : ''}
                  </p>
                </td>

                {CATEGORY.map((c) => (
                  <td key={`v-${row.clusterId}-${c.key}`} className="py-4 px-3 text-center border-l border-sky-50">
                    <PctCell stats={row.verifierStats} categoryKey={c.key} />
                  </td>
                ))}

                {CATEGORY.map((c) => (
                  <td key={`s-${row.clusterId}-${c.key}`} className="py-4 px-3 text-center border-l border-sky-50">
                    <PctCell stats={row.schoolStats} categoryKey={c.key} />
                  </td>
                ))}

                {CATEGORY.map((c) => (
                  <td key={`d-${row.clusterId}-${c.key}`} className="py-4 px-3 text-center border-l border-sky-50">
                    <DiffCell
                      categoryKey={c.key}
                      schoolPct={row.schoolStats?.combined?.[`${c.key}Pct`]}
                      verifierPct={row.verifierStats?.combined?.[`${c.key}Pct`]}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-sm text-sky-600">
        <span>
          Difference = School − Verifier · Green = schools ahead · Page {page + 1} of {totalPages}
        </span>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-sky-200 disabled:opacity-40 hover:bg-sky-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-sky-200 disabled:opacity-40 hover:bg-sky-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
