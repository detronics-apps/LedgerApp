const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `isoDate` is a plain 'YYYY-MM-DD' calendar day (from an <input type="date">),
 * not a timestamp - parsing it as Date and reading local getDate()/getMonth()
 * would shift the day near midnight in timezones behind UTC. Split the string
 * instead so the printed date always matches what the user picked.
 */
export function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function formatPoints(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

export function formatPercent(fraction, digits = 0) {
  return `${(fraction * 100).toFixed(digits)}%`;
}
