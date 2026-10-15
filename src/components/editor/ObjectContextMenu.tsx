import type { CSSProperties } from 'react';
import type { SlideElement } from '@web-ppt/core';
import { isChartElement } from '../../editor/chart-model';
import { Icon } from '../../icons';

interface ContextActions {
  duplicate: () => void;
  remove: () => void;
  front: () => void;
  back: () => void;
  centerHorizontally: () => void;
  centerVertically: () => void;
  properties: () => void;
  editText?: () => void;
  editTable?: () => void;
  addRow?: () => void;
  deleteRow?: () => void;
  addColumn?: () => void;
  deleteColumn?: () => void;
  editChart?: () => void;
  changeChartType?: () => void;
  replaceImage?: () => void;
  cropImage?: () => void;
}

function Item({ icon, label, action, shortcut, danger = false }: { icon: Parameters<typeof Icon>[0]['name']; label: string; action: () => void; shortcut?: string; danger?: boolean }) {
  return <button type="button" role="menuitem" className={danger ? 'danger' : undefined} onClick={action}><Icon name={icon} size={15} /><span>{label}</span>{shortcut && <kbd>{shortcut}</kbd>}</button>;
}

export function ObjectContextMenu({ x, y, element, actions, onClose }: { x: number; y: number; element: SlideElement; locked: boolean; canPaste: boolean; actions: ContextActions; onClose: () => void }) {
  const chart = isChartElement(element);
  const kind = chart ? 'chart' : element.kind === 'shape' && element.text ? 'text' : element.kind;
  const menuStyle: CSSProperties = {
    left: Math.max(8, Math.min(x, window.innerWidth - 248)),
    top: Math.max(8, Math.min(y, window.innerHeight - 430)),
  };
  const run = (action: () => void) => () => { action(); onClose(); };

  return (
    <div className="object-context-menu" role="menu" aria-label={`${kind} options`} style={menuStyle} onPointerDown={(event) => event.stopPropagation()} onContextMenu={(event) => event.preventDefault()}>
      <Item icon="duplicate" label="Duplicate" shortcut="Ctrl+D" action={run(actions.duplicate)} />
      <Item icon="trash" label="Delete" shortcut="Del" danger action={run(actions.remove)} />
      <div className="context-menu-divider" />
      <Item icon="bringFront" label="Bring to front" action={run(actions.front)} />
      <Item icon="sendBack" label="Send to back" action={run(actions.back)} />
      <div className="context-menu-divider" />
      <Item icon="alignCenter" label="Center horizontally" action={run(actions.centerHorizontally)} />
      <Item icon="alignMiddle" label="Center vertically" action={run(actions.centerVertically)} />
      {(kind === 'text' || kind === 'shape') && actions.editText && <><div className="context-menu-divider" /><Item icon="text" label={kind === 'text' ? 'Edit text' : 'Edit shape text'} action={run(actions.editText)} /></>}
      {kind === 'table' && <><div className="context-menu-divider" /><Item icon="table" label="Edit table" action={run(actions.editTable ?? actions.properties)} />{actions.addRow && <Item icon="rowAdd" label="Insert row" action={run(actions.addRow)} />}{actions.deleteRow && <Item icon="rowDelete" label="Delete row" action={run(actions.deleteRow)} />}{actions.addColumn && <Item icon="columnAdd" label="Insert column" action={run(actions.addColumn)} />}{actions.deleteColumn && <Item icon="columnDelete" label="Delete column" action={run(actions.deleteColumn)} />}</>}
      {chart && <><div className="context-menu-divider" /><Item icon="chart" label="Edit chart data" action={run(actions.editChart ?? actions.properties)} />{actions.changeChartType && <Item icon="chartBar" label="Change chart type" action={run(actions.changeChartType)} />}</>}
      {kind === 'image' && <><div className="context-menu-divider" />{actions.replaceImage && <Item icon="image" label="Replace image" action={run(actions.replaceImage)} />}{actions.cropImage && <Item icon="crop" label="Reset crop" action={run(actions.cropImage)} />}</>}
      <div className="context-menu-divider" />
      <Item icon="panel" label="Format options..." action={run(actions.properties)} />
    </div>
  );
}
