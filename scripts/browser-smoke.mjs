import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:5173';
const DEBUG_PORT = 9223;
const profile = mkdtempSync(join(tmpdir(), 'pardis-chrome-'));
const chrome = spawn('google-chrome', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  `--remote-debugging-port=${DEBUG_PORT}`,
  `--user-data-dir=${profile}`,
  '--window-size=1440,1000',
  `${APP_URL}/#new`,
], { stdio: 'ignore' });

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry(callback, timeout = 10_000) {
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeout) {
    try { return await callback(); } catch (error) { lastError = error; await pause(120); }
  }
  throw lastError ?? new Error('مهلت انتظار تمام شد');
}

async function main() {
  await retry(async () => {
    const response = await fetch(`${APP_URL}/`);
    if (!response.ok) throw new Error(`App HTTP ${response.status}`);
  });

  const targets = await retry(async () => {
    const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
    if (!response.ok) throw new Error('Chrome هنوز آماده نیست');
    return response.json();
  });
  const target = targets.find((item) => item.type === 'page');
  if (!target?.webSocketDebuggerUrl) throw new Error('صفحهٔ Chrome پیدا نشد');

  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });

  let serial = 0;
  const pending = new Map();
  const runtimeEvents = [];
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === 'Runtime.exceptionThrown' || message.method === 'Runtime.consoleAPICalled') {
      runtimeEvents.push(message.params);
    }
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'خطای Runtime.evaluate');
    return result.result.value;
  };
  const waitFor = (selector) => retry(async () => {
    const found = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
    if (!found) throw new Error(`منتظر ${selector}`);
  });

  await send('Page.enable');
  await send('Runtime.enable');
  await waitFor('.generate-button');
  await evaluate(`document.querySelector('.generate-button').click()`);
  await waitFor('.editor-shell');
  await waitFor('.element-frame[aria-label="Select Text box"]');
  await evaluate(`document.querySelector('.element-frame[aria-label="Select Text box"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 400 }))`);
  await evaluate(`window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 400 }))`);
  await waitFor('.property-grid-four input');

  const initialX = await evaluate(`Number(document.querySelector('.property-grid-four input').value)`);
  const dragPoint = await evaluate(`(() => {
    const element = document.querySelector('.element-frame[aria-label="Select Text box"]');
    const rect = element.getBoundingClientRect();
    const point = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    element.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: point.x, clientY: point.y, buttons: 1 }));
    return point;
  })()`);
  await pause(100);
  await evaluate(`window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: ${dragPoint.x + 28}, clientY: ${dragPoint.y + 12}, buttons: 1 }))`);
  await evaluate(`window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: ${dragPoint.x + 28}, clientY: ${dragPoint.y + 12} }))`);
  const movedX = await retry(async () => {
    const value = await evaluate(`Number(document.querySelector('.property-grid-four input').value)`);
    if (!(value > initialX)) throw new Error('Object drag did not update its document position');
    return value;
  });

  const editedText = 'عنوان ویرایش‌شده در آزمون مرورگر';
  await evaluate(`document.querySelector('.element-frame[aria-label="Select Text box"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
  await waitFor('.inline-text-editor');
  await evaluate(`(() => {
    const field = document.querySelector('.inline-text-editor');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(field, ${JSON.stringify(editedText)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.focus();
    field.blur();
  })()`);
  await retry(async () => {
    const editing = await evaluate(`Boolean(document.querySelector('.inline-text-editor'))`);
    if (editing) throw new Error('ویرایش درجا هنوز بسته نشده است');
  });
  const notes = 'Notes persisted by the browser workflow';
  await evaluate(`(() => {
    const field = document.querySelector('.speaker-notes textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(field, ${JSON.stringify(notes)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('blur', { bubbles: true }));
  })()`);
  const beforeSlides = await evaluate(`document.querySelectorAll('.slide-thumbnail-row').length`);
  const duplicateControl = await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('button[aria-label="Duplicate slide"]')];
    buttons[0]?.click();
    return { count: buttons.length, disabled: buttons[0]?.disabled ?? null, html: buttons[0]?.outerHTML ?? null };
  })()`);
  if (!duplicateControl.count || duplicateControl.disabled) {
    throw new Error(`Duplicate control unavailable: ${JSON.stringify(duplicateControl)}`);
  }
  await retry(async () => {
    const count = await evaluate(`document.querySelectorAll('.slide-thumbnail-row').length`);
    if (count !== beforeSlides + 1) {
      const diagnostic = await evaluate(`({ count: document.querySelectorAll('.slide-thumbnail-row').length, toast: document.querySelector('.editor-toast')?.textContent ?? null })`);
      throw new Error(`Slide duplication did not update the navigator: ${JSON.stringify({ diagnostic, duplicateControl, runtimeEvents })}`);
    }
  });
  await evaluate(`document.querySelector('.save-button').click()`);
  await evaluate(`document.querySelector('.editor-back').click()`);
  await waitFor('.presentation-preview');
  await evaluate(`document.querySelector('.presentation-preview').click()`);
  await waitFor('.editor-shell');
  await evaluate(`document.querySelector('.element-frame[aria-label="Select Text box"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 500, clientY: 400 }))`);
  await evaluate(`window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: 500, clientY: 400 }))`);
  await waitFor('.property-grid-four input');
  await evaluate(`document.querySelector('.element-frame[aria-label="Select Text box"]').dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))`);
  await waitFor('.inline-text-editor');

  const reopened = await evaluate(`document.querySelector('.inline-text-editor').value`);
  if (reopened !== editedText) {
    throw new Error(`متن بازگشایی‌شده نادرست است: ${JSON.stringify(reopened)}`);
  }
  const reopenedNotes = await evaluate(`document.querySelector('.speaker-notes textarea').value`);
  if (reopenedNotes !== notes) {
    throw new Error(`Speaker notes did not persist: ${JSON.stringify(reopenedNotes)}`);
  }
  const reopenedSlides = await evaluate(`document.querySelectorAll('.slide-thumbnail-row').length`);
  if (reopenedSlides !== beforeSlides + 1) {
    throw new Error(`Slide count did not persist: ${reopenedSlides}`);
  }
  const reopenedX = await evaluate(`Number(document.querySelector('.property-grid-four input').value)`);
  if (reopenedX !== movedX) {
    throw new Error(`Object position did not persist: expected ${movedX}, received ${reopenedX}`);
  }

  await evaluate(`document.querySelector('.inline-text-editor')?.blur()`);
  await evaluate(`document.querySelectorAll('.slide-thumbnail')[2].click()`);
  await evaluate(`document.querySelector('.header-present-button').click()`);
  await waitFor('.present-line-layer');
  const presentationLines = await evaluate(`({
    total: document.querySelectorAll('.present-line-hitbox').length,
    withDetails: document.querySelectorAll('.present-line-hitbox.has-details').length,
  })`);
  if (presentationLines.total !== 5 || presentationLines.withDetails !== 2) {
    throw new Error(`Presentation line targets are incorrect: ${JSON.stringify(presentationLines)}`);
  }
  const linePoint = await evaluate(`(() => {
    const rect = document.querySelector('.present-line-hitbox.has-details').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: linePoint.x, y: linePoint.y });
  await pause(180);
  const hoveredLineStyle = await evaluate(`(() => {
    const stage = document.querySelector('.present-stage');
    const base = stage?.querySelector(':scope > .slide-svg');
    const focus = stage?.querySelector('.present-focused-line');
    return {
      focusMode: stage?.classList.contains('focus-mode'),
      baseOpacity: base ? Number(getComputedStyle(base).opacity) : 1,
      transform: focus ? getComputedStyle(focus).transform : 'none',
    };
  })()`);
  if (!hoveredLineStyle.focusMode || hoveredLineStyle.baseOpacity >= 0.5 || hoveredLineStyle.transform === 'none') {
    throw new Error(`Presentation line did not receive hover focus: ${JSON.stringify(hoveredLineStyle)}`);
  }
  await evaluate(`document.querySelector('.present-line-hitbox.has-details').click()`);
  await waitFor('.present-details-dialog');
  const detailsDialog = await evaluate(`({
    title: document.querySelector('.present-details-dialog h2')?.textContent?.replace('؟', '').trim(),
    content: document.querySelector('.present-details-content')?.textContent?.trim(),
    direction: getComputedStyle(document.querySelector('.present-details-dialog')).direction,
  })`);
  if (!detailsDialog.title || !detailsDialog.content?.includes('speaker notes') || detailsDialog.direction !== 'rtl') {
    throw new Error(`More-details dialog is incorrect: ${JSON.stringify(detailsDialog)}`);
  }
  await evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  await retry(async () => {
    const state = await evaluate(`({ dialog: Boolean(document.querySelector('.present-details-dialog')), present: Boolean(document.querySelector('.present-mode')) })`);
    if (state.dialog || !state.present) throw new Error(`Escape did not close only the dialog: ${JSON.stringify(state)}`);
  });
  const fontStatus = await evaluate(`Promise.all([
    document.fonts.load('16px Vazirmatn', 'سلام').then((faces) => faces.length),
    document.fonts.load('16px Inter', 'Presentation').then((faces) => faces.length),
    document.fonts.load('16px "JetBrains Mono"', 'JSON').then((faces) => faces.length),
    document.fonts.load('16px "MAD Social"', 'Showreel').then((faces) => faces.length),
    document.fonts.load('16px IRANSansX', 'سلام').then((faces) => faces.length),
    document.fonts.load('16px IRANSans', 'سلام').then((faces) => faces.length),
  ]).then(([vazirmatn, inter, jetbrains, madSocial, iranSansX, iranSans]) => ({ vazirmatn, inter, jetbrains, madSocial, iranSansX, iranSans }))`);
  if (Object.values(fontStatus).some((loaded) => loaded < 1)) {
    throw new Error(`Bundled source fonts are unavailable: ${JSON.stringify(fontStatus)}`);
  }
  const presentationScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync('/tmp/pardis-present-interactions.png', Buffer.from(presentationScreenshot.data, 'base64'));
  await evaluate(`document.querySelector('.present-close').click()`);
  await retry(async () => {
    if (await evaluate(`Boolean(document.querySelector('.present-mode'))`)) throw new Error('Presentation mode is still open');
  });
  await evaluate(`document.querySelectorAll('.slide-thumbnail')[3].click()`);
  await evaluate(`document.querySelector('.header-present-button').click()`);
  await waitFor('.present-stage svg');
  const visibleChart = await evaluate(`(() => {
    const paths = [...document.querySelectorAll('.present-stage svg path')];
    const colored = paths.filter((path) => path.getAttribute('fill') === '#3b82f6');
    return { pathCount: paths.length, colored: colored.length, boxes: colored.map((path) => {
      const box = path.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }) };
  })()`);
  if (!visibleChart.colored || !visibleChart.boxes.some((box) => box.width > 2 && box.height > 2)) {
    throw new Error(`Reference chart is not visibly rendered: ${JSON.stringify(visibleChart)}`);
  }
  await evaluate(`document.querySelector('.present-close').click()`);
  await evaluate(`document.querySelectorAll('.slide-thumbnail')[4].click()`);
  await evaluate(`document.querySelector('.header-present-button').click()`);
  await waitFor('.present-stage svg');
  const visiblePie = await evaluate(`(() => {
    const paths = [...document.querySelectorAll('.present-stage svg path')];
    const colored = paths.filter((path) => ['#3b82f6', '#f97316', '#22c55e', '#a855f7'].includes(path.getAttribute('fill')));
    return { colored: colored.length, boxes: colored.map((path) => {
      const box = path.getBoundingClientRect();
      return { width: box.width, height: box.height };
    }) };
  })()`);
  if (visiblePie.colored < 4 || !visiblePie.boxes.some((box) => box.width > 40 && box.height > 40)) {
    throw new Error(`Reference pie chart is not visibly rendered: ${JSON.stringify(visiblePie)}`);
  }
  await evaluate(`document.querySelector('.present-close').click()`);
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync('/tmp/pardis-editor-e2e.png', Buffer.from(screenshot.data, 'base64'));
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await pause(250);
  const mobileOverflow = await evaluate(`document.documentElement.scrollWidth - window.innerWidth`);
  if (mobileOverflow > 1) throw new Error(`Mobile layout overflows by ${mobileOverflow}px`);
  const mobileScreenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync('/tmp/pardis-editor-mobile-e2e.png', Buffer.from(mobileScreenshot.data, 'base64'));
  console.log(JSON.stringify({
    ok: true,
    workflow: 'JSON → generate → edit text and notes → duplicate slide → save → dashboard → reopen',
    reopenedText: reopened,
    reopenedNotes,
    reopenedSlides,
    reopenedObjectX: reopenedX,
    presentationLines,
    detailsDialog,
    fontStatus,
    visibleChart,
    visiblePie,
    presentationScreenshot: '/tmp/pardis-present-interactions.png',
    screenshot: '/tmp/pardis-editor-e2e.png',
    mobileScreenshot: '/tmp/pardis-editor-mobile-e2e.png',
  }, null, 2));
  socket.close();
}

try {
  await main();
} finally {
  chrome.kill('SIGTERM');
}
