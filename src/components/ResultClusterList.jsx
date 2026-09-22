import { useMemo, useState } from 'react';
import { Search, Download, SlidersHorizontal, X } from 'lucide-react';
import { exportClusterResultExcel } from '../exportResultExcel';
import { CATEGORY } from '../utils';
import SortIcon from './SortIcon';

const FILTER_COLUMNS = [
  ...CATEGORY.map((c) => ({ id: c.key, label: c.label, color: c.color })),
  { id: 'nipunGap', label: 'Nipun Gap', color: '#0ea5e9' },
  { id: 'studentsReviewed', label: 'Students Reviewed', color: '#0ea5e9' },
];

const EMPTY_FILTERS = FILTER_COLUMNS.reduce((acc, col) => {
  acc[col.id] = { min: '', max: '' };
  return acc;
}, {});

function getCellValue(row, columnId) {
  if (columnId === 'nipunGap') return row.nipunDiff;
  if (columnId === 'studentsReviewed') return row.result ? row.result.studentsReviewed : null;
  return row.result ? row.result[`${columnId}Pct`] : null;
}

const SOURCE_LABEL = { verifier: 'Verifier', school: 'Schools' };
const SOURCE_CLASS = { verifier: 'text-violet-700', school: 'text-sky-700' };

function ProvenanceLine({ row, entityLabel }) {
  const diff = row.nipunDiff;
  const entityLower = entityLabel.toLowerCase();

  if (!row.resultSource) {
    return <p className="text-xs text-sky-400 mt-1.5">No data from either source</p>;
  }

  let reason;
  if (diff == null) {
    reason = row.resultSource === 'school' ? `no verifier sample for this ${entityLower}` : `no school data for this ${entityLower}`;
  } else if (row.resultSource === 'verifier') {
    reason = `overrode schools by ${diff}pp on Nipun`;
  } else if (diff < 0) {
    reason = `verifier read ${Math.abs(diff)}pp higher on Nipun`;
  } else if (diff > 0) {
    reason = `verifier agreed within ${diff}pp on Nipun`;
  } else {
    reason = 'verifier matched exactly on Nipun';
  }

  return (
    <p className="text-xs text-sky-500 mt-1.5">
      via <span className={`font-semibold ${SOURCE_CLASS[row.resultSource]}`}>{SOURCE_LABEL[row.resultSource]}</span>
      {' — '}{reason}
    </p>
  );
}

function ResultBar({ result }) {
  if (!result) {
    return <div className="h-1.5 w-28 rounded-full bg-sky-100 mt-2" />;
  }
  const total = CATEGORY.reduce((s, c) => s + result[`${c.key}Pct`], 0) || 1;
  return (
    <div className="w-28 mt-2">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-sky-100">
        {CATEGORY.map((c) => {
          const w = (result[`${c.key}Pct`] / total) * 100;
          if (w <= 0) return null;
          return (
            <div
              key={c.key}
              style={{ width: `${w}%`, backgroundColor: c.color }}
              title={`${c.label}: ${result[`${c.key}Pct`]}%`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PctCell({ result, categoryKey }) {
  if (!result) {
    return <span className="text-sky-300">—</span>;
  }
  const cat = CATEGORY.find((c) => c.key === categoryKey);
  return (
    <div className="leading-tight">
      <span className="font-heading font-bold text-base" style={{ color: cat.color }}>
        {result[`${categoryKey}Pct`]}%
      </span>
      <p className="text-xs text-sky-600/55 mt-1">{result[categoryKey].toLocaleString()}</p>
    </div>
  );
}

function GapCell({ nipunDiff }) {
  if (nipunDiff == null) return <span className="text-sky-300">—</span>;
  const flagged = nipunDiff > 5;
  const cls = flagged ? 'bg-violet-100 text-violet-800 font-bold' : 'text-sky-600';
  return (
    <span className={`inline-block rounded-md px-2.5 py-1.5 text-sm font-semibold ${cls}`}>
      {nipunDiff > 0 ? '+' : ''}{nipunDiff}pp
    </span>
  );
}

// Renders one row per cluster OR district (or any geo level) — see entityLabel/showLocationMeta props.
export default function ResultClusterList({ rows, entityLabel = 'Cluster', showLocationMeta = true }) {
  const plural = `${entityLabel}s`;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [columnFilters, setColumnFilters] = useState(EMPTY_FILTERS);
  const [sortConfig, setSortConfig] = useState({ id: null, direction: 'desc' });
  const [dataFilter, setDataFilter] = useState('any');
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
      + (dataFilter !== 'any' ? 1 : 0),
    [columnFilters, dataFilter],
  );

  const updateFilter = (id, field, value) => {
    setColumnFilters((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setPage(0);
  };

  const clearFilters = () => {
    setColumnFilters(EMPTY_FILTERS);
    setDataFilter('any');
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

    if (dataFilter !== 'any') {
      result = result.filter((row) => (dataFilter === 'has' ? row.result != null : row.result == null));
    }

    const activeCols = FILTER_COLUMNS.filter((col) => {
      const f = columnFilters[col.id];
      return f && (f.min !== '' || f.max !== '');
    });

    if (activeCols.length) {
      result = result.filter((row) =>
        activeCols.every((col) => {
          const { min, max } = columnFilters[col.id];
          const value = getCellValue(row, col.id);
          if (value == null) return false;
          if (min !== '' && value < Number(min)) return false;
          if (max !== '' && value > Number(max)) return false;
          return true;
        }),
      );
    }

    return result;
  }, [rows, search, columnFilters, dataFilter]);

  const districts = useMemo(
    () => [...new Set(filtered.map((r) => r.districtName).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [filtered],
  );

  const sourceCounts = useMemo(() => {
    let school = 0;
    let verifier = 0;
    let none = 0;
    filtered.forEach((row) => {
      if (row.resultSource === 'school') school += 1;
      else if (row.resultSource === 'verifier') verifier += 1;
      else none += 1;
    });
    return { school, verifier, none };
  }, [filtered]);

  const sorted = useMemo(() => {
    if (!sortConfig.id) return filtered;
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (sortConfig.id === 'cluster') {
        return a.clusterName.localeCompare(b.clusterName) * dir;
      }
      const va = getCellValue(a, sortConfig.id);
      const vb = getCellValue(b, sortConfig.id);
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
        No {plural.toLowerCase()} match the current filters.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-sky-100 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-bold text-sky-900">{entityLabel} result</h2>
          <p className="text-xs text-sky-700/60 mt-0.5">
            <span className="text-sky-700 font-semibold">{sourceCounts.school.toLocaleString()}</span> via Schools ·{' '}
            <span className="text-violet-700 font-semibold">{sourceCounts.verifier.toLocaleString()}</span> via Verifier
            {sourceCounts.none > 0 && (
              <> · <span className="text-sky-400 font-semibold">{sourceCounts.none.toLocaleString()}</span> no data</>
            )}
            {' · '}{filtered.length.toLocaleString()} {plural.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sky-400" />
            <input
              type="text"
              placeholder={`Search ${entityLabel.toLowerCase()}…`}
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
            onClick={() => exportClusterResultExcel(filtered, { entityLabel })}
            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
          >
            <Download className="w-4 h-4" />
            Download Excel
          </button>
        </div>
      </div>

      {showLocationMeta && (
        <div className="px-5 py-3 border-b border-sky-100 bg-sky-50/30">
          <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-2">
            Districts ({districts.length.toLocaleString()})
          </p>
          {districts.length ? (
            <div className="flex flex-wrap gap-1.5">
              {districts.map((d) => (
                <span
                  key={d}
                  className="inline-block rounded-full border border-sky-200 bg-white px-2.5 py-1 text-xs font-medium text-sky-700"
                >
                  {d}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-sky-400">No districts match the current filters.</p>
          )}
        </div>
      )}

      {showFilters && (
        <div className="px-5 py-4 border-b border-sky-100 bg-sky-50/50">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide">
              Filter by value
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
          <div className="rounded-xl border border-sky-200 bg-white p-3 mb-3 max-w-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-sky-800">Result</p>
              <select
                value={dataFilter}
                onChange={(e) => {
                  setDataFilter(e.target.value);
                  setPage(0);
                }}
                className="px-2 py-1 rounded-lg border border-sky-200 text-xs text-sky-800 focus:outline-none focus:ring-2 focus:ring-sky-400"
              >
                <option value="any">All rows</option>
                <option value="has">Has result</option>
                <option value="none">No data (—)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {FILTER_COLUMNS.map((col) => {
              const f = columnFilters[col.id];
              return (
                <div key={col.id} className="rounded-xl border border-sky-200 bg-white p-3">
                  <p className="text-xs font-semibold mb-2 truncate" style={{ color: col.color }}>
                    {col.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={f.min}
                      onChange={(e) => updateFilter(col.id, 'min', e.target.value)}
                      className="w-full min-w-0 px-2 py-1 rounded-lg border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                    <span className="text-sky-300 text-xs">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={f.max}
                      onChange={(e) => updateFilter(col.id, 'max', e.target.value)}
                      className="w-full min-w-0 px-2 py-1 rounded-lg border border-sky-200 text-xs focus:outline-none focus:ring-2 focus:ring-sky-400"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[880px]">
          <thead>
            <tr className="bg-sky-50 border-b border-sky-100">
              <th
                onClick={() => toggleSort('cluster')}
                className="group text-left py-3 px-4 text-sm font-bold text-sky-800 sticky left-0 bg-sky-50 z-10 min-w-[260px] cursor-pointer select-none hover:bg-sky-100"
              >
                <span className="inline-flex items-center gap-1.5">
                  {entityLabel} · Result
                  <SortIcon active={sortConfig.id === 'cluster'} direction={sortConfig.direction} />
                </span>
              </th>
              {CATEGORY.map((c) => (
                <th
                  key={c.key}
                  onClick={() => toggleSort(c.key)}
                  className="group py-3 px-2 font-semibold border-l border-sky-100 text-center cursor-pointer select-none hover:bg-sky-100"
                  style={{ color: c.color }}
                >
                  <span className="inline-flex items-center justify-center gap-1">
                    {c.label}
                    <SortIcon active={sortConfig.id === c.key} direction={sortConfig.direction} />
                  </span>
                </th>
              ))}
              <th
                onClick={() => toggleSort('nipunGap')}
                className="group py-3 px-2 font-semibold border-l border-sky-100 text-center text-sky-700 cursor-pointer select-none hover:bg-sky-100"
              >
                <span className="inline-flex items-center justify-center gap-1">
                  Nipun Gap
                  <SortIcon active={sortConfig.id === 'nipunGap'} direction={sortConfig.direction} />
                </span>
              </th>
              <th
                onClick={() => toggleSort('studentsReviewed')}
                className="group py-3 px-2 font-semibold border-l border-sky-100 text-center text-sky-700 cursor-pointer select-none hover:bg-sky-100"
              >
                <span className="inline-flex items-center justify-center gap-1">
                  Reviewed
                  <SortIcon active={sortConfig.id === 'studentsReviewed'} direction={sortConfig.direction} />
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.clusterId} className="border-b border-sky-50 hover:bg-sky-50/40">
                <td className="py-4 px-4 sticky left-0 bg-white hover:bg-sky-50/40 z-10">
                  <p className="font-semibold text-sm text-sky-900">{row.clusterName}</p>
                  {showLocationMeta && (
                    <p className="text-xs text-sky-500 mt-1">
                      {row.districtName}{row.blockName ? ` · ${row.blockName}` : ''}
                    </p>
                  )}
                  <ResultBar result={row.result} />
                  <ProvenanceLine row={row} entityLabel={entityLabel} />
                </td>

                {CATEGORY.map((c) => (
                  <td key={`${row.clusterId}-${c.key}`} className="py-4 px-3 text-center border-l border-sky-50">
                    <PctCell result={row.result} categoryKey={c.key} />
                  </td>
                ))}

                <td className="py-4 px-3 text-center border-l border-sky-50">
                  <GapCell nipunDiff={row.nipunDiff} />
                </td>

                <td className="py-4 px-3 text-center border-l border-sky-50 text-sky-700 font-semibold">
                  {row.result ? row.result.studentsReviewed.toLocaleString() : <span className="text-sky-300 font-normal">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-sky-100 flex flex-wrap items-center justify-between gap-2 text-sm text-sky-600">
        <span>
          Nipun Gap = Schools − Verifier (same sign as the Comparison page) · Highlighted when the verifier overruled the school · Showing{' '}
          <strong className="text-sky-800">
            {sorted.length === 0 ? 0 : page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)}
          </strong>{' '}
          of <strong className="text-sky-800">{sorted.length.toLocaleString()}</strong> {plural.toLowerCase()} · Page {page + 1} of {totalPages}
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
