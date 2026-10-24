export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  if (m === 0) return String(sec);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
