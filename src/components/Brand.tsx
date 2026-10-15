export function Brand({ compact = false, label = 'پردیس' }: { compact?: boolean; label?: string }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`} aria-label={label}>
      <span className="brand__mark" aria-hidden="true">
        <i />
        <i />
      </span>
      {!compact && <span className="brand__word">پردیس</span>}
    </div>
  );
}
