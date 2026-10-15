const persianDigits = '۰۱۲۳۴۵۶۷۸۹';

export function faNumber(value: number | string): string {
  return String(value).replace(/\d/g, (digit) => persianDigits[Number(digit)]);
}

export function faDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function faRelativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  const delta = Date.now() - then;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (delta < minute) return 'همین حالا';
  if (delta < hour) return `${faNumber(Math.floor(delta / minute))} دقیقه پیش`;
  if (delta < day) return `${faNumber(Math.floor(delta / hour))} ساعت پیش`;
  if (delta < 7 * day) return `${faNumber(Math.floor(delta / day))} روز پیش`;
  return faDate(iso);
}
