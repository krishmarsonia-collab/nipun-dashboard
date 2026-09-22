import * as XLSX from 'xlsx-js-style';
import {
  COLORS,
  CATEGORY,
  cell,
  round,
  titleStyle,
  groupHeaderStyle,
  subHeaderStyle,
  leafHeaderStyle,
  labelStyle,
  pctStyle,
  countStyle,
  diffStyle,
  emptyStyle,
} from './excelStyles';
import { statPct, statCount } from './utils';

// Columns: Cluster, District, Block (0-2), then Verifier %/Count per category (3-8),
// Schools %/Count per category (9-14), then Difference per category (15-17, unchanged).
const COLS = 18;
const VERIFIER_START = 3;
const SCHOOLS_START = 9;
const DIFF_START = 15;

function isSchoolFavorable(categoryKey, diff) {
  if (Math.abs(diff) < 0.5) return null;
  if (categoryKey === 'nipun') return diff > 0 ? 'favorable' : 'unfavorable';
  return diff < 0 ? 'favorable' : 'unfavorable';
}

export function exportClusterComparisonExcel(rows, { scope, filename, entityLabel = 'Cluster' } = {}) {
  const ws = {};
  const setCell = (r, c, cellObj) => {
    ws[XLSX.utils.encode_cell({ r, c })] = cellObj;
  };

  setCell(0, 0, cell(`${entityLabel} Comparison`, titleStyle(COLORS.darkBlue, 18, true)));
  for (let c = 1; c < COLS; c += 1) setCell(0, c, cell('', titleStyle(COLORS.darkBlue, 18, true)));

  const subtitle = `Verifier sample vs schools in ${entityLabel.toLowerCase()}${scope ? ` · ${scope}` : ''} · ${rows.length.toLocaleString()} ${entityLabel.toLowerCase()}s`;
  setCell(1, 0, cell(subtitle, titleStyle(COLORS.lightBlue, 11, false)));
  for (let c = 1; c < COLS; c += 1) setCell(1, c, cell('', titleStyle(COLORS.lightBlue, 11, false)));

  // Row 2 (0-indexed): top-level group banners
  setCell(2, 0, cell(entityLabel, groupHeaderStyle(COLORS.darkBlue)));
  for (let c = 1; c <= 2; c += 1) setCell(2, c, cell('', groupHeaderStyle(COLORS.darkBlue)));
  setCell(2, VERIFIER_START, cell('Verifier', groupHeaderStyle(COLORS.violet)));
  for (let c = VERIFIER_START + 1; c < SCHOOLS_START; c += 1) setCell(2, c, cell('', groupHeaderStyle(COLORS.violet)));
  setCell(2, SCHOOLS_START, cell('Schools', groupHeaderStyle(COLORS.blue)));
  for (let c = SCHOOLS_START + 1; c < DIFF_START; c += 1) setCell(2, c, cell('', groupHeaderStyle(COLORS.blue)));
  setCell(2, DIFF_START, cell('Difference', groupHeaderStyle(COLORS.green)));
  for (let c = DIFF_START + 1; c < COLS; c += 1) setCell(2, c, cell('', groupHeaderStyle(COLORS.green)));

  // Row 3: Cluster/District/Block (spans down into row 4) and Verifier/Schools category
  // names (merged 2 cols each, for the %/Count split below); Difference category names
  // (spans down into row 4, single column, unchanged).
  setCell(3, 0, cell(entityLabel, subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 0, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, 1, cell('District', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 1, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, 2, cell('Block', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 2, cell('', subHeaderStyle(COLORS.darkBlue)));

  CATEGORY.forEach((c, i) => {
    const col = VERIFIER_START + i * 2;
    setCell(3, col, cell(c.label, subHeaderStyle(c.color)));
    setCell(3, col + 1, cell('', subHeaderStyle(c.color)));
    setCell(4, col, cell('%', leafHeaderStyle()));
    setCell(4, col + 1, cell('Value', leafHeaderStyle()));
  });

  CATEGORY.forEach((c, i) => {
    const col = SCHOOLS_START + i * 2;
    setCell(3, col, cell(c.label, subHeaderStyle(c.color)));
    setCell(3, col + 1, cell('', subHeaderStyle(c.color)));
    setCell(4, col, cell('%', leafHeaderStyle()));
    setCell(4, col + 1, cell('Value', leafHeaderStyle()));
  });

  CATEGORY.forEach((c, i) => {
    const col = DIFF_START + i;
    setCell(3, col, cell(c.label, subHeaderStyle(COLORS.green)));
    setCell(4, col, cell('', subHeaderStyle(COLORS.green)));
  });

  rows.forEach((row, idx) => {
    const r = 5 + idx;
    setCell(r, 0, cell(row.clusterName, labelStyle(COLORS.darkBlue, true)));
    setCell(r, 1, cell(row.districtName, labelStyle(COLORS.blue, false)));
    setCell(r, 2, cell(row.blockName, labelStyle(COLORS.blue, false)));

    CATEGORY.forEach((c, i) => {
      const col = VERIFIER_START + i * 2;
      const v = statPct(row.verifierStats, c.key);
      const count = statCount(row.verifierStats, c.key);
      if (v == null) {
        setCell(r, col, cell('—', emptyStyle()));
        setCell(r, col + 1, cell('—', emptyStyle()));
      } else {
        setCell(r, col, cell(round(v, 1), pctStyle(c.color)));
        setCell(r, col + 1, cell(count, countStyle(c.color)));
      }
    });

    CATEGORY.forEach((c, i) => {
      const col = SCHOOLS_START + i * 2;
      const v = statPct(row.schoolStats, c.key);
      const count = statCount(row.schoolStats, c.key);
      if (v == null) {
        setCell(r, col, cell('—', emptyStyle()));
        setCell(r, col + 1, cell('—', emptyStyle()));
      } else {
        setCell(r, col, cell(round(v, 1), pctStyle(c.color)));
        setCell(r, col + 1, cell(count, countStyle(c.color)));
      }
    });

    CATEGORY.forEach((c, i) => {
      const col = DIFF_START + i;
      const schoolPct = statPct(row.schoolStats, c.key);
      const verifierPct = statPct(row.verifierStats, c.key);
      if (schoolPct == null || verifierPct == null) {
        setCell(r, col, cell('—', emptyStyle()));
        return;
      }
      const diff = round(schoolPct - verifierPct, 1);
      const favorability = isSchoolFavorable(c.key, diff);
      let style;
      if (favorability === 'favorable') style = diffStyle(COLORS.diffPositiveText, COLORS.diffPositiveBg, true);
      else if (favorability === 'unfavorable') style = diffStyle(COLORS.diffNegativeText, COLORS.diffNegativeBg, true);
      else style = diffStyle(COLORS.neutralText, null, false);
      setCell(r, col, cell(diff, style));
    });
  });

  const lastRow = 4 + rows.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: COLS - 1 } });

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 2 } },
    { s: { r: 2, c: VERIFIER_START }, e: { r: 2, c: SCHOOLS_START - 1 } },
    { s: { r: 2, c: SCHOOLS_START }, e: { r: 2, c: DIFF_START - 1 } },
    { s: { r: 2, c: DIFF_START }, e: { r: 2, c: COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
    ...CATEGORY.map((c, i) => ({
      s: { r: 3, c: VERIFIER_START + i * 2 }, e: { r: 3, c: VERIFIER_START + i * 2 + 1 },
    })),
    ...CATEGORY.map((c, i) => ({
      s: { r: 3, c: SCHOOLS_START + i * 2 }, e: { r: 3, c: SCHOOLS_START + i * 2 + 1 },
    })),
    ...CATEGORY.map((c, i) => ({
      s: { r: 3, c: DIFF_START + i }, e: { r: 4, c: DIFF_START + i },
    })),
  ];

  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 16 },
    ...Array(12).fill({ wch: 10 }),
    { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];

  ws['!rows'] = [
    { hpt: 32 }, { hpt: 22 }, { hpt: 30 }, { hpt: 26 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 30 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${entityLabel} Comparison`);

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, filename || `${entityLabel.toLowerCase()}-comparison-${date}.xlsx`);
}
