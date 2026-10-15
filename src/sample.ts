import type { Fill, Presentation, ShapeElement, Slide, TextBody, TextRun } from '@web-ppt/core';

const WIDTH = 1280;
const HEIGHT = 720;

function run(text: string, size: number, color: string, options: Partial<TextRun> = {}): TextRun {
  return {
    text,
    b: false,
    i: false,
    u: false,
    strike: false,
    size,
    color,
    fonts: ['Vazirmatn', 'Arial'],
    ...options,
  };
}

function body(text: string, size: number, color: string, align: 'left' | 'center' | 'right' = 'right', bold = false): TextBody {
  return {
    anchor: 'middle',
    insets: [8, 10, 8, 10],
    wrap: true,
    fontScale: 1,
    paragraphs: text.split('\n').map((line) => ({
      align,
      lvl: 0,
      marL: 0,
      indent: 0,
      bullet: null,
      lineHeight: 1.85,
      spaceBefore: 0,
      spaceAfter: 0,
      rtl: true,
      runs: [run(line, size, color, { b: bold })],
    })),
  };
}

function rectangle(
  x: number,
  y: number,
  w: number,
  h: number,
  fill: Fill | null,
  radius = 0,
): ShapeElement {
  const path = radius
    ? `M ${radius} 0 H ${w - radius} Q ${w} 0 ${w} ${radius} V ${h - radius} Q ${w} ${h} ${w - radius} ${h} H ${radius} Q 0 ${h} 0 ${h - radius} V ${radius} Q 0 0 ${radius} 0 Z`
    : `M 0 0 H ${w} V ${h} H 0 Z`;
  return {
    kind: 'shape', x, y, w, h, rot: 0, flipH: false, flipV: false,
    path, fill, stroke: null, text: null,
  };
}

function textBox(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  size: number,
  color: string,
  align: 'left' | 'center' | 'right' = 'right',
  bold = false,
): ShapeElement {
  return {
    kind: 'shape', x, y, w, h, rot: 0, flipH: false, flipV: false,
    path: null, fill: null, stroke: null,
    text: body(text, size, color, align, bold),
  };
}

function coverSlide(): Slide {
  return {
    background: { type: 'solid', color: '#f5f1ff' },
    elements: [
      rectangle(0, 0, 1280, 14, { type: 'solid', color: '#7357ff' }),
      rectangle(82, 88, 1116, 544, { type: 'solid', color: '#ffffff' }, 30),
      rectangle(880, 88, 318, 544, { type: 'solid', color: '#17141d' }, 30),
      rectangle(942, 152, 194, 194, { type: 'solid', color: '#ff4bbb' }, 48),
      rectangle(992, 202, 194, 194, { type: 'solid', color: '#7658ff' }, 48),
      textBox(140, 166, 650, 128, 'ارائه‌ای که\nحرف تازه دارد', 54, '#17141d', 'right', true),
      textBox(140, 326, 600, 82, 'طراحی، روایت و داده؛ یک‌جا و آمادهٔ ارائه', 24, '#6a6572'),
      textBox(140, 506, 560, 52, 'استودیوی پردیس  •  پاییز ۱۴۰۵', 18, '#7658ff', 'right', true),
      textBox(920, 478, 220, 58, 'پردیس', 34, '#ffffff', 'center', true),
      textBox(920, 536, 220, 34, 'JSON → Presentation', 15, '#c9c0ff', 'center'),
    ],
  };
}

function statsSlide(): Slide {
  return {
    background: { type: 'solid', color: '#fffdf8' },
    elements: [
      textBox(92, 56, 650, 76, 'خلاصهٔ مسیر', 42, '#17141d', 'right', true),
      textBox(830, 68, 350, 46, 'از داده تا روایت بصری', 18, '#7b7581'),
      rectangle(92, 162, 1096, 2, { type: 'solid', color: '#ded9e4' }),
      rectangle(92, 214, 328, 326, { type: 'solid', color: '#e6dcff' }, 24),
      rectangle(476, 214, 328, 326, { type: 'solid', color: '#d9f6ea' }, 24),
      rectangle(860, 214, 328, 326, { type: 'solid', color: '#ffe2d5' }, 24),
      textBox(122, 256, 268, 70, '۰۱', 46, '#7357ff', 'right', true),
      textBox(122, 338, 268, 64, 'ورودی معتبر', 27, '#17141d', 'right', true),
      textBox(122, 410, 250, 74, 'ساختار Presentation واقعی و قابل اعتبارسنجی', 17, '#655e6a'),
      textBox(506, 256, 268, 70, '۰۲', 46, '#00865f', 'right', true),
      textBox(506, 338, 268, 64, 'رندر دقیق', 27, '#17141d', 'right', true),
      textBox(506, 410, 250, 74, 'تبدیل هر اسلاید به SVG درون مرورگر', 17, '#655e6a'),
      textBox(890, 256, 268, 70, '۰۳', 46, '#ed6633', 'right', true),
      textBox(890, 338, 268, 64, 'ویرایش ماندگار', 27, '#17141d', 'right', true),
      textBox(890, 410, 250, 74, 'ثبت تغییر در مدل و ذخیرهٔ محلی', 17, '#655e6a'),
      textBox(92, 598, 1096, 50, 'هر تغییر، بخشی از دادهٔ ارائه است؛ نه یک لایهٔ نمایشی موقت.', 21, '#17141d', 'center', true),
    ],
  };
}

function quoteSlide(): Slide {
  return {
    background: { type: 'solid', color: '#17141d' },
    elements: [
      rectangle(72, 68, 1136, 584, { type: 'solid', color: '#23202a' }, 32),
      textBox(104, 92, 180, 110, '”', 104, '#ff4bbb', 'right', true),
      textBox(178, 194, 918, 220, 'یک ارائهٔ خوب، داده را\nبه تصمیم تبدیل می‌کند.', 48, '#ffffff', 'center', true),
      rectangle(470, 466, 340, 4, { type: 'solid', color: '#7357ff' }),
      textBox(360, 498, 560, 52, 'پایان نمونه — حالا متن را ویرایش کنید', 19, '#c8c2cf', 'center'),
    ],
  };
}

export function createSamplePresentation(): Presentation {
  return {
    width: WIDTH,
    height: HEIGHT,
    source: 'ppt',
    slides: [coverSlide(), statsSlide(), quoteSlide()],
  };
}

export function sampleJson(): string {
  return JSON.stringify({
    presentation: {
      title: 'هوش مصنوعی و آیندهٔ کار',
      subtitle: 'نمونهٔ قرارداد JSON مرجع',
    },
    slides: [
      {
        id: 'cover',
        order: 1,
        section: 'Introduction',
        layout: 'title',
        title: 'هوش مصنوعی و ==آیندهٔ کار==',
        subtitle: 'از اتوماسیون وظایف تا بازطراحی نقش‌های انسانی',
        body: {
          lead: 'یک ارائهٔ کامل که مستقیماً از JSON مرجع ساخته می‌شود.',
          emphasis: '==!دادهٔ ساخت‌یافته!== به اسلاید قابل‌ویرایش تبدیل می‌شود.',
        },
      },
      {
        id: 'capabilities',
        order: 2,
        section: 'Core Concept',
        layout: 'content',
        title: 'اجزای اصلی تحول',
        subtitle: 'ترکیب فناوری، مهارت و طراحی سازمان',
        body: {
          lead: { text: 'هوش مصنوعی جای یک شغل کامل را نمی‌گیرد؛ **ترکیب وظایف** را تغییر می‌دهد.', details: 'جزئیات این خط در speaker notes همان اسلاید ذخیره می‌شود.' },
          bullets: [
            'خودکارسازی کارهای تکراری و قابل‌پیش‌بینی',
            'تقویت تصمیم‌گیری با تحلیل سریع‌تر داده',
            { text: 'افزایش اهمیت ==مهارت‌های انسانی==', details: 'همدلی، قضاوت، مذاکره و خلاقیت از نمونه‌های مهم‌اند.' },
          ],
          emphasis: 'مزیت پایدار از همکاری انسان و ماشین شکل می‌گیرد.',
        },
        visual: {
          type: 'icon-list',
          data: {
            items: [
              { icon: '⚙️', label: 'اتوماسیون', description: 'کاهش کارهای تکراری' },
              { icon: '📊', label: 'تحلیل', description: 'تصمیم‌گیری مبتنی بر داده' },
              { icon: '🧠', label: 'خلاقیت', description: 'تمرکز انسان بر مسئله‌های پیچیده' },
              { icon: '🤝', label: 'همکاری', description: 'تقسیم هوشمند کار میان انسان و ماشین' },
            ],
          },
          caption: 'چهار نیروی مکمل در محیط کار آینده',
        },
      },
      {
        id: 'adoption',
        order: 3,
        section: 'Deep Dive',
        layout: 'content',
        title: 'آمادگی واحدها برای پذیرش AI',
        body: {
          lead: 'فاصلهٔ آمادگی میان تیم‌ها یکسان نیست.',
          bullets: ['فناوری معمولاً سریع‌تر از فرایند و فرهنگ تغییر می‌کند.', 'آموزش باید همراه با بازطراحی گردش کار باشد.'],
          emphasis: 'سرمایه‌گذاری روی مهارت، شرط استفادهٔ مؤثر از ابزار است.',
        },
        visual: {
          type: 'bar-chart',
          data: {
            yAxisLabel: 'درصد آمادگی',
            series: [{
              name: 'آمادگی',
              values: [
                { label: 'فناوری', value: 82 },
                { label: 'فرایند', value: 64 },
                { label: 'مهارت', value: 57 },
                { label: 'فرهنگ', value: 48 },
              ],
            }],
          },
          caption: 'اعداد نمونه‌اند و فقط ساختار نمودار را نشان می‌دهند.',
        },
      },
      {
        id: 'time',
        order: 4,
        section: 'Example',
        layout: 'content',
        title: 'ترکیب زمان در یک نقش بازطراحی‌شده',
        body: {
          lead: 'زمان آزادشده از اتوماسیون می‌تواند به کارهای باارزش‌تر منتقل شود.',
          bullets: ['تحلیل و تصمیم‌سازی', 'تعامل با مشتری', 'یادگیری و نوآوری'],
        },
        visual: {
          type: 'pie-chart',
          data: {
            slices: [
              { label: 'تحلیل', value: 35 },
              { label: 'تعامل', value: 30 },
              { label: 'نوآوری', value: 20 },
              { label: 'عملیات', value: 15 },
            ],
          },
          caption: 'یک سناریوی نمونه برای توزیع زمان',
        },
      },
      {
        id: 'comparison',
        order: 5,
        section: 'Synthesis',
        layout: 'content',
        title: 'مقایسهٔ دو رویکرد پیاده‌سازی',
        body: {
          lead: 'انتخاب رویکرد، کیفیت پذیرش و سرعت یادگیری را تعیین می‌کند.',
          emphasis: 'شروع کوچک، سنجش‌پذیر و مبتنی بر بازخورد معمولاً پایدارتر است.',
        },
        visual: {
          type: 'comparison-grid',
          data: {
            columns: ['رویکرد ابزارمحور', 'رویکرد مسئله‌محور'],
            rows: [
              ['شروع::خرید ابزار', 'شروع::تعریف مسئله'],
              ['معیار::تعداد کاربران', 'معیار::اثر قابل‌اندازه‌گیری'],
              ['یادگیری::پس از استقرار', 'یادگیری::در چرخه‌های کوتاه'],
            ],
          },
          caption: 'مقایسهٔ ساختاری دو مسیر رایج',
        },
      },
      {
        id: 'roadmap',
        order: 6,
        section: 'Conclusion',
        layout: 'content',
        title: 'نقشهٔ راه پیشنهادی',
        body: {
          lead: 'حرکت مرحله‌ای، ریسک را کم و ظرفیت سازمان را زیاد می‌کند.',
          bullets: ['انتخاب یک مسئلهٔ محدود', 'ساخت نمونه و اندازه‌گیری', 'استانداردسازی تجربهٔ موفق'],
        },
        visual: {
          type: 'table',
          data: {
            headers: ['مرحله', 'خروجی', 'معیار موفقیت'],
            rows: [
              ['کشف', 'مسئلهٔ اولویت‌دار', 'خط مبنای روشن'],
              ['آزمایش', 'نمونهٔ قابل‌استفاده', 'بهبود سنجهٔ هدف'],
              ['گسترش', 'الگوی تکرارپذیر', 'پذیرش پایدار'],
            ],
          },
          caption: 'از کشف مسئله تا گسترش کنترل‌شده',
        },
      },
    ],
  }, null, 2);
}
