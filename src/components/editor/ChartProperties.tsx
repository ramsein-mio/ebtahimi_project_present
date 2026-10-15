import { useEffect, useRef, useState } from 'react';
import type { ChartData, ChartType } from '../../editor/chart-model';
import { Icon } from '../../icons';

const TYPES: Array<{ value: ChartType; label: string }> = [
  { value: 'bar', label: 'Bar' }, { value: 'line', label: 'Line' }, { value: 'pie', label: 'Pie' },
  { value: 'doughnut', label: 'Doughnut' }, { value: 'area', label: 'Area' },
];

export function ChartProperties({ data, onChange }: { data: ChartData; onChange: (data: ChartData) => void }) {
  const [draft, setDraft] = useState(data);
  const timer = useRef<number | null>(null);

  useEffect(() => setDraft(data), [data]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const update = (next: ChartData, immediate = false) => {
    setDraft(next);
    if (timer.current) window.clearTimeout(timer.current);
    if (immediate) onChange(next);
    else timer.current = window.setTimeout(() => onChange(next), 320);
  };

  const updateLabel = (index: number, value: string) => {
    const next = structuredClone(draft);
    next.labels[index] = value;
    update(next);
  };
  const updateSeries = (seriesIndex: number, field: 'name' | 'color', value: string) => {
    const next = structuredClone(draft);
    next.series[seriesIndex][field] = value;
    update(next, field === 'color');
  };
  const updateValue = (seriesIndex: number, valueIndex: number, value: number) => {
    const next = structuredClone(draft);
    next.series[seriesIndex].values[valueIndex] = value;
    update(next);
  };

  return (
    <>
      <section className="property-group">
        <h3>Chart</h3>
        <label className="property-select-field"><span>Type</span><select value={draft.type} onChange={(event) => update({ ...draft, type: event.target.value as ChartType }, true)}>{TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
        <label className="chart-title-field"><span>Title</span><input value={draft.title} onChange={(event) => update({ ...draft, title: event.target.value })} /></label>
        <label className="chart-checkbox"><input type="checkbox" checked={draft.showLegend} onChange={(event) => update({ ...draft, showLegend: event.target.checked }, true)} /><span>Show legend</span></label>
      </section>
      <section className="property-group chart-data-section">
        <div className="property-group-title"><h3>Chart data</h3><span>{draft.labels.length} points</span></div>
        <div className="chart-data-grid" style={{ gridTemplateColumns: `112px repeat(${draft.labels.length}, 72px)` }}>
          <span className="chart-grid-corner">Series</span>
          {draft.labels.map((label, index) => <input key={`label-${index}`} value={label} onChange={(event) => updateLabel(index, event.target.value)} aria-label={`Label ${index + 1}`} />)}
          {draft.series.flatMap((series, seriesIndex) => [
            <label className="chart-series-name" key={`name-${seriesIndex}`}><input type="color" value={series.color} onChange={(event) => updateSeries(seriesIndex, 'color', event.target.value)} aria-label={`${series.name} color`} /><input value={series.name} onChange={(event) => updateSeries(seriesIndex, 'name', event.target.value)} aria-label={`Series ${seriesIndex + 1} name`} /></label>,
            ...draft.labels.map((_label, valueIndex) => <input type="number" key={`${seriesIndex}-${valueIndex}`} value={series.values[valueIndex] ?? 0} onChange={(event) => updateValue(seriesIndex, valueIndex, Number(event.target.value))} aria-label={`${series.name}, ${draft.labels[valueIndex]}`} />),
          ])}
        </div>
        <div className="chart-data-actions">
          <button type="button" onClick={() => {
            const next = structuredClone(draft); next.labels.push(`Item ${next.labels.length + 1}`); next.series.forEach((series) => series.values.push(0)); update(next, true);
          }}><Icon name="plus" size={15} /> Add point</button>
          <button type="button" disabled={draft.labels.length <= 1} onClick={() => {
            const next = structuredClone(draft); next.labels.pop(); next.series.forEach((series) => series.values.pop()); update(next, true);
          }}><Icon name="trash" size={15} /> Remove point</button>
          <button type="button" onClick={() => {
            const next = structuredClone(draft); next.series.push({ name: `Series ${next.series.length + 1}`, color: ['#24b889', '#ff9f43', '#3d78e8'][next.series.length % 3], values: next.labels.map(() => 0) }); update(next, true);
          }}><Icon name="plus" size={15} /> Add series</button>
        </div>
      </section>
    </>
  );
}
