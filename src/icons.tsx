import type { ReactNode, SVGProps } from 'react';

type IconName =
  | 'home' | 'clock' | 'folder' | 'trash' | 'plus' | 'bell' | 'search' | 'more'
  | 'presentation' | 'code' | 'upload' | 'check' | 'arrow' | 'menu' | 'close'
  | 'save' | 'play' | 'undo' | 'redo' | 'text' | 'zoomIn' | 'zoomOut'
  | 'chevronRight' | 'chevronLeft' | 'chevronDown' | 'edit' | 'restore' | 'warning' | 'layers'
  | 'pointer' | 'image' | 'shape' | 'line' | 'duplicate' | 'note' | 'panel'
  | 'alignLeft' | 'alignCenter' | 'alignRight' | 'alignMiddle' | 'bringFront' | 'sendBack'
  | 'font' | 'table' | 'chart' | 'chartBar' | 'chartLine' | 'chartPie' | 'chartDonut' | 'chartArea'
  | 'rowAdd' | 'rowDelete' | 'columnAdd' | 'columnDelete' | 'cut' | 'copy' | 'paste'
  | 'lock' | 'unlock' | 'crop' | 'background' | 'fit' | 'layout' | 'properties';

const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  folder: <><path d="M3 6.5h6l2 2h10v10H3z"/><path d="M3 6.5v-2h7l2 2"/></>,
  trash: <><path d="M4 7h16"/><path d="m9 11 .5 6m5.5-6-.5 6"/><path d="m7 7 1 13h8l1-13M9 7V4h6v3"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 7h18s-3 0-3-7"/><path d="M10 20h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  presentation: <><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21l4-4 4 4M8 9h8M8 13h5"/></>,
  code: <><path d="m9 8-4 4 4 4m6-8 4 4-4 4M13 6l-2 12"/></>,
  upload: <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M5 15v5h14v-5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>,
  save: <><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
  play: <path d="m9 7 8 5-8 5z"/>,
  undo: <><path d="m9 7-5 5 5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/></>,
  redo: <><path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/></>,
  text: <><path d="M5 5h14M12 5v14M8 19h8"/></>,
  zoomIn: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M10 7v6M7 10h6"/></>,
  zoomOut: <><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5M7 10h6"/></>,
  chevronRight: <path d="m9 6 6 6-6 6"/>,
  chevronLeft: <path d="m15 6-6 6 6 6"/>,
  chevronDown: <path d="m6 9 6 6 6-6"/>,
  edit: <><path d="m4 20 4-1 10-10-3-3L5 16z"/><path d="m13 8 3 3"/></>,
  restore: <><path d="M4 12a8 8 0 1 0 3-6"/><path d="M4 4v6h6"/></>,
  warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
  layers: <><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
  pointer: <path d="m5 3 13 9-6 1 3 6-2.5 1.2-3-6L5 18z"/>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m4 17 5-5 4 4 2-2 5 5"/></>,
  shape: <><rect x="4" y="4" width="10" height="10" rx="2"/><circle cx="16" cy="16" r="5"/></>,
  line: <path d="M4 19 20 5"/>,
  duplicate: <><rect x="7" y="7" width="13" height="13" rx="2"/><path d="M4 16V4h12"/></>,
  note: <><path d="M5 3h14v18H5z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
  panel: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/></>,
  alignLeft: <path d="M5 6h14M5 10h9M5 14h14M5 18h8"/>,
  alignCenter: <path d="M5 6h14M8 10h8M5 14h14M8 18h8"/>,
  alignRight: <path d="M5 6h14M10 10h9M5 14h14M11 18h8"/>,
  alignMiddle: <path d="M6 5v14M10 8v8M14 5v14M18 8v8M3 12h18"/>,
  bringFront: <><rect x="8" y="4" width="11" height="11" rx="1"/><rect x="4" y="9" width="11" height="11" rx="1"/></>,
  sendBack: <><rect x="4" y="4" width="11" height="11" rx="1"/><rect x="9" y="9" width="11" height="11" rx="1"/></>,
  font: <><path d="M5 19 10 5h4l5 14M7 14h10"/><path d="M4 5h16"/></>,
  table: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 4v16M15 4v16M3 14h18"/></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  chartBar: <><path d="M4 20V10h4v10M10 20V4h4v16M16 20v-7h4v7M22 20H2"/></>,
  chartLine: <><path d="m3 17 5-6 4 3 7-9"/><circle cx="3" cy="17" r="1"/><circle cx="8" cy="11" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="19" cy="5" r="1"/></>,
  chartPie: <><path d="M12 3v9h9A9 9 0 1 1 12 3"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/></>,
  chartDonut: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M21 12h-5"/></>,
  chartArea: <><path d="m3 18 5-7 4 3 7-9v13z"/><path d="M3 20h18"/></>,
  rowAdd: <><rect x="3" y="5" width="13" height="14" rx="1"/><path d="M3 12h13M20 9v6M17 12h6"/></>,
  rowDelete: <><rect x="3" y="5" width="13" height="14" rx="1"/><path d="M3 12h13M17 12h6"/></>,
  columnAdd: <><rect x="5" y="3" width="14" height="13" rx="1"/><path d="M12 3v13M9 20h6M12 17v6"/></>,
  columnDelete: <><rect x="5" y="3" width="14" height="13" rx="1"/><path d="M12 3v13M9 20h6"/></>,
  cut: <><circle cx="6" cy="7" r="3"/><circle cx="6" cy="17" r="3"/><path d="m8.5 8.5 11 7.5M8.5 15.5 19.5 8"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
  paste: <><path d="M8 5h8v4H8z"/><path d="M6 7H4v14h16V7h-2"/></>,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
  unlock: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M16 10V7a4 4 0 0 0-7.5-2M12 14v3"/></>,
  crop: <path d="M7 3v14a2 2 0 0 0 2 2h12M3 7h14a2 2 0 0 1 2 2v12"/>,
  background: <><path d="m5 14 7-9 7 9-7 7z"/><path d="M3 21h18"/></>,
  fit: <><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6"/><path d="M8 12h8"/></>,
  layout: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M10 10v10"/></>,
  properties: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
};

export function Icon({ name, size = 20, ...props }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
