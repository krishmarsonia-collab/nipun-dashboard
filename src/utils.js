export function buildClusterComparisons(schoolRows, verifierRows, filters) {
  const filteredSchools = schoolRows.filter((r) => {
    if (filters.districtId && r.district_id !== filters.districtId) return false;
    if (filters.blockId && r.block_id !== filters.blockId) return false;
    if (filters.clusterId && r.cluster_id !== filters.clusterId) return false;
    if (filters.schoolId && r.school_id !== filters.schoolId) return false;
    return true;
  });

  const filteredVerifiers = verifierRows.filter((r) => {
    if (filters.districtId && r.district_id !== filters.districtId) return false;
    if (filters.blockId && r.block_id !== filters.blockId) return false;
    if (filters.clusterId && r.cluster_id !== filters.clusterId) return false;
    if (filters.schoolId && r.school_id !== filters.schoolId) return false;
    return true;
  });

  const verifierByCluster = new Map();
  filteredVerifiers.forEach((v) => verifierByCluster.set(v.cluster_id, v));

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
      const meta = schoolList[0] || verifierRow || {};

      return {
        clusterId,
        clusterName: meta.cluster_name || clusterId,
        districtName: meta.district_name || '',
        blockName: meta.block_name || '',
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

export function filterSchoolRows(rows, { districtId, blockId, clusterId, schoolId }) {
  return rows.filter((r) => {
    if (districtId && r.district_id !== districtId) return false;
    if (blockId && r.block_id !== blockId) return false;
    if (clusterId && r.cluster_id !== clusterId) return false;
    if (schoolId && r.school_id !== schoolId) return false;
    return true;
  });
}

export function filterVerifierRows(rows, { districtId, blockId, clusterId, schoolId }) {
  return rows.filter((r) => {
    if (districtId && r.district_id !== districtId) return false;
    if (blockId && r.block_id !== blockId) return false;
    if (clusterId && r.cluster_id !== clusterId) return false;
    if (schoolId && r.school_id !== schoolId) return false;
    return true;
  });
}

export function scopeLabel(filters) {
  if (filters.schoolId) return 'School';
  if (filters.clusterId) return 'Cluster';
  if (filters.blockId) return 'Block';
  if (filters.districtId) return 'District';
  return 'State-wide';
}
