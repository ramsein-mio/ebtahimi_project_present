import { useState } from 'react';
import type { ChartType } from '../../editor/chart-model';
import { Icon } from '../../icons';

export function TableInsertDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (rows: number, columns: number) => void }) {
  const [rows, setRows] = useState(3);
  const [columns, setColumns] = useState(4);
  return (
    <div className="editor-dialog-backdrop" onPointerDown={onClose}>
      <section className="insert-dialog" role="dialog" aria-modal="true" aria-labelledby="table-dialog-title" onPointerDown={(event) => event.stopPropagation()}>
        <header><div><span><Icon name="table" /></span><div><h2 id="table-dialog-title">Insert table</h2><p>Choose the starting table size</p></div></div><button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="table-size-label"><strong>{rows} × {columns}</strong><span>{rows} rows, {columns} columns</span></div>
        <div className="table-size-grid" role="grid" aria-label="Table size">
          {Array.from({ length: 64 }, (_, index) => {
            const row = Math.floor(index / 8) + 1;
            const column = index % 8 + 1;
            return <button type="button" key={index} className={row <= rows && column <= columns ? 'active' : ''} onPointerEnter={() => { setRows(row); setColumns(column); }} onClick={() => onInsert(row, column)} aria-label={`${row} rows by ${column} columns`} />;
          })}
        </div>
        <div className="insert-dialog-fields">
          <label><span>Rows</span><input type="number" min="1" max="20" value={rows} onChange={(event) => setRows(Math.max(1, Math.min(20, Number(event.target.value))))} /></label>
          <label><span>Columns</span><input type="number" min="1" max="12" value={columns} onChange={(event) => setColumns(Math.max(1, Math.min(12, Number(event.target.value))))} /></label>
        </div>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="primary-button" onClick={() => onInsert(rows, columns)}><Icon name="table" size={17} /> Insert table</button></footer>
      </section>
    </div>
  );
}

const CHART_TYPES: Array<{ id: ChartType; label: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { id: 'bar', label: 'Bar', icon: 'chartBar' },
  { id: 'line', label: 'Line', icon: 'chartLine' },
  { id: 'pie', label: 'Pie', icon: 'chartPie' },
  { id: 'doughnut', label: 'Doughnut', icon: 'chartDonut' },
  { id: 'area', label: 'Area', icon: 'chartArea' },
];

export function ChartInsertDialog({ onClose, onInsert }: { onClose: () => void; onInsert: (type: ChartType) => void }) {
  const [type, setType] = useState<ChartType>('bar');
  return (
    <div className="editor-dialog-backdrop" onPointerDown={onClose}>
      <section className="insert-dialog chart-insert-dialog" role="dialog" aria-modal="true" aria-labelledby="chart-dialog-title" onPointerDown={(event) => event.stopPropagation()}>
        <header><div><span><Icon name="chart" /></span><div><h2 id="chart-dialog-title">Insert chart</h2><p>Start with editable sample data</p></div></div><button type="button" onClick={onClose} aria-label="Close"><Icon name="close" /></button></header>
        <div className="chart-type-grid">
          {CHART_TYPES.map((chart) => <button type="button" className={type === chart.id ? 'active' : ''} onClick={() => setType(chart.id)} key={chart.id}><Icon name={chart.icon} size={25} /><span>{chart.label}</span></button>)}
        </div>
        <footer><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button type="button" className="primary-button" onClick={() => onInsert(type)}><Icon name="chart" size={17} /> Insert chart</button></footer>
      </section>
    </div>
  );
}
