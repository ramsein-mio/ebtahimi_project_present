import type { Presentation, SlideElement, TextBody } from '@web-ppt/core';

export type FontLanguage = 'Persian' | 'English';
export type FontCategory = 'Sans Serif' | 'Serif' | 'Monospace' | 'Display' | 'Handwriting';

export interface FontEntry {
  family: string;
  language: FontLanguage;
  category: FontCategory;
  sample: string;
  source: 'local' | 'google-fonts';
  license: 'OFL-1.1' | 'System font';
}

const BUNDLED_FAMILIES = new Set(['Vazirmatn', 'IRANSansX', 'IRANSans', 'Inter', 'JetBrains Mono', 'MAD Social']);
const SYSTEM_FAMILIES = new Set(['Tahoma', 'Segoe UI', 'Arial', 'Georgia', 'Times New Roman']);

const PERSIAN_FAMILIES = [
  'Vazirmatn', 'IRANSansX', 'IRANSans', 'Tahoma', 'Rubik', 'Cairo', 'Tajawal', 'Noto Sans Arabic', 'Almarai', 'IBM Plex Sans Arabic', 'Noto Kufi Arabic',
  'Amiri', 'Noto Naskh Arabic', 'Readex Pro', 'Changa', 'Noto Nastaliq Urdu', 'El Messiri', 'Alexandria',
  'Lalezar', 'Fustat', 'Mada', 'Reem Kufi', 'Lemonada', 'Lateef', 'Aref Ruqaa', 'Markazi Text',
  'Rakkas', 'Baloo Bhaijaan 2', 'Scheherazade New', 'Cairo Play', 'Zain', 'Gulzar', 'Qahiri', 'Ruwudu',
  'Jomhuria', 'Alkalami', 'Mirza', 'Amiri Quran', 'Kufam', 'Harmattan', 'Alan Sans', 'Marhey', 'Badeen Display',
  'Handjet', 'Katibeh', 'Beiruti', 'Cascadia Code', 'Oi', 'Aref Ruqaa Ink', 'Playpen Sans Arabic',
  'Reem Kufi Fun', 'Vibes', 'Reem Kufi Ink', 'Cascadia Mono', 'Estedad', 'Alyamama', 'Blaka', 'Parastoo',
  'Blaka Hollow', 'Blaka Ink',
] as const;

const ENGLISH_FAMILIES = [
  'MAD Social', 'Segoe UI', 'Arial', 'Georgia', 'Times New Roman', 'Roboto', 'Open Sans', 'Google Sans', 'Inter', 'Montserrat', 'Poppins', 'Lato', 'Arimo', 'Roboto Condensed',
  'Roboto Mono', 'Oswald', 'DM Sans', 'Raleway', 'Playfair Display', 'Nunito', 'Nunito Sans', 'Roboto Slab',
  'Manrope', 'Ubuntu', 'Outfit', 'Merriweather', 'Kanit', 'Plus Jakarta Sans', 'Work Sans', 'Lora', 'Figtree',
  'Quicksand', 'Archivo Black', 'Bebas Neue', 'JetBrains Mono', 'PT Sans', 'Archivo', 'Mulish', 'Barlow',
  'Source Sans 3', 'IBM Plex Sans', 'Prompt', 'Jost', 'Saira', 'Black Ops One', 'Inconsolata', 'Space Grotesk',
  'Libre Baskerville', 'Fira Sans', 'Share Tech', 'Smooch Sans', 'Bricolage Grotesque', 'Karla',
  'Cormorant Garamond', 'Heebo', 'Titillium Web', 'PT Serif', 'Inter Tight', 'IBM Plex Mono', 'Barlow Condensed',
  'Josefin Sans', 'Source Code Pro', 'Anton', 'Dancing Script', 'Libre Franklin', 'EB Garamond',
  'Instrument Serif', 'Fraunces', 'Public Sans', 'Sora', 'Fjalla One', 'Changa One', 'Mukta', 'Assistant',
  'Rajdhani', 'Geist', 'Lobster Two', 'Schibsted Grotesk', 'Caveat', 'Bitter', 'Urbanist', 'Nanum Gothic',
  'Alfa Slab One', 'Merriweather Sans', 'Cabin', 'DM Serif Display', 'Lexend', 'Dosis', 'Source Serif 4',
  'Red Hat Display', 'Roboto Flex', 'Fredoka', 'Hind Siliguri', 'Instrument Sans', 'Newsreader',
  'M PLUS Rounded 1c', 'Oxygen', 'Google Sans Flex', 'Exo 2', 'Hind', 'Orbitron', 'Cinzel', 'Overpass',
  'Ramabhadra', 'Crimson Text',
] as const;

const SERIF = new Set([
  'Amiri', 'Noto Naskh Arabic', 'Noto Nastaliq Urdu', 'Lateef', 'Aref Ruqaa', 'Markazi Text',
  'Scheherazade New', 'Gulzar', 'Ruwudu', 'Alkalami', 'Mirza', 'Amiri Quran', 'Aref Ruqaa Ink', 'Alyamama',
  'Parastoo', 'Playfair Display', 'Roboto Slab', 'Merriweather', 'Lora', 'Libre Baskerville',
  'Cormorant Garamond', 'PT Serif', 'EB Garamond', 'Instrument Serif', 'Fraunces', 'Bitter',
  'DM Serif Display', 'Source Serif 4', 'Newsreader', 'Cinzel', 'Crimson Text',
]);

const MONOSPACE = new Set([
  'Cascadia Code', 'Cascadia Mono', 'Roboto Mono', 'JetBrains Mono', 'Inconsolata', 'IBM Plex Mono', 'Source Code Pro',
]);

const DISPLAY = new Set([
  'Lalezar', 'Lemonada', 'Rakkas', 'Baloo Bhaijaan 2', 'Jomhuria', 'Marhey', 'Badeen Display', 'Handjet',
  'Katibeh', 'Oi', 'Vibes', 'Blaka', 'Blaka Hollow', 'Blaka Ink', 'Archivo Black', 'Bebas Neue', 'Black Ops One',
  'Anton', 'Fjalla One', 'Changa One', 'Lobster Two', 'Alfa Slab One', 'Orbitron',
]);

const HANDWRITING = new Set(['Playpen Sans Arabic', 'Dancing Script', 'Caveat']);

function categoryFor(family: string): FontCategory {
  if (MONOSPACE.has(family)) return 'Monospace';
  if (SERIF.has(family)) return 'Serif';
  if (HANDWRITING.has(family)) return 'Handwriting';
  if (DISPLAY.has(family)) return 'Display';
  return 'Sans Serif';
}

function entry(family: string, language: FontLanguage): FontEntry {
  return {
    family,
    language,
    category: categoryFor(family),
    sample: language === 'Persian' ? 'پژوهش، چابکی و گفتگو' : 'The quick brown fox',
    source: BUNDLED_FAMILIES.has(family) || SYSTEM_FAMILIES.has(family) ? 'local' : 'google-fonts',
    license: SYSTEM_FAMILIES.has(family) ? 'System font' : 'OFL-1.1',
  };
}

export const FONT_CATALOG: FontEntry[] = [
  ...PERSIAN_FAMILIES.map((family) => entry(family, 'Persian')),
  ...ENGLISH_FAMILIES.map((family) => entry(family, 'English')),
];

export const FONT_CATALOG_COUNTS = {
  Persian: PERSIAN_FAMILIES.length,
  English: ENGLISH_FAMILIES.length,
  total: PERSIAN_FAMILIES.length + ENGLISH_FAMILIES.length,
} as const;

const fontPromises = new Map<string, Promise<boolean>>();

export function loadFontFamily(font: FontEntry): Promise<boolean> {
  const existing = fontPromises.get(font.family);
  if (existing) return existing;
  const promise = (async () => {
    if (font.source === 'google-fonts') {
      const id = `font-${font.family.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font.family)}&display=swap`;
        document.head.append(link);
        await new Promise<void>((resolve) => {
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
          window.setTimeout(resolve, 6000);
        });
      }
    }
    try {
      const result = await document.fonts.load(`16px "${font.family}"`, font.sample);
      return result.length > 0;
    } catch {
      return false;
    }
  })();
  fontPromises.set(font.family, promise);
  return promise;
}

export function fontEntry(family: string): FontEntry | undefined {
  return FONT_CATALOG.find((font) => font.family === family);
}

function bodyFonts(body: TextBody | null | undefined, families: Set<string>): void {
  body?.paragraphs.forEach((paragraph) => {
    paragraph.runs.forEach((run) => run.fonts.forEach((family) => families.add(family)));
  });
}

function elementFonts(element: SlideElement, families: Set<string>): void {
  if (element.kind === 'shape') bodyFonts(element.text, families);
  if (element.kind === 'group') element.children.forEach((child) => elementFonts(child, families));
  if (element.kind === 'table') {
    element.rows.forEach((row) => row.cells.forEach((cell) => bodyFonts(cell.text, families)));
  }
}

export function presentationFontFamilies(presentation: Presentation): string[] {
  const families = new Set<string>();
  presentation.slides.forEach((slide) => slide.elements.forEach((element) => elementFonts(element, families)));
  return [...families];
}

export function preloadPresentationFonts(presentation: Presentation): void {
  presentationFontFamilies(presentation).forEach((family) => {
    const font = fontEntry(family);
    if (font) void loadFontFamily(font);
  });
}

export function preloadBundledSourceFonts(): void {
  BUNDLED_FAMILIES.forEach((family) => {
    const font = fontEntry(family);
    if (font) void loadFontFamily(font);
  });
}
