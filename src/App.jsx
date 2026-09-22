import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Filter, Loader2 } from 'lucide-react';
import ComparisonPage from './pages/ComparisonPage';
import ResultPage from './pages/ResultPage';
import DistrictComparisonPage from './pages/DistrictComparisonPage';
import DistrictResultPage from './pages/DistrictResultPage';
import BlockComparisonPage from './pages/BlockComparisonPage';
import BlockResultPage from './pages/BlockResultPage';
import {
  loadCsv,
  aggregateRows,
  uniqueSorted,
  filterSchoolRows,
  filterVerifierRows,
  buildClusterComparisons,
  buildDistrictComparisons,
  buildBlockComparisons,
  scopeLabel,
} from './utils';

const selectClass =
  'w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:bg-sky-50 disabled:text-sky-400';

const navLinkClass = ({ isActive }) =>
  `text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
    isActive ? 'bg-sky-600 text-white' : 'bg-sky-100 text-sky-800 hover:bg-sky-200'
  }`;

export default function App() {
  const [schoolRows, setSchoolRows] = useState([]);
  const [verifierRows, setVerifierRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [districtId, setDistrictId] = useState('');
  const [blockId, setBlockId] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [schoolId, setSchoolId] = useState('');

  useEffect(() => {
    Promise.all([
      loadCsv('/data/schools.csv'),
      loadCsv('/data/verifiers.csv'),
    ])
      .then(([schools, verifiers]) => {
        setSchoolRows(schools);
        setVerifierRows(verifiers);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filters = useMemo(
    () => ({ districtId, blockId, clusterId, schoolId }),
    [districtId, blockId, clusterId, schoolId],
  );

  const districts = useMemo(
    () => uniqueSorted(schoolRows, 'district_id', 'district_name'),
    [schoolRows],
  );

  const blocks = useMemo(() => {
    if (!districtId) return [];
    return uniqueSorted(
      schoolRows.filter((r) => r.district_id === districtId),
      'block_id',
      'block_name',
    );
  }, [schoolRows, districtId]);

  const clusters = useMemo(() => {
    if (!blockId) return [];
    return uniqueSorted(
      schoolRows.filter((r) => r.block_id === blockId),
      'cluster_id',
      'cluster_name',
    );
  }, [schoolRows, blockId]);

  const schools = useMemo(() => {
    if (!clusterId) return [];
    return uniqueSorted(
      schoolRows.filter((r) => r.cluster_id === clusterId),
      'school_id',
      'school_name',
    );
  }, [schoolRows, clusterId]);

  const filteredSchools = useMemo(
    () => filterSchoolRows(schoolRows, filters),
    [schoolRows, filters],
  );

  const filteredVerifiers = useMemo(
    () => filterVerifierRows(verifierRows, filters),
    [verifierRows, filters],
  );

  const schoolStats = useMemo(() => aggregateRows(filteredSchools), [filteredSchools]);
  const verifierStats = useMemo(() => aggregateRows(filteredVerifiers), [filteredVerifiers]);

  const clusterComparisons = useMemo(
    () => buildClusterComparisons(schoolRows, verifierRows, filters),
    [schoolRows, verifierRows, filters],
  );

  const districtComparisons = useMemo(
    () => buildDistrictComparisons(schoolRows, verifierRows, filters),
    [schoolRows, verifierRows, filters],
  );

  const blockComparisons = useMemo(
    () => buildBlockComparisons(schoolRows, verifierRows, filters),
    [schoolRows, verifierRows, filters],
  );

  const scope = scopeLabel(filters);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <p className="text-bad font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f7fc]">
      <header className="border-b border-sky-200 bg-white/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-xl font-bold text-sky-900">
              School vs Verifier Comparison
            </h1>
            <p className="text-xs text-sky-700/60 mt-0.5">
              Nipun Gujarat · Teacher reviews vs external verifier sample
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <nav className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Cluster</span>
                <NavLink to="/" end className={navLinkClass}>Comparison</NavLink>
                <NavLink to="/result" className={navLinkClass}>Result</NavLink>
              </div>
              <div className="w-px h-5 bg-sky-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">District</span>
                <NavLink to="/district" className={navLinkClass}>Comparison</NavLink>
                <NavLink to="/district-result" className={navLinkClass}>Result</NavLink>
              </div>
              <div className="w-px h-5 bg-sky-200" />
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide">Block</span>
                <NavLink to="/block" className={navLinkClass}>Comparison</NavLink>
                <NavLink to="/block-result" className={navLinkClass}>Result</NavLink>
              </div>
            </nav>
            <span className="text-xs font-semibold bg-sky-100 text-sky-800 px-3 py-1.5 rounded-full">
              Scope: {scope}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-4 h-4 text-sky-600" />
            <h2 className="font-heading font-bold text-sky-900">Location filters</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-sky-700/70 uppercase tracking-wide">District</label>
              <select
                className={`${selectClass} mt-1`}
                value={districtId}
                onChange={(e) => {
                  setDistrictId(e.target.value);
                  setBlockId('');
                  setClusterId('');
                  setSchoolId('');
                }}
              >
                <option value="">All districts (state-wide)</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-sky-700/70 uppercase tracking-wide">Block</label>
              <select
                className={`${selectClass} mt-1`}
                value={blockId}
                disabled={!districtId}
                onChange={(e) => {
                  setBlockId(e.target.value);
                  setClusterId('');
                  setSchoolId('');
                }}
              >
                <option value="">All blocks in district</option>
                {blocks.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-sky-700/70 uppercase tracking-wide">Cluster</label>
              <select
                className={`${selectClass} mt-1`}
                value={clusterId}
                disabled={!blockId}
                onChange={(e) => {
                  setClusterId(e.target.value);
                  setSchoolId('');
                }}
              >
                <option value="">All clusters in block</option>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-sky-700/70 uppercase tracking-wide">School</label>
              <select
                className={`${selectClass} mt-1`}
                value={schoolId}
                disabled={!clusterId}
                onChange={(e) => setSchoolId(e.target.value)}
              >
                <option value="">All schools in cluster</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <Routes>
          <Route
            path="/"
            element={
              <ComparisonPage
                schoolStats={schoolStats}
                verifierStats={verifierStats}
                scope={scope}
                filters={filters}
                clusterComparisons={clusterComparisons}
              />
            }
          />
          <Route
            path="/result"
            element={<ResultPage clusterComparisons={clusterComparisons} scope={scope} />}
          />
          <Route
            path="/district"
            element={<DistrictComparisonPage districtComparisons={districtComparisons} />}
          />
          <Route
            path="/district-result"
            element={<DistrictResultPage districtComparisons={districtComparisons} scope={scope} />}
          />
          <Route
            path="/block"
            element={<BlockComparisonPage blockComparisons={blockComparisons} />}
          />
          <Route
            path="/block-result"
            element={<BlockResultPage blockComparisons={blockComparisons} scope={scope} />}
          />
        </Routes>
      </main>
    </div>
  );
}
