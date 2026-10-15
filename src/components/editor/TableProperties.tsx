import type { TableElement } from '@web-ppt/core';
import type { RunPropertyOverrides } from '@web-ppt/edit-core';
import { tableCellText, type CellAddress } from '../../editor/table-model';
import { Icon } from '../../icons';

export function TableProperties({
  table,
  cell,
  revision,
  onCell,
  onText,
  onAddRow,
  onDeleteRow,
  onAddColumn,
  onDeleteColumn,
  onColumnWidth,
  onRowHeight,
  onCellStyle,
  onCellFormat,
  onCellAlign,
}: {
  table: TableElement;
  cell: CellAddress;
  revision: number;
  onCell: (address: CellAddress) => void;
  onText: (address: CellAddress, value: string) => void;
  onAddRow: () => void;
  onDeleteRow: () => void;
  onAddColumn: () => void;
  onDeleteColumn: () => void;
  onColumnWidth: (column: number, value: number) => void;
  onRowHeight: (row: number, value: number) => void;
  onCellStyle: (style: { fill?: string; border?: string }) => void;
  onCellFormat: (props: RunPropertyOverrides) => void;
  onCellAlign: (align: 'left' | 'center' | 'right') => void;
}) {
  const current = table.rows[cell.r]?.cells[cell.c];
  const fill = current?.fill?.type === 'solid' && /^#[0-9a-f]{6}$/i.test(current.fill.color) ? current.fill.color : '#ffffff';
  const border = current?.borders?.l?.color && /^#[0-9a-f]{6}$/i.test(current.borders.l.color) ? current.borders.l.color : '#d8d2e0';
  return (
    <>
      <section className="property-group table-editor-group">
        <div className="property-group-title"><h3>Table data</h3><span>{table.rows.length} × {table.colWidths.length}</span></div>
        <div className="table-data-grid" style={{ gridTemplateColumns: `repeat(${table.colWidths.length}, minmax(70px, 1fr))` }}>
          {table.rows.flatMap((row, r) => row.cells.map((_tableCell, c) => (
            <input
              key={`${revision}-${r}-${c}`}
              className={cell.r === r && cell.c === c ? 'active' : ''}
              defaultValue={tableCellText(table, { r, c })}
              dir="auto"
              aria-label={`Row ${r + 1}, column ${c + 1}`}
              onFocus={() => onCell({ r, c })}
              onBlur={(event) => onText({ r, c }, event.target.value)}
            />
          )))}
        </div>
      </section>
      <section className="property-group">
        <h3>Rows &amp; columns</h3>
        <div className="table-action-grid">
          <button type="button" onClick={onAddRow}><Icon name="rowAdd" size={16} /> Add row</button>
          <button type="button" onClick={onDeleteRow} disabled={table.rows.length <= 1}><Icon name="rowDelete" size={16} /> Delete row</button>
          <button type="button" onClick={onAddColumn}><Icon name="columnAdd" size={16} /> Add column</button>
          <button type="button" onClick={onDeleteColumn} disabled={table.colWidths.length <= 1}><Icon name="columnDelete" size={16} /> Delete column</button>
        </div>
        <div className="property-grid property-grid-two table-size-fields">
          <label><span>Column width</span><input type="number" min="32" value={Math.round(table.colWidths[cell.c] ?? 80)} onChange={(event) => onColumnWidth(cell.c, Number(event.target.value))} /></label>
          <label><span>Row height</span><input type="number" min="24" value={Math.round(table.rows[cell.r]?.height ?? 40)} onChange={(event) => onRowHeight(cell.r, Number(event.target.value))} /></label>
        </div>
      </section>
      <section className="property-group">
        <h3>Selected cell</h3>
        <div className="property-format-row">
          <button type="button" onClick={() => onCellFormat({ b: true })} aria-label="Bold"><b>B</b></button>
          <button type="button" onClick={() => onCellFormat({ i: true })} aria-label="Italic"><i>I</i></button>
          <button type="button" onClick={() => onCellAlign('left')} aria-label="Align left"><Icon name="alignLeft" size={16} /></button>
          <button type="button" onClick={() => onCellAlign('center')} aria-label="Align center"><Icon name="alignCenter" size={16} /></button>
          <button type="button" onClick={() => onCellAlign('right')} aria-label="Align right"><Icon name="alignRight" size={16} /></button>
        </div>
        <div className="property-grid property-grid-two table-cell-colors">
          <label className="property-color-field"><span>Background</span><input type="color" value={fill} onChange={(event) => onCellStyle({ fill: event.target.value })} /></label>
          <label className="property-color-field"><span>Borders</span><input type="color" value={border} onChange={(event) => onCellStyle({ border: event.target.value })} /></label>
        </div>
      </section>
    </>
  );
}
