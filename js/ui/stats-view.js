import { el } from './dom.js';
import { formatPoints, formatPercent } from '../format.js';

function statCard(value, label) {
  return el('div', { class: 'stat-card' }, [
    el('div', { class: 'stat-card__value', text: value }),
    el('div', { class: 'stat-card__label', text: label }),
  ]);
}

function breakdownList(rows, nameKey) {
  if (rows.length === 0) return el('p', { class: 'muted', text: 'No data yet.' });
  return el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, [el('th', { text: 'Name' }), el('th', { text: 'Count' }), el('th', { text: 'Points' })])),
    el('tbody', {}, rows.map((r) => el('tr', {}, [
      el('td', { text: r[nameKey] }),
      el('td', { text: String(r.count) }),
      el('td', { class: 'value', text: formatPoints(r.totalPoints) }),
    ]))),
  ]);
}

function distributionList(distribution) {
  return el('ul', {}, Object.entries(distribution).map(([value, count]) =>
    el('li', { text: `${value}: ${count}` })));
}

export function buildStatsView(summary, participation = null) {
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
    el('h3', { text: 'Points' }),
    statCard(String(summary.entryCount), 'Entries'),
    statCard(formatPoints(summary.totalPoints), 'Total points'),
    statCard(formatPoints(summary.meanPoints), 'Mean points / entry'),
    statCard(formatPoints(summary.medianPoints), 'Median points / entry'),
    statCard(formatPercent(summary.customTaskRate), '"Other" entries'),
  ]));

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: 'By category' }),
    breakdownList(summary.categoryBreakdown, 'categoryName'),
  ]));

  panels.push(el('div', { class: 'panel' }, [
    el('h3', { text: 'By task' }),
    breakdownList(summary.taskBreakdown, 'taskName'),
  ]));

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
