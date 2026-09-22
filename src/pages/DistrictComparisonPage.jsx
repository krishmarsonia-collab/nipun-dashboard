import ClusterComparisonList from '../components/ClusterComparisonList';

export default function DistrictComparisonPage({ districtComparisons }) {
  return (
    <div className="space-y-6">
      <ClusterComparisonList rows={districtComparisons} entityLabel="District" showLocationMeta={false} />
    </div>
  );
}
