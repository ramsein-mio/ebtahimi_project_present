import { textBodyEditText } from '@web-ppt/edit-core';
import type { Stroke, TableCell, TableElement, TableRow, TextBody } from '@web-ppt/core';

export interface CellAddress {
  r: number;
  c: number;
}

const DEFAULT_BORDER: Stroke = { color: '#d8d2e0', width: 1, dash: null };

function cloneCell(cell: TableCell): TableCell {
  const next = structuredClone(cell);
  next.text = null;
  return next;
}

export function tableCellBody(table: TableElement, address: CellAddress): TextBody | null {
  const cell = table.rows[address.r]?.cells[address.c];
  return cell?.text ?? cell?.editInfo?.textTemplate ?? null;
}

export function tableCellText(table: TableElement, address: CellAddress): string {
  const body = tableCellBody(table, address);
  return body ? textBodyEditText(body) : '';
}

export function addTableRow(table: TableElement): TableElement {
  const next = structuredClone(table);
  const source = next.rows.at(-1);
  const height = source?.height ?? Math.max(42, next.h / Math.max(1, next.rows.length));
  const cells = source?.cells.map(cloneCell) ?? next.colWidths.map(() => ({
    colSpan: 1,
    rowSpan: 1,
    merged: false,
    fill: { type: 'solid' as const, color: '#ffffff' },
    text: null,
    borders: { l: DEFAULT_BORDER, r: DEFAULT_BORDER, t: DEFAULT_BORDER, b: DEFAULT_BORDER },
  }));
  next.rows.push({ height, cells });
  next.h = next.rows.reduce((sum, row) => sum + row.height, 0);
  return next;
}

export function deleteTableRow(table: TableElement, rowIndex: number): TableElement {
  if (table.rows.length <= 1) return table;
  const next = structuredClone(table);
  next.rows.splice(Math.max(0, Math.min(rowIndex, next.rows.length - 1)), 1);
  next.h = next.rows.reduce((sum, row) => sum + row.height, 0);
  return next;
}

export function addTableColumn(table: TableElement): TableElement {
  const next = structuredClone(table);
  const width = next.colWidths.at(-1) ?? Math.max(70, next.w / Math.max(1, next.colWidths.length));
  next.colWidths.push(width);
  for (const row of next.rows) {
    const source = row.cells.at(-1);
    row.cells.push(source ? cloneCell(source) : {
      colSpan: 1,
      rowSpan: 1,
      merged: false,
      fill: { type: 'solid', color: '#ffffff' },
      text: null,
      borders: { l: DEFAULT_BORDER, r: DEFAULT_BORDER, t: DEFAULT_BORDER, b: DEFAULT_BORDER },
    });
  }
  next.w = next.colWidths.reduce((sum, value) => sum + value, 0);
  return next;
}

export function deleteTableColumn(table: TableElement, columnIndex: number): TableElement {
  if (table.colWidths.length <= 1) return table;
  const next = structuredClone(table);
  const index = Math.max(0, Math.min(columnIndex, next.colWidths.length - 1));
  next.colWidths.splice(index, 1);
  for (const row of next.rows) row.cells.splice(index, 1);
  next.w = next.colWidths.reduce((sum, value) => sum + value, 0);
  return next;
}

export function setTableColumnWidth(table: TableElement, columnIndex: number, width: number): TableElement {
  const next = structuredClone(table);
  next.colWidths[columnIndex] = Math.max(32, width);
  next.w = next.colWidths.reduce((sum, value) => sum + value, 0);
  return next;
}

export function setTableRowHeight(table: TableElement, rowIndex: number, height: number): TableElement {
  const next = structuredClone(table);
  next.rows[rowIndex].height = Math.max(24, height);
  next.h = next.rows.reduce((sum, row) => sum + row.height, 0);
  return next;
}

export function styleTableCell(
  table: TableElement,
  address: CellAddress,
  options: { fill?: string; border?: string },
): TableElement {
  const next = structuredClone(table);
  const cell = next.rows[address.r]?.cells[address.c];
  if (!cell) return table;
  if (options.fill) cell.fill = { type: 'solid', color: options.fill };
  if (options.border) {
    const border: Stroke = { color: options.border, width: 1, dash: null };
    cell.borders = { l: border, r: border, t: border, b: border };
  }
  return next;
}

export function emptyTableRows(rows: number, columns: number, width: number, height: number): { rows: TableRow[]; colWidths: number[] } {
  const colWidth = width / columns;
  const rowHeight = height / rows;
  const cell = (): TableCell => ({
    colSpan: 1,
    rowSpan: 1,
    merged: false,
    fill: { type: 'solid', color: '#ffffff' },
    text: null,
    borders: { l: DEFAULT_BORDER, r: DEFAULT_BORDER, t: DEFAULT_BORDER, b: DEFAULT_BORDER },
  });
  return {
    colWidths: Array.from({ length: columns }, () => colWidth),
    rows: Array.from({ length: rows }, () => ({ height: rowHeight, cells: Array.from({ length: columns }, cell) })),
  };
}
