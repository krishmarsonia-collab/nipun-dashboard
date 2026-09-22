import { useMemo, useState } from 'react';
import { Search, Download, SlidersHorizontal, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { exportClusterComparisonExcel } from '../exportExcel';

const CATEGORY = [
  { key: 'udayman', label: 'Udayman', color: '#f0473f' },
  { key: 'pragatishil', label: 'Pragatishil', color: '#f9a007' },
  { key: 'nipun', label: 'Nipun', color: '#22b566' },
];

const SECTIONS = [
  { key: 'verifier', label: 'Verifier' },
  { key: 'schools', label: 'Schools' },
  { key: 'diff', label: 'Difference' },
];

const FILTER_COLUMNS = SECTIONS.flatMap((section) =>
  CATEGORY.map((c) => ({
    id: `${section.key}_${c.key}`,
    section: section.key,
    categoryKey: c.key,
    label: `${section.label} · ${c.label}`,
  })),
);

const EMPTY_FILTERS = FILTER_COLUMNS.reduce((acc, col) => {
  acc[col.id] = { min: '', max: '' };
  return acc;
}, {});

const EMPTY_DATA_FILTERS = { verifier: 'any', schools: 'any', diff: 'any' };

function statPct(stats, categoryKey) {
  if (!stats || stats.studentsReviewed === 0) return null;
  return stats.combined[`${categoryKey}Pct`];
}

function getCellValue(row, section, categoryKey) {
  if (section === 'verifier') return statPct(row.verifierStats, categoryKey);
  if (section === 'schools') return statPct(row.schoolStats, categoryKey);
  const schoolPct = statPct(row.schoolStats, categoryKey);
  const verifierPct = statPct(row.verifierStats, categoryKey);
  if (schoolPct == null || verifierPct == null) return null;
  return Math.round((schoolPct - verifierPct) * 10) / 10;
}

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

function DiffCell({ schoolStats, verifierStats, categoryKey }) {
  const schoolPct = statPct(schoolStats, categoryKey);
  const verifierPct = statPct(verifierStats, categoryKey);
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

function SortIcon({ active, direction }) {
  if (!active) {
    return <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity" />;
  }
  return direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
}

export default function ClusterComparisonList({ rows }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState(EMPTY_FILTERS);
  const [sortConfig, setSortConfig] = useState({ id: null, direction: 'desc' });
  const [dataFilters, setDataFilters] = useState(EMPTY_DATA_FILTERS);
  const pageSize = 50;

  const toggleSort = (id) => {
    setSortConfig((prev) => {
      if (prev.id === id) {
        return { id, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { id, direction: id === 'cluster' ? 'asc' : 'desc' };
    });
    setPage(0);
  };

  const activeFilterCount = useMemo(
    () => Object.values(columnFilters).filter((f) => f.min !== '' || f.max !== '').length
      + Object.values(dataFilters).filter((v) => v !== 'any').length,
    [columnFilters, dataFilters],
  );

  const updateFilter = (id, field, value) => {
    setColumnFilters((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setPage(0);
  };

  const clearFilters = () => {
    setColumnFilters(EMPTY_FILTERS);
    setDataFilters(EMPTY_DATA_FILTERS);
    setPage(0);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;

    if (q) {
      result = result.filter(
        (r) =>
          r.clusterName.toLowerCase().includes(q)
          || r.clusterId.includes(q)
          || r.districtName.toLowerCase().includes(q)
          || r.blockName.toLowerCase().includes(q),
      );
    }

    const dataSections = SECTIONS.filter((sec) => dataFilters[sec.key] !== 'any');
    if (dataSections.length) {
      result = result.filter((row) =>
        dataSections.every((sec) => {
          const hasData = getCellValue(row, sec.key, CATEGORY[0].key) != null;
          return dataFilters[sec.key] === 'has' ? hasData : !hasData;
        }),
      );
    }

    const activeCols = FILTER_COLUMNS.filter((col) => {
      const f = columnFilters[col.id];
      return f && (f.min !== '' || f.max !== '');
    });

    if (activeCols.length) {
      result = result.filter((row) =>
        activeCols.every((col) => {
          const { min, max } = columnFilters[col.id];
          const value = getCellValue(row, col.section, col.categoryKey);
          if (value == null) return false;
          if (min !== '' && value < Number(min)) return false;
          if (max !== '' && value > Number(max)) return false;
          return true;
        }),
      );
    }

    return result;
  }, [rows, search, columnFilters, dataFilters]);

  const sorted = useMemo(() => {
    if (!sortConfig.id) return filtered;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortConfig.id === 'cluster') {
        return a.clusterName.localeCompare(b.clusterName) * dir;
      }
      const col = FILTER_COLUMNS.find((c) => c.id === sortConfig.id);
      const va = getCellValue(a, col.section, col.categoryKey);
      const vb = getCellValue(b, col.section, col.categoryKey);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return (va - vb) * dir;
    });
    return arr;
  }, [filtered, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

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
        <div className="flex items-center gap-2 w-full sm:w-auto">
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
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold ${
              showFilters || activeFilterCount
                ? 'border-sky-400 bg-sky-50 text-sky-800'
                : 'border-sky-200 bg-white text-sky-700 hover:bg-sky-50'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center justify-center rounded-full bg-sky-600 text-white text-xs w-5 h-5">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => exportClusterComparisonExcel(filtered)}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="px-5 py-4 border-b border-sky-100 bg-sky-50/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
              Filter by value (min / max, in %)
            </p>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sky-600 hover:text-sky-800"
              >
                <X className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SECTIONS.map((section) => (
              <div key={section.key} className="rounded-xl border border-sky-200 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-sky-800">{section.label}</p>
                  <select
                    value={dataFilters[section.key]}
                    onChange={(e) => {
                      setDataFilters((prev) => ({ ...prev, [section.key]: e.target.value }));
                      setPage(0);
                    }}
                    className="px-2 py-1 rounded-lg border border-sky-200 text-xs text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
                  >
                    <option value="any">All rows</option>
                    <option value="has">Has data</option>
                    <option value="none">No data (—)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  {CATEGORY.map((c) => {
                    const id = `${section.key}_${c.key}`;
                    const f = columnFilters[id];
                    return (
                      <div key={id} className="flex items-center gap-2">
                        <span
                          className="text-xs font-semibold w-20 shrink-0 truncate"
                          style={{ color: c.color }}
                        >
                          {c.label}
                        </span>
                        <input
                          type="number"
                          placeholder="Min"
                          value={f.min}
                          onChange={(e) => updateFilter(id, 'min', e.target.value)}
                          className="w-full min-w-0 px-2 py-1 rounded-lg border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                        <span className="text-sky-300 text-xs">–</span>
                        <input
                          type="number"
                          placeholder="Max"
                          value={f.max}
                          onChange={(e) => updateFilter(id, 'max', e.target.value)}
                          className="w-full min-w-0 px-2 py-1 rounded-lg border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead>
            <tr className="bg-sky-50 border-b border-sky-100">
              <th
                rowSpan={2}
                onClick={() => toggleSort('cluster')}
                className="group text-left py-4 px-4 text-sm font-bold text-sky-800 sticky left-0 bg-sky-50 z-10 min-w-[200px] cursor-pointer select-none hover:bg-sky-100"
              >
                <span className="inline-flex items-center gap-1.5">
                  Cluster
                  <SortIcon active={sortConfig.id === 'cluster'} direction={sortConfig.direction} />
                </span>
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
                  onClick={() => toggleSort(`verifier_${c.key}`)}
                  className="group py-2.5 px-2 font-semibold border-l border-sky-100 text-center cursor-pointer select-none hover:bg-sky-100"
                  style={{ color: c.color }}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {c.label}
                    <SortIcon active={sortConfig.id === `verifier_${c.key}`} direction={sortConfig.direction} />
                  </span>
                </th>
              ))}
              {CATEGORY.map((c) => (
                <th
                  key={`s-${c.key}`}
                  onClick={() => toggleSort(`schools_${c.key}`)}
                  className="group py-2.5 px-2 font-semibold border-l border-sky-100 text-center cursor-pointer select-none hover:bg-sky-100"
                  style={{ color: c.color }}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {c.label}
                    <SortIcon active={sortConfig.id === `schools_${c.key}`} direction={sortConfig.direction} />
                  </span>
                </th>
              ))}
              {CATEGORY.map((c) => (
                <th
                  key={`d-${c.key}`}
                  onClick={() => toggleSort(`diff_${c.key}`)}
                  className="group py-2.5 px-2 font-semibold border-l border-sky-100 text-center text-emerald-700 cursor-pointer select-none hover:bg-sky-100"
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {c.label}
                    <SortIcon active={sortConfig.id === `diff_${c.key}`} direction={sortConfig.direction} />
                  </span>
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
                      schoolStats={row.schoolStats}
                      verifierStats={row.verifierStats}
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
          Difference = School − Verifier · Green = schools ahead · Showing{' '}
          <strong className="text-sky-800">
            {sorted.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}
          </strong>{' '}
          of <strong className="text-sky-800">{sorted.length.toLocaleString()}</strong> clusters · Page {page + 1} of {totalPages}
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
