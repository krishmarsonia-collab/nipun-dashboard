import ClusterComparisonList from '../components/ClusterComparisonList';

export default function BlockComparisonPage({ blockComparisons }) {
  return (
    <div className="space-y-6">
      <ClusterComparisonList rows={blockComparisons} entityLabel="Block" showLocationMeta={false} />
    </div>
  );
}
