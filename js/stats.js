function median(sortedNumbers) {
  const n = sortedNumbers.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 0 ? (sortedNumbers[mid - 1] + sortedNumbers[mid]) / 2 : sortedNumbers[mid];
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return [...map.entries()];
}

function countBy(items, keyFn, knownKeys) {
  const counts = Object.fromEntries(knownKeys.map((k) => [k, 0]));
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function summarizeEntries(entries) {
  const entryCount = entries.length;
  const totalPoints = entries.reduce((sum, e) => sum + e.points, 0);
  const sortedPoints = entries.map((e) => e.points).sort((a, b) => a - b);
  const meanPoints = entryCount ? totalPoints / entryCount : 0;
  const medianPoints = median(sortedPoints);

  const categoryBreakdown = groupBy(entries, (e) => e.categoryName)
    .map(([categoryName, group]) => ({
      categoryName,
      count: group.length,
      totalPoints: group.reduce((s, e) => s + e.points, 0),
    }))
    .sort((a, b) => b.count - a.count);

  const taskBreakdown = groupBy(entries, (e) => (e.isCustomTask ? 'Other' : e.taskName))
    .map(([taskName, group]) => ({
      taskName,
      count: group.length,
      totalPoints: group.reduce((s, e) => s + e.points, 0),
    }))
    .sort((a, b) => b.count - a.count);

  const impactDistribution = countBy(entries, (e) => e.impact, [1, 2, 3, 4, 5]);
  const proofDistribution = countBy(entries, (e) => e.proof, [1, 2, 3]);
  const customTaskCount = entries.filter((e) => e.isCustomTask).length;
  const customTaskRate = entryCount ? customTaskCount / entryCount : 0;

  return {
    entryCount, totalPoints, meanPoints, medianPoints,
    categoryBreakdown, taskBreakdown,
    impactDistribution, proofDistribution,
    customTaskCount, customTaskRate,
  };
}

export function summarizeParticipation(entries, allUserIds) {
  const totalUsers = allUserIds.length;
  const countsByUser = groupBy(entries, (e) => e.uid).map(([, group]) => group.length);
  const contributors = countsByUser.length;
  const participationRate = totalUsers ? contributors / totalUsers : 0;
  const avgEntriesPerContributor = contributors ? entries.length / contributors : 0;
  const medianEntriesPerContributor = median(countsByUser.slice().sort((a, b) => a - b));

  return { totalUsers, contributors, participationRate, avgEntriesPerContributor, medianEntriesPerContributor };
}
