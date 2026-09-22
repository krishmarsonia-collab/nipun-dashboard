import { useMemo } from 'react';
import { Info } from 'lucide-react';
import ResultClusterList from '../components/ResultClusterList';
import { buildClusterResults } from '../utils';

export default function DistrictResultPage({ districtComparisons, scope }) {
  const resultRows = useMemo(() => buildClusterResults(districtComparisons), [districtComparisons]);

  const counts = useMemo(() => {
    let school = 0;
    let verifier = 0;
    let none = 0;
    resultRows.forEach((row) => {
      if (row.resultSource === 'school') school += 1;
      else if (row.resultSource === 'verifier') verifier += 1;
      else none += 1;
    });
    return { school, verifier, none, total: resultRows.length };
  }, [resultRows]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-sky-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading font-bold text-sky-900">How we pick the final number</h3>
            <p className="text-sm text-sky-800/80 mt-1 leading-relaxed">
              For each district, the school's self-reported Nipun % is the official result — unless
              it reads more than 5 percentage points higher than the independent verifier sample,
              aggregated across the whole district, in which case the verifier's numbers become
              the official result for that district instead. A verifier sample reading higher than
              the school never overrides it, by any margin.
            </p>
            <p className="text-xs text-sky-700/70 mt-3">
              In <span className="font-semibold text-sky-900">{scope}</span> scope:{' '}
              <span className="font-semibold text-sky-700">{counts.school.toLocaleString()}</span> of{' '}
              <span className="font-semibold text-sky-900">{counts.total.toLocaleString()}</span> districts use
              school data; <span className="font-semibold text-violet-700">{counts.verifier.toLocaleString()}</span>{' '}
              were overruled by the verifier audit
              {counts.none > 0 && (
                <>; <span className="font-semibold text-sky-400">{counts.none.toLocaleString()}</span> have no data from either source</>
              )}
              .
            </p>
          </div>
        </div>
      </div>

      <ResultClusterList rows={resultRows} entityLabel="District" showLocationMeta={false} />
    </div>
  );
}
