import { el } from './dom.js';
import { formatPoints, formatPercent, formatDate } from '../format.js';

function statCard(value, label) {
  return el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-card__value', text: value }),
    el('div', { class: 'stat-card__label', text: label }),
  ]);
}

function breakdownList(rows, nameKey, { hidePoints = false } = {}) {
  if (rows.length === 0) return el('p', { class: 'muted', text: 'No data yet.' });
  const headers = hidePoints ? ['Name', 'Count'] : ['Name', 'Count', 'Points'];
  return el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows.map((r) => el('tr', {}, [
      el('td', { text: r[nameKey] }),
      el('td', { text: String(r.count) }),
      ...(hidePoints ? [] : [el('td', { class: 'value', text: formatPoints(r.totalPoints) })]),
    ]))),
  ]));
}

function distributionList(distribution) {
  return el('ul', {}, Object.entries(distribution).map(([value, count]) =>
    el('li', { text: `${value}: ${count}` })));
}

export function buildUserBreakdownTable(rows, { showRank = false } = {}) {
  if (rows.length === 0) return el('p', { class: 'muted', text: 'No data yet.' });
  // No separate "Name" column: displayName is just the sign-in email for these
  // password accounts, so showing both would repeat the same value twice.
  const headers = [...(showRank ? ['#'] : []), 'Email', 'Entries', 'Points', 'Last activity'];
  return el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows.map((r, i) => el('tr', {}, [
      ...(showRank ? [el('td', { class: 'value', text: String(i + 1) })] : []),
      el('td', { text: r.email || r.displayName }),
      el('td', { text: String(r.entryCount) }),
      el('td', { class: 'value', text: formatPoints(r.totalPoints) }),
      el('td', { text: formatDate(r.lastActivity) }),
    ]))),
  ]));
}

export function buildStatsView(summary, participation = null, { hidePoints = false, hideTaskBreakdown = false } = {}) {
  const panels = [];

  if (participation) {
    panels.push(el('div', { class: 'panel' }, [
      el('h3', { text: 'Participation' }),
      statCard(`${participation.contributors}/${participation.totalUsers}`, 'People who logged something'),
      statCard(formatPercent(participation.participationRate), 'Participation rate'),
      statCard(String(Math.round(participation.avgEntriesPerContributor * 10) / 10), 'Avg entries / contributor'),
      statCard(String(participation.medianEntriesPerContributor), 'Median entries / contributor'),
    ]));
  }

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: hidePoints ? 'Activity' : 'Points' }),
    statCard(String(summary.entryCount), 'Entries'),
    ...(hidePoints ? [] : [
      statCard(formatPoints(summary.totalPoints), 'Total points'),
      statCard(formatPoints(summary.meanPoints), 'Mean points / entry'),
      statCard(formatPoints(summary.medianPoints), 'Median points / entry'),
    ]),
    statCard(formatPercent(summary.customTaskRate), '"Other" entries'),
  ]));

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: 'By category' }),
    breakdownList(summary.categoryBreakdown, 'categoryName', { hidePoints }),
  ]));

  if (!hideTaskBreakdown) {
    panels.push(el('div', { class: 'panel' }, [
      el('h3', { text: 'By task' }),
      breakdownList(summary.taskBreakdown, 'taskName', { hidePoints }),
    ]));
  }

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: 'Impact distribution (1-5)' }),
    distributionList(summary.impactDistribution),
  ]));

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: 'Proof distribution (1-3)' }),
    distributionList(summary.proofDistribution),
  ]));

  return el('div', {}, panels);
}
