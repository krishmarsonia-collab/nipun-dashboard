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

// Columns: Cluster, District, Block, Source Used (0-3), then %/Count per category (4-9),
// Nipun Gap (10), Students Reviewed (11).
const COLS = 12;
const CATEGORY_START = 4;
const GAP_COL = 10;
const REVIEWED_COL = 11;

const SOURCE_LABEL = { verifier: 'Verifier', school: 'Schools', null: 'No data' };
const SOURCE_COLOR = { verifier: COLORS.violet, school: COLORS.blue, null: COLORS.subLabelText };

function sourceStyle(source) {
  return {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: SOURCE_COLOR[source] } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerBg } },
  };
}

export function exportClusterResultExcel(rows, { scope, filename, entityLabel = 'Cluster' } = {}) {
  const ws = {};
  const setCell = (r, c, cellObj) => {
    ws[XLSX.utils.encode_cell({ r, c })] = cellObj;
  };

  setCell(0, 0, cell(`${entityLabel} Result`, titleStyle(COLORS.darkBlue, 18, true)));
  for (let c = 1; c < COLS; c += 1) setCell(0, c, cell('', titleStyle(COLORS.darkBlue, 18, true)));

  const subtitle = `Trusted number per ${entityLabel.toLowerCase()}${scope ? ` · ${scope}` : ''} · ${rows.length.toLocaleString()} ${entityLabel.toLowerCase()}s`;
  setCell(1, 0, cell(subtitle, titleStyle(COLORS.lightBlue, 11, false)));
  for (let c = 1; c < COLS; c += 1) setCell(1, c, cell('', titleStyle(COLORS.lightBlue, 11, false)));

  const legend = 'Result = Verifier data when Schools Nipun % is more than 5pp higher than Verifier Nipun %, otherwise Schools data.';
  setCell(2, 0, cell(legend, titleStyle(COLORS.subLabelText, 9, false)));
  for (let c = 1; c < COLS; c += 1) setCell(2, c, cell('', titleStyle(COLORS.subLabelText, 9, false)));

  setCell(3, 0, cell(entityLabel, subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 0, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, 1, cell('District', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 1, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, 2, cell('Block', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 2, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, 3, cell('Source Used', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, 3, cell('', subHeaderStyle(COLORS.darkBlue)));

  CATEGORY.forEach((c, i) => {
    const col = CATEGORY_START + i * 2;
    setCell(3, col, cell(c.label, subHeaderStyle(c.color)));
    setCell(3, col + 1, cell('', subHeaderStyle(c.color)));
    setCell(4, col, cell('%', leafHeaderStyle()));
    setCell(4, col + 1, cell('Value', leafHeaderStyle()));
  });

  setCell(3, GAP_COL, cell('Nipun Gap (pp)', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, GAP_COL, cell('', subHeaderStyle(COLORS.darkBlue)));
  setCell(3, REVIEWED_COL, cell('Students Reviewed', subHeaderStyle(COLORS.darkBlue)));
  setCell(4, REVIEWED_COL, cell('', subHeaderStyle(COLORS.darkBlue)));

  rows.forEach((row, idx) => {
    const r = 5 + idx;
    setCell(r, 0, cell(row.clusterName, labelStyle(COLORS.darkBlue, true)));
    setCell(r, 1, cell(row.districtName, labelStyle(COLORS.blue, false)));
    setCell(r, 2, cell(row.blockName, labelStyle(COLORS.blue, false)));
    setCell(r, 3, cell(SOURCE_LABEL[row.resultSource], sourceStyle(row.resultSource)));

    CATEGORY.forEach((c, i) => {
      const col = CATEGORY_START + i * 2;
      if (!row.result) {
        setCell(r, col, cell('—', emptyStyle()));
        setCell(r, col + 1, cell('—', emptyStyle()));
        return;
      }
      setCell(r, col, cell(round(row.result[`${c.key}Pct`], 1), pctStyle(c.color)));
      setCell(r, col + 1, cell(row.result[c.key], countStyle(c.color)));
    });

    if (row.nipunDiff == null) {
      setCell(r, GAP_COL, cell('—', emptyStyle()));
    } else {
      const flagged = row.nipunDiff > 5;
      const style = flagged
        ? diffStyle(COLORS.diffPositiveText, COLORS.diffPositiveBg, true)
        : diffStyle(COLORS.neutralText, null, false);
      setCell(r, GAP_COL, cell(row.nipunDiff, style));
    }

    if (row.result) {
      setCell(r, REVIEWED_COL, cell(row.result.studentsReviewed, countStyle(COLORS.neutralText)));
    } else {
      setCell(r, REVIEWED_COL, cell('—', emptyStyle()));
    }
  });

  const lastRow = 4 + rows.length;
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: COLS - 1 } });

  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: COLS - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: COLS - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: COLS - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 4, c: 0 } },
    { s: { r: 3, c: 1 }, e: { r: 4, c: 1 } },
    { s: { r: 3, c: 2 }, e: { r: 4, c: 2 } },
    { s: { r: 3, c: 3 }, e: { r: 4, c: 3 } },
    ...CATEGORY.map((c, i) => ({
      s: { r: 3, c: CATEGORY_START + i * 2 }, e: { r: 3, c: CATEGORY_START + i * 2 + 1 },
    })),
    { s: { r: 3, c: GAP_COL }, e: { r: 4, c: GAP_COL } },
    { s: { r: 3, c: REVIEWED_COL }, e: { r: 4, c: REVIEWED_COL } },
  ];

  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 14 },
    ...Array(6).fill({ wch: 10 }),
    { wch: 14 }, { wch: 16 },
  ];

  ws['!rows'] = [
    { hpt: 32 }, { hpt: 22 }, { hpt: 20 }, { hpt: 26 }, { hpt: 20 },
    ...rows.map(() => ({ hpt: 26 })),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, `${entityLabel} Result`);

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, filename || `${entityLabel.toLowerCase()}-result-${date}.xlsx`);
}
