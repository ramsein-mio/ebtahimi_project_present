type YamlLine = { number: number; indent: number; text: string; raw: string };

function fail(line: number, message: string): never {
  throw new Error(`YAML: خط ${line}: ${message}`);
}

function stripComment(input: string): string {
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quote = null;
      continue;
    }
    if (quote === "'") {
      if (char === "'" && input[i + 1] === "'") { i += 1; continue; }
      if (char === "'") quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') depth -= 1;
    if (char === '#' && depth === 0 && (i === 0 || /\s/.test(input[i - 1]))) return input.slice(0, i).trimEnd();
  }
  return input.trimEnd();
}

function splitTopLevel(input: string, separator: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quote = null;
      continue;
    }
    if (quote === "'") {
      if (char === "'" && input[i + 1] === "'") { i += 1; continue; }
      if (char === "'") quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') depth -= 1;
    if (char === separator && depth === 0) {
      parts.push(input.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(input.slice(start).trim());
  return parts;
}

function findColon(input: string): number {
  const parts = splitTopLevel(input, ':');
  if (parts.length < 2) return -1;
  // A mapping colon is the first top-level colon, including when later values contain colons.
  let quote: "'" | '"' | null = null;
  let escaped = false;
  let depth = 0;
  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (quote === '"') {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quote = null;
      continue;
    }
    if (quote === "'") {
      if (char === "'" && input[i + 1] === "'") { i += 1; continue; }
      if (char === "'") quote = null;
      continue;
    }
    if (char === '"' || char === "'") { quote = char; continue; }
    if (char === '[' || char === '{') depth += 1;
    if (char === ']' || char === '}') depth -= 1;
    if (char === ':' && depth === 0 && (i + 1 === input.length || /\s/.test(input[i + 1]))) return i;
  }
  return -1;
}

function parseScalar(raw: string, line: number): unknown {
  const value = raw.trim();
  if (!value) return null;
  if (/^(?:&|\*|!)/.test(value) || value === '<<') fail(line, 'anchor، alias، tag و merge key پشتیبانی نمی‌شوند.');
  if (value.startsWith('"')) {
    try { return JSON.parse(value) as unknown; }
    catch { return fail(line, 'رشتهٔ دابل‌کوتیشن معتبر نیست.'); }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'") || value.length < 2) fail(line, 'رشتهٔ تک‌کوتیشن معتبر نیست.');
    return value.slice(1, -1).replace(/''/g, "'");
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    const inner = value.slice(1, -1).trim();
    return inner ? splitTopLevel(inner, ',').map((part) => parseScalar(part, line)) : [];
  }
  if (value.startsWith('{') && value.endsWith('}')) {
    const inner = value.slice(1, -1).trim();
    const result: Record<string, unknown> = {};
    if (!inner) return result;
    for (const part of splitTopLevel(inner, ',')) {
      const colon = findColon(part);
      if (colon < 0) fail(line, 'عضو object در قالب inline باید key: value باشد.');
      const keyValue = parseScalar(part.slice(0, colon), line);
      if (typeof keyValue !== 'string') fail(line, 'کلیدهای object باید رشته باشند.');
      if (Object.prototype.hasOwnProperty.call(result, keyValue)) fail(line, `کلید تکراری «${keyValue}».`);
      result[keyValue] = parseScalar(part.slice(colon + 1), line);
    }
    return result;
  }
  if (/^(?:null|Null|NULL|~)$/.test(value)) return null;
  if (/^(?:true|True|TRUE)$/.test(value)) return true;
  if (/^(?:false|False|FALSE)$/.test(value)) return false;
  if (/^[-+]?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][-+]?\d+)?$/.test(value)) {
    const number = Number(value);
    if (!Number.isFinite(number)) fail(line, 'عدد باید متناهی باشد.');
    return number;
  }
  if (/^(?:\.nan|[-+]?\.inf)$/i.test(value)) fail(line, 'NaN و Infinity مجاز نیستند.');
  if (/^(?:yes|no|on|off)$/i.test(value)) fail(line, 'برای boolean از true یا false استفاده کنید.');
  return value;
}

export function parsePresentationYaml(source: string): unknown {
  if (source.length > 2_000_000) throw new Error('حجم YAML بیش از حد مجاز است (حداکثر ۲ مگابایت).');
  const rawLines = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const lines: YamlLine[] = [];
  for (let index = 0; index < rawLines.length; index += 1) {
    const raw = rawLines[index];
    if (/\t/.test(raw.match(/^\s*/)?.[0] ?? '')) fail(index + 1, 'برای تورفتگی از فاصله استفاده کنید، نه Tab.');
    const cleaned = stripComment(raw);
    if (!cleaned.trim() || cleaned.trim() === '---' || cleaned.trim() === '...') continue;
    const indent = cleaned.length - cleaned.trimStart().length;
    lines.push({ number: index + 1, indent, text: cleaned.trim(), raw });
  }
  if (!lines.length) throw new Error('YAML خالی است.');
  let cursor = 0;

  function pair(text: string, line: YamlLine): [string, string] {
    const colon = findColon(text);
    if (colon < 1) fail(line.number, 'هر کلید باید با الگوی key: value نوشته شود.');
    const rawKey = text.slice(0, colon).trim();
    const key = parseScalar(rawKey, line.number);
    if (typeof key !== 'string' || !key) fail(line.number, 'کلید باید یک رشتهٔ غیرخالی باشد.');
    return [key, text.slice(colon + 1).trim()];
  }

  function parseBlock(indent: number): unknown {
    if (cursor >= lines.length) return null;
    if (lines[cursor].indent !== indent) fail(lines[cursor].number, 'تورفتگی ناسازگار است.');
    const sequence = /^(?:-(?:\s|$))/.test(lines[cursor].text);
    if (sequence) {
      const result: unknown[] = [];
      while (cursor < lines.length && lines[cursor].indent === indent && /^(?:-(?:\s|$))/.test(lines[cursor].text)) {
        const line = lines[cursor++];
        const rest = line.text.replace(/^-(?:\s+|$)/, '').trim();
        if (!rest) {
          if (cursor < lines.length && lines[cursor].indent > indent) result.push(parseBlock(lines[cursor].indent));
          else result.push(null);
          continue;
        }
        const colon = findColon(rest);
        if (colon > 0 && !rest.startsWith('{') && !rest.startsWith('[')) {
          const virtualIndent = indent + 2;
          const [key, rawValue] = pair(rest, line);
          const item: Record<string, unknown> = {};
          if (rawValue) item[key] = parseScalar(rawValue, line.number);
          else if (cursor < lines.length && lines[cursor].indent > virtualIndent) item[key] = parseBlock(lines[cursor].indent);
          else item[key] = null;
          if (cursor < lines.length && lines[cursor].indent > indent) {
            const continuationIndent = lines[cursor].indent;
            if (continuationIndent <= indent) fail(lines[cursor].number, 'تورفتگی عضو sequence ناسازگار است.');
            const extra = parseBlock(continuationIndent);
            if (!extra || typeof extra !== 'object' || Array.isArray(extra)) fail(line.number, 'ادامهٔ عضو sequence باید mapping باشد.');
            for (const [extraKey, extraValue] of Object.entries(extra)) {
              if (Object.prototype.hasOwnProperty.call(item, extraKey)) fail(line.number, `کلید تکراری «${extraKey}».`);
              item[extraKey] = extraValue;
            }
          }
          result.push(item);
        } else {
          result.push(parseScalar(rest, line.number));
          if (cursor < lines.length && lines[cursor].indent > indent) fail(lines[cursor].number, 'مقدار scalar نمی‌تواند عضو تو‌در‌تو داشته باشد.');
        }
      }
      return result;
    }

    const result: Record<string, unknown> = {};
    while (cursor < lines.length && lines[cursor].indent === indent && !/^(?:-(?:\s|$))/.test(lines[cursor].text)) {
      const line = lines[cursor++];
      const [key, rawValue] = pair(line.text, line);
      if (Object.prototype.hasOwnProperty.call(result, key)) fail(line.number, `کلید تکراری «${key}».`);
      if (rawValue === '|' || rawValue === '|-' || rawValue === '>' || rawValue === '>-') {
        const chunks: string[] = [];
        while (cursor < lines.length && lines[cursor].indent > indent) {
          const next = lines[cursor++];
          chunks.push(next.raw.slice(Math.min(next.raw.length, indent + 2)));
        }
        const text = rawValue.startsWith('>') ? chunks.join(' ').replace(/\s+/g, ' ') : chunks.join('\n');
        result[key] = rawValue.endsWith('-') ? text : text + '\n';
      } else if (rawValue) {
        result[key] = parseScalar(rawValue, line.number);
      } else if (cursor < lines.length && lines[cursor].indent > indent) {
        result[key] = parseBlock(lines[cursor].indent);
      } else {
        result[key] = null;
      }
    }
    return result;
  }

  const result = parseBlock(lines[0].indent);
  if (cursor < lines.length) fail(lines[cursor].number, 'ساختار YAML قابل‌تفسیر نیست.');
  return result;
}

export function stringifyPresentationYaml(value: unknown, indent = 0): string {
  const pad = ' '.repeat(indent);
  if (Array.isArray(value)) {
    if (!value.length) return '[]';
    return value.map((item) => {
      if (item !== null && typeof item === 'object') {
        const rendered = stringifyPresentationYaml(item, indent + 2);
        return `${pad}- ${rendered.startsWith('\n') ? '' : ''}${rendered.startsWith('  ') ? '\n' + rendered : rendered}`;
      }
      return `${pad}- ${yamlScalar(item)}`;
    }).join('\n');
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length) return '{}';
    return entries.map(([key, item]) => {
      const keyText = /^[A-Za-z_][\w.-]*$/.test(key) ? key : JSON.stringify(key);
      if (item !== null && typeof item === 'object') {
        const nested = stringifyPresentationYaml(item, indent + 2);
        return `${pad}${keyText}:${nested === '{}' || nested === '[]' ? ' ' + nested : '\n' + nested}`;
      }
      return `${pad}${keyText}: ${yamlScalar(item)}`;
    }).join('\n');
  }
  return pad + yamlScalar(value);
}

function yamlScalar(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  return JSON.stringify(String(value));
}
