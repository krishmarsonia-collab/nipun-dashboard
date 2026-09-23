export function buildClusterComparisons(schoolRows, verifierRows, filters) {
  const filteredSchools = filterSchoolRows(schoolRows, filters);
  const filteredVerifiers = filterVerifierRows(verifierRows, filters);

  // Verifier rows carry their own sampling `cluster_id`, distinct from the geographic
  // cluster; `geo_cluster_id` is the one that actually matches schools' `cluster_id`.
  const verifierByCluster = new Map();
  filteredVerifiers.forEach((v) => verifierByCluster.set(v.geo_cluster_id, v));

  const schoolsByCluster = new Map();
  filteredSchools.forEach((s) => {
    if (!schoolsByCluster.has(s.cluster_id)) schoolsByCluster.set(s.cluster_id, []);
    schoolsByCluster.get(s.cluster_id).push(s);
  });

  const clusterIds = new Set([...schoolsByCluster.keys(), ...verifierByCluster.keys()]);

  return Array.from(clusterIds)
    .map((clusterId) => {
      const schoolList = schoolsByCluster.get(clusterId) || [];
      const verifierRow = verifierByCluster.get(clusterId);
      const meta = schoolList[0] || {};

      return {
        clusterId,
        clusterName: meta.cluster_name || verifierRow?.geo_cluster_name || clusterId,
        districtName: meta.district_name || verifierRow?.district_name || '',
        blockName: meta.block_name || verifierRow?.block_name || '',
        schoolList: schoolList.map((s) => ({ id: s.school_id, name: s.school_name })),
        verifierSchool: verifierRow
          ? { id: verifierRow.school_id, name: verifierRow.school_name }
          : null,
        schoolStats: aggregateRows(schoolList),
        verifierStats: verifierRow ? aggregateRows([verifierRow]) : null,
      };
    })
    .sort((a, b) => a.clusterName.localeCompare(b.clusterName));
}

export function buildDistrictComparisons(schoolRows, verifierRows, filters) {
  const filteredSchools = filterSchoolRows(schoolRows, filters);
  const filteredVerifiers = filterVerifierRows(verifierRows, filters);

  const schoolsByDistrict = new Map();
  filteredSchools.forEach((s) => {
    if (!schoolsByDistrict.has(s.district_id)) schoolsByDistrict.set(s.district_id, []);
    schoolsByDistrict.get(s.district_id).push(s);
  });

  const verifiersByDistrict = new Map();
  filteredVerifiers.forEach((v) => {
    if (!verifiersByDistrict.has(v.district_id)) verifiersByDistrict.set(v.district_id, []);
    verifiersByDistrict.get(v.district_id).push(v);
  });

  const districtIds = new Set([...schoolsByDistrict.keys(), ...verifiersByDistrict.keys()]);

  // Row shape intentionally mirrors buildClusterComparisons' output (clusterId/clusterName/
  // districtName/blockName/schoolStats/verifierStats) so it's a drop-in for the same list
  // components and export functions — see the entityLabel/showLocationMeta props they take.
  return Array.from(districtIds)
    .map((districtId) => {
      const schoolList = schoolsByDistrict.get(districtId) || [];
      const verifierList = verifiersByDistrict.get(districtId) || [];
      const meta = schoolList[0] || verifierList[0] || {};

      return {
        clusterId: districtId,
        clusterName: meta.district_name || districtId,
        districtName: meta.district_name || '',
        blockName: '',
        schoolStats: aggregateRows(schoolList),
        verifierStats: verifierList.length ? aggregateRows(verifierList) : null,
      };
    })
    .sort((a, b) => a.clusterName.localeCompare(b.clusterName));
}

export function buildBlockComparisons(schoolRows, verifierRows, filters) {
  const filteredSchools = filterSchoolRows(schoolRows, filters);
  const filteredVerifiers = filterVerifierRows(verifierRows, filters);

  const schoolsByBlock = new Map();
  filteredSchools.forEach((s) => {
    if (!schoolsByBlock.has(s.block_id)) schoolsByBlock.set(s.block_id, []);
    schoolsByBlock.get(s.block_id).push(s);
  });

  const verifiersByBlock = new Map();
  filteredVerifiers.forEach((v) => {
    if (!verifiersByBlock.has(v.block_id)) verifiersByBlock.set(v.block_id, []);
    verifiersByBlock.get(v.block_id).push(v);
  });

  const blockIds = new Set([...schoolsByBlock.keys(), ...verifiersByBlock.keys()]);

  // Row shape mirrors buildClusterComparisons/buildDistrictComparisons' output — drop-in
  // for the same list components and export functions via entityLabel="Block".
  return Array.from(blockIds)
    .map((blockId) => {
      const schoolList = schoolsByBlock.get(blockId) || [];
      const verifierList = verifiersByBlock.get(blockId) || [];
      const meta = schoolList[0] || verifierList[0] || {};

      return {
        clusterId: blockId,
        clusterName: meta.block_name || blockId,
        districtName: meta.district_name || '',
        blockName: '',
        schoolStats: aggregateRows(schoolList),
        verifierStats: verifierList.length ? aggregateRows(verifierList) : null,
      };
    })
    .sort((a, b) => a.clusterName.localeCompare(b.clusterName));
}

/** Parse a CSV line respecting quoted fields */
function parseLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

export async function loadCsv(url) {
  const text = await fetch(url).then((r) => {
    if (!r.ok) throw new Error(`Failed to load ${url}`);
    return r.text();
  });
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const row = {};
    headers.forEach((h, i) => {
      row[h] = (vals[i] || '').replace(/^"|"$/g, '');
    });
    return row;
  });
}

export function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function pct(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}

/** Aggregate review category stats from school or verifier rows */
export function aggregateRows(rows) {
  const studentsReviewed = rows.reduce((s, r) => s + num(r.students_reviewed), 0);
  const totalStudents = rows.reduce(
    (s, r) => s + num(r.total_students ?? r.total_allocated),
    0,
  );

  const gujaratiUdayman = rows.reduce((s, r) => s + num(r.gujarati_udayman), 0);
  const gujaratiPragatishil = rows.reduce((s, r) => s + num(r.gujarati_pragatishil), 0);
  const gujaratiNipun = rows.reduce((s, r) => s + num(r.gujarati_nipun), 0);
  const mathsUdayman = rows.reduce((s, r) => s + num(r.maths_udayman), 0);
  const mathsPragatishil = rows.reduce((s, r) => s + num(r.maths_pragatishil), 0);
  const mathsNipun = rows.reduce((s, r) => s + num(r.maths_nipun), 0);

  const subjectSlots = studentsReviewed * 2;
  const udayman = gujaratiUdayman + mathsUdayman;
  const pragatishil = gujaratiPragatishil + mathsPragatishil;
  const nipun = gujaratiNipun + mathsNipun;

  return {
    rowCount: rows.length,
    totalStudents,
    studentsReviewed,
    gujarati: {
      udayman: gujaratiUdayman,
      pragatishil: gujaratiPragatishil,
      nipun: gujaratiNipun,
      udaymanPct: pct(gujaratiUdayman, studentsReviewed),
      pragatishilPct: pct(gujaratiPragatishil, studentsReviewed),
      nipunPct: pct(gujaratiNipun, studentsReviewed),
    },
    maths: {
      udayman: mathsUdayman,
      pragatishil: mathsPragatishil,
      nipun: mathsNipun,
      udaymanPct: pct(mathsUdayman, studentsReviewed),
      pragatishilPct: pct(mathsPragatishil, studentsReviewed),
      nipunPct: pct(mathsNipun, studentsReviewed),
    },
    combined: {
      udayman,
      pragatishil,
      nipun,
      udaymanPct: pct(udayman, subjectSlots),
      pragatishilPct: pct(pragatishil, subjectSlots),
      nipunPct: pct(nipun, subjectSlots),
    },
  };
}

export function uniqueSorted(rows, idKey, nameKey) {
  const map = new Map();
  rows.forEach((r) => {
    const id = r[idKey];
    if (!id) return;
    if (!map.has(id)) map.set(id, r[nameKey] || id);
  });
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const PRIVATE_MANAGEMENT_IDS = new Set(['5', '97']);

export function getManagementType(schoolManagementId) {
  return PRIVATE_MANAGEMENT_IDS.has(String(schoolManagementId)) ? 'private' : 'government';
}

export function filterSchoolRows(rows, { districtId, blockId, clusterId, schoolId, managementType }) {
  return rows.filter((r) => {
    if (districtId && r.district_id !== districtId) return false;
    if (blockId && r.block_id !== blockId) return false;
    if (clusterId && r.cluster_id !== clusterId) return false;
    if (schoolId && r.school_id !== schoolId) return false;
    if (managementType && getManagementType(r.school_management_id) !== managementType) return false;
    return true;
  });
}

export function filterVerifierRows(rows, { districtId, blockId, clusterId, schoolId, managementType }) {
  return rows.filter((r) => {
    if (districtId && r.district_id !== districtId) return false;
    if (blockId && r.block_id !== blockId) return false;
    // clusterId comes from the school-side cluster dropdown, so it must be matched
    // against the verifier row's geo_cluster_id, not its own sampling cluster_id.
    if (clusterId && r.geo_cluster_id !== clusterId) return false;
    if (schoolId && r.school_id !== schoolId) return false;
    if (managementType && getManagementType(r.school_management_id) !== managementType) return false;
    return true;
  });
}

export const CATEGORY = [
  { key: 'udayman', label: 'Udayman', short: 'U', color: '#f0473f', light: '#ffe1df' },
  { key: 'pragatishil', label: 'Pragatishil', short: 'P', color: '#f9a007', light: '#fff3c4' },
  { key: 'nipun', label: 'Nipun', short: 'N', color: '#22b566', light: '#d5f9e2' },
];

/** Combined-category percentage for one source, or null when there's no data to show. */
export function statPct(stats, categoryKey) {
  if (!stats || stats.studentsReviewed === 0) return null;
  return stats.combined[`${categoryKey}Pct`];
}

/** Combined-category raw count for one source, or null when there's no data to show. */
export function statCount(stats, categoryKey) {
  if (!stats || stats.studentsReviewed === 0) return null;
  return stats.combined[categoryKey];
}

/**
 * Picks the trusted source for one cluster: verifier only when the school's self-reported
 * Nipun % is MORE than 5pp HIGHER than the audit sample's (catching an over-optimistic
 * school self-report) — schools otherwise, including when the verifier reads higher than
 * schools, by any margin. Falls back to whichever side has data when the other is missing.
 *
 * `nipunDiff` is School − Verifier (matching the Comparison page's "Difference" column
 * convention, so the same cluster shows the same sign on both pages) — the verifier wins
 * when `nipunDiff` is *more than 5pp positive*.
 */
export function pickClusterResult(row) {
  const schoolNipun = statPct(row.schoolStats, 'nipun');
  const verifierNipun = statPct(row.verifierStats, 'nipun');

  let resultSource = null; // 'school' | 'verifier' | null
  let nipunDiff = null; // school - verifier, null when either side has no data

  if (schoolNipun != null && verifierNipun != null) {
    nipunDiff = Math.round((schoolNipun - verifierNipun) * 10) / 10;
    resultSource = nipunDiff > 5 ? 'verifier' : 'school';
  } else if (verifierNipun != null) {
    resultSource = 'verifier';
  } else if (schoolNipun != null) {
    resultSource = 'school';
  }

  const sourceStats = resultSource === 'verifier' ? row.verifierStats
    : resultSource === 'school' ? row.schoolStats
    : null;

  const result = sourceStats ? {
    udaymanPct: sourceStats.combined.udaymanPct,
    pragatishilPct: sourceStats.combined.pragatishilPct,
    nipunPct: sourceStats.combined.nipunPct,
    udayman: sourceStats.combined.udayman,
    pragatishil: sourceStats.combined.pragatishil,
    nipun: sourceStats.combined.nipun,
    studentsReviewed: sourceStats.studentsReviewed,
  } : null;

  return { ...row, resultSource, nipunDiff, result };
}

export function buildClusterResults(clusterComparisons) {
  return clusterComparisons.map(pickClusterResult);
}

export function scopeLabel(filters) {
  let label;
  if (filters.schoolId) label = 'School';
  else if (filters.clusterId) label = 'Cluster';
  else if (filters.blockId) label = 'Block';
  else if (filters.districtId) label = 'District';
  else label = 'State-wide';

  if (filters.managementType === 'private') return `${label} · Private`;
  if (filters.managementType === 'government') return `${label} · Government`;
  return label;
}
