export const COLORS = {
  darkBlue: 'FF14557E',
  lightBlue: 'FF76B6EA',
  headerBg: 'FFEAF7FD',
  violet: 'FF6630D9',
  blue: 'FF0B73B7',
  green: 'FF087A59',
  red: 'FFF04444',
  orange: 'FFFF9900',
  teal: 'FF13B866',
  diffPositiveText: 'FF087A59',
  diffPositiveBg: 'FFD8F8E8',
  diffNegativeText: 'FFB91C1C',
  diffNegativeBg: 'FFFFF1F1',
  neutralText: 'FF475569',
  subLabelText: 'FF64748B',
  white: 'FFFFFFFF',
};

// The app's CATEGORY (src/utils.js) uses CSS hex colors for on-screen rendering;
// xlsx-js-style needs ARGB, so this is a separate copy for spreadsheet exports.
export const CATEGORY = [
  { key: 'udayman', label: 'UDAYMAN', color: COLORS.red },
  { key: 'pragatishil', label: 'PRAGATISHIL', color: COLORS.orange },
  { key: 'nipun', label: 'NIPUN', color: COLORS.teal },
];

export const THIN_BORDER = { style: 'thin', color: { rgb: 'FF000000' } };
export const BORDER_ALL = {
  top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER,
};

export function cell(v, s, extra) {
  return { v, s: { ...s, border: BORDER_ALL }, ...extra };
}

// Round to `n` decimals via a string round-trip so binary floats like
// 0.41700000000000004 collapse back to a clean 0.417 before hitting the sheet.
export function round(value, n) {
  return Number(value.toFixed(n));
}

export function titleStyle(color, sz, bold) {
  return {
    font: { name: 'Calibri', sz, bold, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.white } },
  };
}

export function groupHeaderStyle(color) {
  return {
    font: { name: 'Calibri', sz: 13, bold: true, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerBg } },
  };
}

export function subHeaderStyle(color) {
  return {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerBg } },
  };
}

export function leafHeaderStyle() {
  return {
    font: { name: 'Calibri', sz: 9, bold: false, color: { rgb: COLORS.subLabelText } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { patternType: 'solid', fgColor: { rgb: COLORS.headerBg } },
  };
}

export function labelStyle(color, bold) {
  return {
    font: { name: 'Calibri', sz: 10, bold, color: { rgb: color } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };
}

export function pctStyle(color) {
  return {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: '0.0',
  };
}

export function countStyle(color) {
  return {
    font: { name: 'Calibri', sz: 10, bold: false, color: { rgb: color } },
    alignment: { horizontal: 'center', vertical: 'center' },
    numFmt: '#,##0',
  };
}

export function diffStyle(textColor, bgColor, bold) {
  return {
    font: { name: 'Calibri', sz: 10, bold, color: { rgb: textColor } },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: bgColor ? { patternType: 'solid', fgColor: { rgb: bgColor } } : undefined,
    numFmt: '+0.0"pp";-0.0"pp";0.0"pp"',
  };
}

export function emptyStyle() {
  return {
    font: { name: 'Calibri', sz: 10, color: { rgb: 'FFB9D4E8' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
}
