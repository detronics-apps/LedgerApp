# Impact Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Impact Ledger, a Firebase + GitHub Pages pilot app for Research Square Engineering Services where employees log discretionary "extra effort" contributions (category, task, impact, proof, description) and everyone can browse the full company ledger and stats, while admins manage the task/category taxonomy, weights, and a custom-task review queue.

**Architecture:** Static HTML/CSS/JS, no build step, `<script type="module">` throughout. Firebase (Auth + Firestore) loaded via its official CDN ES-module URLs — the supported no-bundler integration path. All domain logic (scoring, validation, stats) lives in pure modules under `js/` with `node --test` coverage; all DOM code lives under `js/ui/`; only `js/ui/data.js`, `js/ui/auth.js`, `js/firebase-config.js`, and `js/main.js` know about Firebase, so every other view module is testable/inspectable with plain mock data via `dev/harness.html` without any backend.

**Tech Stack:** Vanilla JS (ES modules), Firebase JS SDK v10 (Auth + Firestore) via CDN import, Node's built-in test runner (`node --test`), Firebase Local Emulator Suite + `@firebase/rules-unit-testing` for rules tests (dev-only, requires Java — see Task 11 note), Python 3 + `openpyxl` for the one-time seed-data extraction script (dev-only, not shipped).

**Spec:** [docs/superpowers/specs/2026-09-19-impact-ledger-design.md](../specs/2026-09-19-impact-ledger-design.md)

## Global Constraints

- No build step, no bundler, no frontend framework, no npm packages required to *run* the shipped site — GitHub Pages serves the files as-is.
- `node --test` requires nothing installed (Node's built-in runner). Rules tests and the seed script are dev-only tooling and may use devDependencies (`firebase-tools`, `@firebase/rules-unit-testing`, `firebase-admin`) — these never ship to GitHub Pages.
- Every file outside `js/ui/` (i.e. `js/scoring.js`, `js/validation.js`, `js/format.js`, `js/stats.js`) is pure: no DOM, no `window`, no globals. Each gets a matching `tests/<name>.test.js`.
- Sign-in is restricted to `@research-square.com` addresses, enforced in Firestore Rules (not just client-side).
- `points = impact × proof × taskWeight × categoryWeight`. Impact is a full 1–5 picker; Proof stays 1–3.
- Any signed-in `@research-square.com` user can **read** all of `entries`, `categories`, `tasks`, and `users`. A user may only **create/update/delete their own** `entries` doc and their own `users` doc. Only admins (presence in `admins`) may write `categories`/`tasks`. **No client, including an admin, may ever write to `admins`.**
- Research Square palette (`#102A43` navy, `#4A5A6A` body, `#8294A4` muted, `#2E6A9E` accent, tints `#E3EEF8`/`#EEF4FA`/`#CFE0F0`, `rgba(16,42,67,0.12)` borders, 4px radius), Space Grotesk headings / Inter body, per spec section 3.
- Denormalize `categoryName`, `taskName`, `taskWeight`, `categoryWeight` onto each entry at write time so a later admin edit never rewrites historical data.

---

### Task 1: Repo scaffold + `scoring.js`

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.nojekyll`
- Create: `.claude/launch.json`
- Create: `js/scoring.js`
- Test: `tests/scoring.test.js`

**Interfaces:**
- Produces: `computePoints(impact, proof, taskWeight, categoryWeight) => number`, `IMPACT_LEVELS: Array<{value, label, description}>` (5 entries, values 1–5), `PROOF_LEVELS: Array<{value, label, description}>` (3 entries, values 1–3). Every later task that shows or validates impact/proof imports these two arrays rather than redefining the text.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "impact-ledger",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "description": "Research Square Engineering Services - extra-effort logging pilot.",
  "scripts": {
    "test": "node --test tests/*.test.js",
    "test:rules": "firebase emulators:exec --project demo-impact-ledger --only firestore \"node --test firestore.rules.test.mjs\"",
    "serve": "python -m http.server 8090"
  },
  "devDependencies": {}
}
```

- [ ] **Step 2: Write `.gitignore`, `.nojekyll`, `.claude/launch.json`**

`.gitignore`:
```
node_modules/
.DS_Store
service-account.json
```

`.nojekyll`: empty file.

`.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "impact-ledger",
      "runtimeExecutable": "python",
      "runtimeArgs": ["-m", "http.server", "8090"],
      "port": 8090
    }
  ]
}
```

- [ ] **Step 3: Write the failing test** — `tests/scoring.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computePoints, IMPACT_LEVELS, PROOF_LEVELS } from '../js/scoring.js';

test('computePoints multiplies impact, proof and both weights', () => {
  assert.equal(computePoints(1, 1, 1, 1), 1);
  assert.equal(computePoints(3, 2, 1, 1), 6);
  assert.equal(computePoints(5, 3, 1, 1), 15);
  assert.equal(computePoints(3, 2, 1.5, 1), 9);
  assert.equal(computePoints(3, 2, 1, 2), 12);
});

test('computePoints defaults both weights to 1 when omitted', () => {
  assert.equal(computePoints(4, 2), 8);
});

test('IMPACT_LEVELS has five entries, values 1 through 5, each with a description', () => {
  assert.equal(IMPACT_LEVELS.length, 5);
  assert.deepEqual(IMPACT_LEVELS.map((l) => l.value), [1, 2, 3, 4, 5]);
  for (const level of IMPACT_LEVELS) {
    assert.equal(typeof level.label, 'string');
    assert.ok(level.description.length > 0);
  }
});

test('PROOF_LEVELS has three entries, values 1 through 3', () => {
  assert.equal(PROOF_LEVELS.length, 3);
  assert.deepEqual(PROOF_LEVELS.map((l) => l.value), [1, 2, 3]);
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/scoring.js'`

- [ ] **Step 5: Write `js/scoring.js`**

```js
export const IMPACT_LEVELS = [
  { value: 1, label: 'Small help', description: 'A quick, low-effort assist with limited or personal scope.' },
  { value: 2, label: 'Noticeable help', description: 'Saved someone real time or unblocked a specific problem.' },
  { value: 3, label: 'Meaningful contribution', description: "Improved how a team or process works, not just one person's day." },
  { value: 4, label: 'Significant improvement', description: 'Measurably improved outcomes across a team or client, likely to keep paying off.' },
  { value: 5, label: 'Company-shaping improvement', description: 'Changed how the company operates, wins work, or is perceived, company-wide.' },
];

export const PROOF_LEVELS = [
  { value: 1, label: 'Trust me', description: 'No specific evidence.' },
  { value: 2, label: 'Here is the data', description: 'A document, link, or result exists.' },
  { value: 3, label: 'Here is proof of the impact', description: 'Clear evidence the impact actually happened.' },
];

/** points = impact x proof x taskWeight x categoryWeight; weights default to 1 for an unweighted task/category. */
export function computePoints(impact, proof, taskWeight = 1, categoryWeight = 1) {
  return impact * proof * taskWeight * categoryWeight;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .nojekyll .claude/launch.json js/scoring.js tests/scoring.test.js
git commit -m "Add repo scaffold and pure scoring module"
```

---

### Task 2: `validation.js`

**Files:**
- Create: `js/validation.js`
- Test: `tests/validation.test.js`

**Interfaces:**
- Consumes: nothing (pure, no cross-module dependency needed — ranges are hardcoded to match `IMPACT_LEVELS`/`PROOF_LEVELS` from Task 1, 1–5 and 1–3).
- Produces: `validateEntryDraft(draft) => { valid: boolean, errors: Record<string, string> }`. Used by `js/ui/log-form.js` (Task 6) to show inline errors before calling `onSubmit`.

- [ ] **Step 1: Write the failing test** — `tests/validation.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateEntryDraft } from '../js/validation.js';

const baseDraft = {
  categoryId: 'culture', taskId: 'culture--team-event', isCustomTask: false,
  customTaskName: '', date: '2026-09-17', impact: 3, proof: 2,
  description: 'Organised a team lunch.',
};

test('a fully filled-in draft is valid', () => {
  const result = validateEntryDraft(baseDraft);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('missing category and task are reported', () => {
  const result = validateEntryDraft({ ...baseDraft, categoryId: '', taskId: '' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.categoryId, 'Select a category.');
  assert.equal(result.errors.taskId, 'Select a task.');
});

test('a custom task requires free text', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: true, customTaskName: '  ' });
  assert.equal(result.valid, false);
  assert.equal(result.errors.customTaskName, 'Describe what you did.');
});

test('a custom task with text is valid', () => {
  const result = validateEntryDraft({ ...baseDraft, isCustomTask: true, customTaskName: 'Fixed the coffee machine' });
  assert.equal(result.valid, true);
});

test('impact and proof out of range are reported', () => {
  const result = validateEntryDraft({ ...baseDraft, impact: 0, proof: 4 });
  assert.equal(result.errors.impact, 'Choose an impact level.');
  assert.equal(result.errors.proof, 'Choose a proof level.');
});

test('a blank description is reported', () => {
  const result = validateEntryDraft({ ...baseDraft, description: '   ' });
  assert.equal(result.errors.description, 'Add a short description.');
});

test('a missing date is reported', () => {
  const result = validateEntryDraft({ ...baseDraft, date: '' });
  assert.equal(result.errors.date, 'Pick a date.');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/validation.js'`

- [ ] **Step 3: Write `js/validation.js`**

```js
export function validateEntryDraft(draft) {
  const errors = {};

  if (!draft.categoryId) errors.categoryId = 'Select a category.';
  if (!draft.taskId) errors.taskId = 'Select a task.';
  if (draft.isCustomTask && !(draft.customTaskName || '').trim()) {
    errors.customTaskName = 'Describe what you did.';
  }
  if (!draft.date) errors.date = 'Pick a date.';
  if (!Number.isInteger(draft.impact) || draft.impact < 1 || draft.impact > 5) {
    errors.impact = 'Choose an impact level.';
  }
  if (!Number.isInteger(draft.proof) || draft.proof < 1 || draft.proof > 3) {
    errors.proof = 'Choose a proof level.';
  }
  if (!(draft.description || '').trim()) errors.description = 'Add a short description.';

  return { valid: Object.keys(errors).length === 0, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (7 new tests, 11 total)

- [ ] **Step 5: Commit**

```bash
git add js/validation.js tests/validation.test.js
git commit -m "Add pure entry-draft validation module"
```

---

### Task 3: `format.js`

**Files:**
- Create: `js/format.js`
- Test: `tests/format.test.js`

**Interfaces:**
- Produces: `formatDate(isoDate: string) => string`, `formatPoints(n: number) => string`, `formatPercent(fraction: number, digits = 0) => string`. Used by every view module (`entries-table.js`, `stats-view.js`) that turns a stored value into prose.

- [ ] **Step 1: Write the failing test** — `tests/format.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDate, formatPoints, formatPercent } from '../js/format.js';

test('formatDate renders a YYYY-MM-DD string as "D Mon YYYY", no timezone shift', () => {
  assert.equal(formatDate('2026-09-17'), '17 Sep 2026');
  assert.equal(formatDate('2026-01-01'), '1 Jan 2026');
  assert.equal(formatDate('2026-12-31'), '31 Dec 2026');
});

test('formatPoints trims a trailing .0 but keeps real decimals', () => {
  assert.equal(formatPoints(6), '6');
  assert.equal(formatPoints(6.0), '6');
  assert.equal(formatPoints(7.5), '7.5');
  assert.equal(formatPoints(9), '9');
});

test('formatPercent rounds to the given number of digits', () => {
  assert.equal(formatPercent(2 / 3, 0), '67%');
  assert.equal(formatPercent(2 / 3, 1), '66.7%');
  assert.equal(formatPercent(0.25), '25%');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/format.js'`

- [ ] **Step 3: Write `js/format.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (3 new tests, 14 total)

- [ ] **Step 5: Commit**

```bash
git add js/format.js tests/format.test.js
git commit -m "Add pure date/number formatting module"
```

---

### Task 4: `stats.js`

**Files:**
- Create: `js/stats.js`
- Test: `tests/stats.test.js`

**Interfaces:**
- Consumes: entry-like objects shaped `{ uid, categoryName, taskName, isCustomTask, impact, proof, points }` (the shape `js/ui/data.js`, Task 12, will read off real Firestore docs).
- Produces: `summarizeEntries(entries) => Summary`, `summarizeParticipation(entries, allUserIds) => Participation`, where:
  - `Summary = { entryCount, totalPoints, meanPoints, medianPoints, categoryBreakdown: Array<{categoryName, count, totalPoints}>, taskBreakdown: Array<{taskName, count, totalPoints}>, impactDistribution: {1..5: count}, proofDistribution: {1..3: count}, customTaskCount, customTaskRate }`
  - `Participation = { totalUsers, contributors, participationRate, avgEntriesPerContributor, medianEntriesPerContributor }`
  - Both are consumed as-is by `js/ui/stats-view.js` (Task 8).

- [ ] **Step 1: Write the failing test** — `tests/stats.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarizeEntries, summarizeParticipation } from '../js/stats.js';

const entries = [
  { uid: 'a', categoryName: 'Culture', taskName: 'Team event', isCustomTask: false, impact: 3, proof: 2, points: 6 },
  { uid: 'a', categoryName: 'Culture', taskName: 'Team event', isCustomTask: false, impact: 1, proof: 1, points: 1 },
  { uid: 'b', categoryName: 'Learning & Capability', taskName: 'Career Mentorship', isCustomTask: false, impact: 1, proof: 1, points: 1 },
  { uid: 'b', categoryName: 'Learning & Capability', taskName: '', isCustomTask: true, impact: 5, proof: 3, points: 15 },
];

test('summarizeEntries totals, means and medians points correctly', () => {
  const s = summarizeEntries(entries);
  assert.equal(s.entryCount, 4);
  assert.equal(s.totalPoints, 23);
  assert.equal(s.meanPoints, 5.75);
  assert.equal(s.medianPoints, 3.5); // sorted [1,1,6,15] -> (1+6)/2
});

test('summarizeEntries groups by category, sorted by count desc', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.categoryBreakdown, [
    { categoryName: 'Culture', count: 2, totalPoints: 7 },
    { categoryName: 'Learning & Capability', count: 2, totalPoints: 16 },
  ]);
});

test('summarizeEntries groups custom tasks under "Other" in the task breakdown', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.taskBreakdown, [
    { taskName: 'Team event', count: 2, totalPoints: 7 },
    { taskName: 'Career Mentorship', count: 1, totalPoints: 1 },
    { taskName: 'Other', count: 1, totalPoints: 15 },
  ]);
});

test('summarizeEntries builds full impact (1-5) and proof (1-3) distributions', () => {
  const s = summarizeEntries(entries);
  assert.deepEqual(s.impactDistribution, { 1: 2, 2: 0, 3: 1, 4: 0, 5: 1 });
  assert.deepEqual(s.proofDistribution, { 1: 2, 2: 1, 3: 1 });
});

test('summarizeEntries reports the custom-task rate', () => {
  const s = summarizeEntries(entries);
  assert.equal(s.customTaskCount, 1);
  assert.equal(s.customTaskRate, 0.25);
});

test('summarizeEntries on an empty array returns zeros, not NaN', () => {
  const s = summarizeEntries([]);
  assert.equal(s.entryCount, 0);
  assert.equal(s.meanPoints, 0);
  assert.equal(s.medianPoints, 0);
  assert.equal(s.customTaskRate, 0);
});

test('summarizeParticipation reports headcount, contributors and rate', () => {
  const p = summarizeParticipation(entries, ['a', 'b', 'c']);
  assert.equal(p.totalUsers, 3);
  assert.equal(p.contributors, 2);
  assert.equal(p.participationRate, 2 / 3);
  assert.equal(p.avgEntriesPerContributor, 2);
  assert.equal(p.medianEntriesPerContributor, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module '../js/stats.js'`

- [ ] **Step 3: Write `js/stats.js`**

```js
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS (8 new tests, 22 total)

- [ ] **Step 5: Commit**

```bash
git add js/stats.js tests/stats.test.js
git commit -m "Add pure stats aggregation module"
```

---

### Task 5: Design tokens, static shell, and vendored DOM helpers

**Files:**
- Create: `css/tokens.css`, `css/layout.css`, `css/components.css`, `css/patterns.css`
- Create: `js/ui/dom.js` (vendored)
- Create: `js/ui/nav.js`
- Create: `js/main.js`
- Create: `index.html`
- Create: `assets/favicon.svg`

**Interfaces:**
- Produces: `js/ui/dom.js` exports `el, svg, append, clear, $, infoIcon, hideTooltip, field, select, chips, toast, download` — every later `js/ui/*` view module (Tasks 6–10, 12) imports from here for all DOM construction. `js/ui/nav.js` exports `buildNav(tabs, activeId, onSelect) => HTMLElement` where `tabs: Array<{id: string, label: string}>`.

- [ ] **Step 1: Write `css/tokens.css`**

```css
/*
 * Design tokens for the Research Square Engineering Services identity
 * (read from research-square.com/engineeringservices). Light is the base;
 * dark is redefined twice - once behind prefers-color-scheme for viewers who
 * never touch the toggle, once behind [data-theme] so the toggle wins in
 * both directions.
 */

:root {
  color-scheme: light;

  --bg: #EEF4FA;
  --panel: #ffffff;
  --panel-2: #E3EEF8;
  --panel-3: #CFE0F0;
  --border: rgba(16, 42, 67, 0.12);
  --border-strong: rgba(16, 42, 67, 0.28);

  --text: #4A5A6A;
  --text-heading: #102A43;
  --text-dim: #4A5A6A;
  --text-faint: #8294A4;

  /* research-square.com accent blue. Used for fills, outlines and eyebrow
     labels; --accent-strong is the darker variant for text on light panels. */
  --accent: #2E6A9E;
  --accent-strong: #1F4E78;
  --accent-soft: #CFE0F0;
  --accent-ink: #ffffff;

  --ok: #1f7a3d;
  --ok-soft: #e2f2e7;
  --warn: #8a5a00;
  --warn-soft: #fdf0d8;
  --danger: #a32020;
  --danger-soft: #fbe4e4;

  --shadow-sm: 0 1px 2px rgb(16 42 67 / 8%);
  --shadow-md: 0 4px 16px rgb(16 42 67 / 12%);
  --shadow-lg: 0 12px 40px rgb(16 42 67 / 22%);

  --radius-sm: 4px;
  --radius: 4px;
  --radius-lg: 8px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  --header-h: 56px;

  --font-heading: 'Space Grotesk', system-ui, -apple-system, sans-serif;
  --font-body: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, "SF Mono", "Cascadia Mono", Menlo, Consolas, monospace;
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme: dark;

    --bg: #0B1A2A;
    --panel: #102A43;
    --panel-2: #16324F;
    --panel-3: #1D3E5E;
    --border: rgba(207, 224, 240, 0.16);
    --border-strong: rgba(207, 224, 240, 0.32);

    --text: #CFE0F0;
    --text-heading: #EEF4FA;
    --text-dim: #CFE0F0;
    --text-faint: #8294A4;

    --accent: #6FA8D8;
    --accent-strong: #9CC4E4;
    --accent-soft: #1D3E5E;
    --accent-ink: #0B1A2A;

    --ok: #6ed08c;
    --ok-soft: #1d3527;
    --warn: #e8b45c;
    --warn-soft: #3a2f18;
    --danger: #f08a8a;
    --danger-soft: #3b2020;

    --shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);
    --shadow-md: 0 4px 16px rgb(0 0 0 / 45%);
    --shadow-lg: 0 12px 40px rgb(0 0 0 / 55%);
  }
}

:root[data-theme="dark"] {
  color-scheme: dark;

  --bg: #0B1A2A;
  --panel: #102A43;
  --panel-2: #16324F;
  --panel-3: #1D3E5E;
  --border: rgba(207, 224, 240, 0.16);
  --border-strong: rgba(207, 224, 240, 0.32);

  --text: #CFE0F0;
  --text-heading: #EEF4FA;
  --text-dim: #CFE0F0;
  --text-faint: #8294A4;

  --accent: #6FA8D8;
  --accent-strong: #9CC4E4;
  --accent-soft: #1D3E5E;
  --accent-ink: #0B1A2A;

  --ok: #6ed08c;
  --ok-soft: #1d3527;
  --warn: #e8b45c;
  --warn-soft: #3a2f18;
  --danger: #f08a8a;
  --danger-soft: #3b2020;

  --shadow-sm: 0 1px 2px rgb(0 0 0 / 40%);
  --shadow-md: 0 4px 16px rgb(0 0 0 / 45%);
  --shadow-lg: 0 12px 40px rgb(0 0 0 / 55%);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Write `css/layout.css`**

```css
/* Header, nav, content, footer. Tokens only - no literal colours. */
*, *::before, *::after { box-sizing: border-box; }
html, body { height: 100%; }

body {
  margin: 0;
  font: 400 15px/1.6 var(--font-body);
  color: var(--text);
  background: var(--bg);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

h1, h2, h3, h4 {
  font-family: var(--font-heading);
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--text-heading);
  margin: 0 0 var(--space-3);
}

.eyebrow {
  font-family: var(--font-body);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.22em;
  color: var(--accent);
  margin: 0 0 var(--space-2);
}

.app-header {
  flex: 0 0 auto;
  height: var(--header-h);
  display: flex; align-items: center; gap: var(--space-4);
  padding: 0 var(--space-4);
  background: var(--panel);
  border-bottom: 1px solid var(--border);
}

.brand { display: flex; align-items: center; gap: var(--space-3); min-width: 0; }
.brand__logo { height: 24px; width: auto; display: block; }
.brand__name { font-family: var(--font-heading); font-weight: 600; letter-spacing: -0.01em; color: var(--text-heading); white-space: nowrap; }
.header-actions { margin-left: auto; display: flex; align-items: center; gap: var(--space-2); }

.app-nav {
  flex: 0 0 auto;
  display: flex; gap: var(--space-2); flex-wrap: wrap;
  padding: var(--space-2) var(--space-4);
  background: var(--panel-2);
  border-bottom: 1px solid var(--border);
}

.app-main {
  flex: 1 1 auto;
  padding: var(--space-5) var(--space-4);
  max-width: 1040px;
  width: 100%;
  margin: 0 auto;
}

.app-footer {
  flex: 0 0 auto;
  display: flex; align-items: center; gap: var(--space-4); flex-wrap: wrap;
  padding: var(--space-3) var(--space-4);
  background: var(--panel);
  border-top: 1px solid var(--border);
  font-size: 12px; color: var(--text-faint);
}
```

- [ ] **Step 3: Write `css/components.css`**

```css
/* Buttons, panels, forms, tables, tabs, banners, pickers. Tokens only. */
.panel {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.btn {
  font: inherit;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--panel-2);
  color: var(--text);
  cursor: pointer;
}
.btn:hover { background: var(--panel-3); }
.btn-primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
.btn-primary:hover { background: var(--accent-strong); border-color: var(--accent-strong); }
.btn-danger { color: var(--danger); border-color: var(--danger); background: var(--danger-soft); }

.tabbar { display: flex; gap: var(--space-2); }
.tab {
  font: inherit; cursor: pointer;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-dim);
}
.tab--active { background: var(--panel); color: var(--accent-strong); border-color: var(--border); font-weight: 600; }

.field { display: flex; flex-direction: column; gap: var(--space-1); margin-bottom: var(--space-3); }
.field__label { font-weight: 600; font-size: 13px; color: var(--text-heading); display: flex; align-items: center; gap: var(--space-1); }
.field__hint { font-size: 12px; color: var(--text-faint); }
.field__error { font-size: 12px; color: var(--danger); }

input, select, textarea {
  font: inherit;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--panel);
  color: var(--text);
}

.picker { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.picker__option {
  flex: 1 1 160px;
  text-align: left;
  cursor: pointer;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
}
.picker__option--selected { border-color: var(--accent); background: var(--accent-soft); }
.picker__option strong { display: block; color: var(--text-heading); }
.picker__option span { font-size: 12px; color: var(--text-faint); }

table.table { width: 100%; border-collapse: collapse; font-size: 14px; }
table.table th, table.table td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); }
table.table th { color: var(--text-faint); font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; }

.badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; background: var(--accent-soft); color: var(--accent-strong); }

.banner { border-radius: var(--radius-sm); padding: var(--space-2) var(--space-3); border: 1px solid; margin-bottom: var(--space-3); }
.banner-ok     { color: var(--ok);     background: var(--ok-soft);     border-color: var(--ok); }
.banner-warn   { color: var(--warn);   background: var(--warn-soft);   border-color: var(--warn); }
.banner-danger { color: var(--danger); background: var(--danger-soft); border-color: var(--danger); }

.info { width: 18px; height: 18px; border-radius: 50%; border: 1px solid var(--border-strong); background: var(--panel-2); color: var(--text-faint); font-size: 11px; line-height: 1; cursor: pointer; }
.stat-card { display: inline-block; min-width: 140px; margin: 0 var(--space-3) var(--space-3) 0; }
.stat-card__value { font-family: var(--font-mono); font-size: 24px; color: var(--text-heading); }
.stat-card__label { font-size: 12px; color: var(--text-faint); }

.toast {
  position: fixed; left: 50%; bottom: var(--space-5); transform: translateX(-50%);
  background: var(--text-heading); color: #fff;
  padding: var(--space-2) var(--space-4); border-radius: var(--radius);
  box-shadow: var(--shadow-md); z-index: 400;
}
```

- [ ] **Step 4: Write `css/patterns.css`** (cross-cutting fixes; see the `detronics-app` skill's `references/pitfalls.md` for why these exist)

```css
/* Tooltips live on <body>, not inside a scroll container - see dom.js's
   infoIcon(). Fixed positioning, set from JS, escapes every clipping
   context that a bubble nested in a panel would be clipped by. */
.info__bubble {
  position: fixed;
  z-index: 300;
  display: none;
  pointer-events: none;
  width: max-content;
  max-width: min(280px, calc(100vw - 24px));
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--panel);
  color: var(--text);
  box-shadow: var(--shadow-md);
  font-size: 12px;
  line-height: 1.45;
  text-align: left;
  text-transform: none;
  letter-spacing: 0;
  white-space: normal;
}

/* Header shrinks its wordmark before it lets action buttons collide with it. */
@media (max-width: 560px) {
  .brand__name { display: none; }
  .app-header { gap: var(--space-2); padding: 0 var(--space-3); }
}
```

- [ ] **Step 5: Copy `js/ui/dom.js` verbatim from the `detronics-app` skill**

```bash
cp "$HOME/.claude/skills/detronics-app/assets/dom.js" js/ui/dom.js
```

(This file is domain-agnostic — `el`, `svg`, `clear`, `$`, `field`, `select`, `chips`, `toast`, `infoIcon`, `download` — and is used unmodified. It lives under `js/ui/` and is not unit-tested, per the skill's convention that only non-DOM code gets `tests/`.)

- [ ] **Step 6: Write `js/ui/nav.js`**

```js
import { el } from './dom.js';

/** tabs: Array<{id: string, label: string}> */
export function buildNav(tabs, activeId, onSelect) {
  return el('nav', { class: 'app-nav tabbar', role: 'tablist', 'aria-label': 'Sections' },
    tabs.map((t) => el('button', {
      class: `tab${t.id === activeId ? ' tab--active' : ''}`,
      type: 'button', role: 'tab', 'aria-selected': String(t.id === activeId),
      text: t.label,
      on: { click: () => onSelect(t.id) },
    })));
}
```

- [ ] **Step 7: Write `assets/favicon.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#102A43"/>
  <rect x="16" y="18" width="32" height="6" rx="2" fill="#EEF4FA"/>
  <rect x="16" y="29" width="32" height="6" rx="2" fill="#CFE0F0"/>
  <rect x="16" y="40" width="20" height="6" rx="2" fill="#2E6A9E"/>
</svg>
```

- [ ] **Step 8: Write `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Impact Ledger</title>
<meta name="description" content="Research Square Engineering Services - log and browse extra-effort contributions.">
<meta name="color-scheme" content="light dark">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="css/tokens.css">
<link rel="stylesheet" href="css/layout.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/patterns.css">
</head>
<body>
<script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 9: Write `js/main.js`** (static shell for now; Task 12 wires in real auth/data)

```js
import { el, clear } from './ui/dom.js';

export const APP_VERSION = '0.1.0';

const dom = {};

function buildHeader() {
  return el('header', { class: 'app-header' }, [
    el('div', { class: 'brand' }, [
      el('img', { class: 'brand__logo', src: 'assets/favicon.svg', alt: '' }),
      el('span', { class: 'brand__name', text: 'Impact Ledger' }),
    ]),
    el('div', { class: 'header-actions', id: 'header-actions' }),
  ]);
}

function buildFooter() {
  return el('footer', { class: 'app-footer' }, [
    el('span', { text: 'Research Square Engineering Services - pilot.' }),
    el('span', { text: `v${APP_VERSION}` }),
  ]);
}

function init() {
  dom.main = el('main', { class: 'app-main', id: 'main' },
    el('p', { class: 'muted', text: 'Loading...' }));
  document.body.append(buildHeader(), dom.main, buildFooter());
}

init();
```

- [ ] **Step 10: Verify in the browser**

Run: `npm run serve` (or open with the `.claude/launch.json` config), then open `http://localhost:8090/` in the built-in browser and confirm the header ("Impact Ledger"), a "Loading..." main area, and the footer version string all render with the Research Square palette (navy header text, light blue-tinted background). Use `read_page` rather than a screenshot to confirm the text content.

- [ ] **Step 11: Commit**

```bash
git add css/ js/ui/dom.js js/ui/nav.js js/main.js index.html assets/favicon.svg
git commit -m "Add Research Square design tokens, static shell, and vendored DOM helpers"
```

---

### Task 6: `log-form.js` + dev harness

**Files:**
- Create: `js/ui/log-form.js`
- Create: `dev/harness.html`
- Create: `dev/harness.js`

**Interfaces:**
- Consumes: `IMPACT_LEVELS`, `PROOF_LEVELS` (Task 1), `validateEntryDraft` (Task 2), `el/field/select/toast` (Task 5).
- Produces: `buildLogForm({ categories, tasks, initialValues = null, onSubmit, onCancel = null }) => HTMLElement`, where:
  - `categories: Array<{id, name, description}>`, `tasks: Array<{id, categoryId, name, description}>`
  - `initialValues`: an existing draft to prefill for editing, or `null` for a new entry
  - `onSubmit(draft) => Promise<{points: number}>` — draft shape: `{ categoryId, categoryName, taskId, taskName, isCustomTask, customTaskName, date, impact, proof, description, evidenceUrl }`
  - On successful resolve, the form shows `toast('Logged - N points')` and resets (new entry) or calls `onCancel` (edit). On rejection, it shows a `.banner-danger` with the rejection message and re-enables the submit button.
  This is the interface `js/ui/my-logs.js` (Task 7, edit mode) and `js/main.js` (Task 12, new-entry mode) both call.

- [ ] **Step 1: Write `js/ui/log-form.js`**

```js
import { el, field, select, clear, toast } from './dom.js';
import { IMPACT_LEVELS, PROOF_LEVELS } from '../scoring.js';
import { validateEntryDraft } from '../validation.js';

const CUSTOM_TASK_ID = '__custom__';

function pickerRow(levels, selectedValue, onPick) {
  return el('div', { class: 'picker' }, levels.map((lvl) => el('button', {
    type: 'button',
    class: `picker__option${lvl.value === selectedValue ? ' picker__option--selected' : ''}`,
    on: { click: () => onPick(lvl.value) },
  }, [
    el('strong', { text: `${lvl.value} - ${lvl.label}` }),
    el('span', { text: lvl.description }),
  ])));
}

export function buildLogForm({ categories, tasks, initialValues = null, onSubmit, onCancel = null }) {
  const draft = {
    categoryId: '', categoryName: '', taskId: '', taskName: '',
    isCustomTask: false, customTaskName: '',
    date: new Date().toISOString().slice(0, 10),
    impact: 0, proof: 0, description: '', evidenceUrl: '',
    ...initialValues,
  };

  const form = el('form', { class: 'panel' });
  const errorBanner = el('div', { id: 'form-error' });
  const taskFieldHost = el('div', { id: 'task-field-host' });
  const pickerHost = { impact: el('div'), proof: el('div') };

  function tasksForCategory(categoryId) {
    return tasks.filter((t) => t.categoryId === categoryId);
  }

  function renderTaskField() {
    clear(taskFieldHost);
    const options = [
      { value: '', label: draft.categoryId ? 'Select a task...' : 'Choose a category first' },
      ...tasksForCategory(draft.categoryId).map((t) => ({ value: t.id, label: t.name })),
      { value: CUSTOM_TASK_ID, label: 'Other - not listed' },
    ];
    const taskSelect = select(options, draft.isCustomTask ? CUSTOM_TASK_ID : draft.taskId, (value) => {
      if (value === CUSTOM_TASK_ID) {
        draft.isCustomTask = true;
        draft.taskId = '';
        draft.taskName = '';
      } else {
        draft.isCustomTask = false;
        draft.taskId = value;
        draft.taskName = tasks.find((t) => t.id === value)?.name ?? '';
      }
      renderTaskField();
    });
    taskFieldHost.appendChild(field('What did you do?', taskSelect));

    if (draft.isCustomTask) {
      const customInput = el('input', {
        type: 'text', placeholder: 'Describe the task briefly',
        value: draft.customTaskName,
        on: { input: (e) => { draft.customTaskName = e.target.value; } },
      });
      taskFieldHost.appendChild(field('Task name (not on the list)', customInput, {
        hint: "This goes to an admin review queue so we can add it to the list if it keeps coming up.",
      }));
    }
  }

  function renderPickers() {
    clear(pickerHost.impact);
    pickerHost.impact.appendChild(pickerRow(IMPACT_LEVELS, draft.impact, (v) => { draft.impact = v; renderPickers(); }));
    clear(pickerHost.proof);
    pickerHost.proof.appendChild(pickerRow(PROOF_LEVELS, draft.proof, (v) => { draft.proof = v; renderPickers(); }));
  }

  const categorySelect = select(
    [{ value: '', label: 'Select a category...' }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
    draft.categoryId,
    (value) => {
      draft.categoryId = value;
      draft.categoryName = categories.find((c) => c.id === value)?.name ?? '';
      draft.taskId = '';
      draft.taskName = '';
      renderTaskField();
    },
  );

  const dateInput = el('input', {
    type: 'date', value: draft.date,
    on: { input: (e) => { draft.date = e.target.value; } },
  });

  const descriptionInput = el('textarea', {
    rows: '3', placeholder: 'What did you do, briefly?', text: draft.description,
    on: { input: (e) => { draft.description = e.target.value; } },
  });

  const evidenceInput = el('input', {
    type: 'text', placeholder: 'Link, document, or MoM (optional)', value: draft.evidenceUrl,
    on: { input: (e) => { draft.evidenceUrl = e.target.value; } },
  });

  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: initialValues ? 'Save changes' : 'Log it' });

  form.append(
    el('h3', { text: initialValues ? 'Edit entry' : 'What did you do?' }),
    errorBanner,
    field('Category', categorySelect),
    taskFieldHost,
    field('When did you do it?', dateInput),
    field('How much impact did you think it had?', pickerHost.impact),
    field('What proof do you have?', pickerHost.proof),
    field('Description', descriptionInput),
    field('Evidence', evidenceInput, { hint: 'Optional - a link, document, or minutes of a meeting.' }),
    submitBtn,
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clear(errorBanner);
    const { valid, errors } = validateEntryDraft(draft);
    if (!valid) {
      errorBanner.appendChild(el('div', { class: 'banner banner-danger', text: Object.values(errors)[0] }));
      return;
    }
    submitBtn.disabled = true;
    onSubmit({ ...draft }).then((result) => {
      toast(`Logged - ${result.points} points`);
      if (onCancel) onCancel();
      else {
        Object.assign(draft, {
          categoryId: '', categoryName: '', taskId: '', taskName: '',
          isCustomTask: false, customTaskName: '', impact: 0, proof: 0,
          description: '', evidenceUrl: '',
        });
        categorySelect.value = '';
        renderTaskField();
        renderPickers();
        descriptionInput.value = '';
        evidenceInput.value = '';
        submitBtn.disabled = false;
      }
    }).catch((err) => {
      errorBanner.appendChild(el('div', { class: 'banner banner-danger', text: err.message || 'Could not save - try again.' }));
      submitBtn.disabled = false;
    });
  });

  renderTaskField();
  renderPickers();
  return form;
}
```

- [ ] **Step 2: Write `dev/harness.js`** (mock data, no Firebase — proves the form works in isolation)

```js
import { buildLogForm } from '../js/ui/log-form.js';
import { computePoints } from '../js/scoring.js';

const categories = [
  { id: 'culture', name: 'Culture' },
  { id: 'learning-capability', name: 'Learning & Capability' },
];
const tasks = [
  { id: 'culture--team-event', categoryId: 'culture', name: 'Team Culture' },
  { id: 'learning-capability--career-mentorship', categoryId: 'learning-capability', name: 'Career Mentorship' },
];

const mount = document.getElementById('mount');
mount.appendChild(buildLogForm({
  categories, tasks,
  onSubmit: (draft) => {
    console.log('submitted draft', draft);
    const points = computePoints(draft.impact, draft.proof, 1, 1);
    return Promise.resolve({ points });
  },
}));
```

- [ ] **Step 3: Write `dev/harness.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Impact Ledger - dev harness</title>
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/layout.css">
<link rel="stylesheet" href="../css/components.css">
<link rel="stylesheet" href="../css/patterns.css">
</head>
<body>
<main class="app-main" id="mount" style="max-width:600px;margin:24px auto;"></main>
<script type="module" src="harness.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify in the browser (no Firebase needed)**

Run: `npm run serve`, open `http://localhost:8090/dev/harness.html`. Using the built-in browser:
- Confirm the category select lists "Culture" and "Learning & Capability".
- Pick a category, confirm the task select updates to that category's tasks plus "Other - not listed".
- Pick "Other - not listed", confirm a free-text "Task name" field appears.
- Click impact option 4 and proof option 2, confirm both show as selected (`picker__option--selected`).
- Leave description blank and submit; confirm a red banner "Add a short description." appears and the browser console shows no submitted draft.
- Fill in description, submit; confirm a toast reading "Logged - 8 points" appears (impact 4 x proof 2 x weight 1 x weight 1) and the form resets.

- [ ] **Step 5: Commit**

```bash
git add js/ui/log-form.js dev/
git commit -m "Add log-effort form view and a Firebase-free dev harness"
```

---

### Task 7: `entries-table.js` (My Logs / Company Ledger)

**Files:**
- Create: `js/ui/entries-table.js`
- Modify: `dev/harness.js` (add a second harness section rendering a table with mock entries)

**Interfaces:**
- Consumes: `el, format.js`'s `formatDate/formatPoints`.
- Produces: `buildEntriesTable(entries, { showOwner = true, onEdit = null, onDelete = null } = {}) => HTMLElement`, where `entries: Array<{id, date, categoryName, taskName, isCustomTask, impact, proof, points, description, evidenceUrl, displayName, uid}>`. `js/main.js` (Task 12) passes `onEdit`/`onDelete` only for **My Logs** (filtered to the signed-in uid) and omits them (read-only) for the **Company Ledger** (all entries).

- [ ] **Step 1: Write `js/ui/entries-table.js`**

```js
import { el } from './dom.js';
import { formatDate, formatPoints } from '../format.js';

export function buildEntriesTable(entries, { showOwner = true, onEdit = null, onDelete = null } = {}) {
  if (entries.length === 0) {
    return el('p', { class: 'muted', text: 'Nothing logged yet.' });
  }

  const headers = ['Date', 'Category', 'Task', 'Impact', 'Proof', 'Points', 'Description'];
  if (showOwner) headers.splice(1, 0, 'Person');
  if (onEdit || onDelete) headers.push('');

  const rows = entries.map((entry) => {
    const cells = [
      el('td', { text: formatDate(entry.date) }),
      el('td', { text: entry.categoryName }),
      el('td', {}, [
        entry.taskName || 'Other',
        entry.isCustomTask ? el('span', { class: 'badge', text: 'Other' }) : null,
      ]),
      el('td', { text: String(entry.impact) }),
      el('td', { text: String(entry.proof) }),
      el('td', { class: 'value', text: formatPoints(entry.points) }),
      el('td', {}, [
        entry.description,
        entry.evidenceUrl ? el('a', { href: entry.evidenceUrl, target: '_blank', rel: 'noopener', text: ' [evidence]' }) : null,
      ]),
    ];
    if (showOwner) cells.splice(1, 0, el('td', { text: entry.displayName }));
    if (onEdit || onDelete) {
      cells.push(el('td', {}, [
        onEdit ? el('button', { type: 'button', class: 'btn', text: 'Edit', on: { click: () => onEdit(entry) } }) : null,
        onDelete ? el('button', { type: 'button', class: 'btn btn-danger', text: 'Delete', on: { click: () => onDelete(entry) } }) : null,
      ]));
    }
    return el('tr', {}, cells);
  });

  return el('table', { class: 'table' }, [
    el('thead', {}, el('tr', {}, headers.map((h) => el('th', { text: h })))),
    el('tbody', {}, rows),
  ]);
}
```

- [ ] **Step 2: Add a harness section** — append to `dev/harness.js`

```js
import { buildEntriesTable } from '../js/ui/entries-table.js';

const mockEntries = [
  { id: '1', date: '2026-09-17', categoryName: 'Culture', taskName: 'Team Culture', isCustomTask: false, impact: 3, proof: 2, points: 6, description: 'Organised a team lunch.', evidenceUrl: '', displayName: 'Alice', uid: 'alice' },
  { id: '2', date: '2026-09-18', categoryName: 'Learning & Capability', taskName: '', isCustomTask: true, impact: 5, proof: 3, points: 15, description: 'Fixed the coffee machine and wrote a guide.', evidenceUrl: 'https://example.com/guide', displayName: 'Bob', uid: 'bob' },
];

document.getElementById('mount').appendChild(el('div', { class: 'panel' }, [
  el('h3', { text: 'Company Ledger (read-only)' }),
  buildEntriesTable(mockEntries),
]));
document.getElementById('mount').appendChild(el('div', { class: 'panel' }, [
  el('h3', { text: 'My Logs (editable)' }),
  buildEntriesTable(mockEntries.filter((e) => e.uid === 'alice'), {
    showOwner: false,
    onEdit: (entry) => console.log('edit', entry),
    onDelete: (entry) => console.log('delete', entry),
  }),
]));
```

(Add `import { el } from '../js/ui/dom.js';` alongside the existing harness imports.)

- [ ] **Step 3: Verify in the browser**

Reload `http://localhost:8090/dev/harness.html`. Confirm: the Company Ledger table shows both entries with a "Person" column and Bob's row shows an "Other" badge next to a blank task name and a clickable "[evidence]" link; the My Logs table shows only Alice's row, has no "Person" column, and has "Edit"/"Delete" buttons that log to the console when clicked.

- [ ] **Step 4: Commit**

```bash
git add js/ui/entries-table.js dev/harness.js
git commit -m "Add shared entries table for My Logs and the Company Ledger"
```

---

### Task 8: `stats-view.js` (My Stats / Company Stats / admin dashboard)

**Files:**
- Create: `js/ui/stats-view.js`
- Modify: `dev/harness.js` (add a stats section)

**Interfaces:**
- Consumes: `Summary`/`Participation` shapes from `js/stats.js` (Task 4), `formatPoints/formatPercent` (Task 3).
- Produces: `buildStatsView(summary, participation = null) => HTMLElement`. Called with `participation: null` for **My Stats** (a single person's numbers); called with a real `Participation` object for **Company Stats** and the **admin dashboard**.

- [ ] **Step 1: Write `js/ui/stats-view.js`**

```js
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
```

- [ ] **Step 2: Add a harness section** — append to `dev/harness.js`

```js
import { buildStatsView } from '../js/ui/stats-view.js';
import { summarizeEntries, summarizeParticipation } from '../js/stats.js';

const summary = summarizeEntries(mockEntries);
const participation = summarizeParticipation(mockEntries, ['alice', 'bob', 'carol']);
document.getElementById('mount').appendChild(buildStatsView(summary, participation));
```

- [ ] **Step 3: Verify in the browser**

Reload the harness. Confirm stat cards show "2/3" contributors, "67%" participation, the category/task breakdown tables list "Culture" and "Learning & Capability" (or "Other" for Bob's custom task), and the impact/proof distribution lists show the right counts (impact: 3:1, 5:1, others 0; proof: 2:1, 3:1, 1:0).

- [ ] **Step 4: Commit**

```bash
git add js/ui/stats-view.js dev/harness.js
git commit -m "Add shared stats view for My Stats, Company Stats, and the admin dashboard"
```

---

### Task 9: `admin-manage.js` (categories & tasks CRUD)

**Files:**
- Create: `js/ui/admin-manage.js`
- Modify: `dev/harness.js` (add an admin-manage section)

**Interfaces:**
- Consumes: `el, field, select` (Task 5).
- Produces: `buildManageView({ categories, tasks, onCreateCategory, onUpdateCategory, onDeleteCategory, onCreateTask, onUpdateTask, onDeleteTask }) => HTMLElement`, where:
  - `categories: Array<{id, name, description, weight, archived, entryCount}>`, `tasks: Array<{id, categoryId, name, description, weight, archived, entryCount}>` — `entryCount` is computed by the caller (`js/main.js`, Task 12) from the loaded entries, and the delete button is disabled whenever `entryCount > 0` (use "Archive" instead).
  - `onCreateCategory({name, description}) => Promise`, `onUpdateCategory(id, {name, description, weight, archived}) => Promise`, `onDeleteCategory(id) => Promise`, and the equivalent three for tasks (`onCreateTask({categoryId, name, description})`, etc.).

- [ ] **Step 1: Write `js/ui/admin-manage.js`**

```js
import { el, field, select, clear, toast } from './dom.js';

function editableRow(item, fields, onUpdate, onDelete) {
  const inputs = {};
  const row = el('tr', {}, [
    ...fields.map(({ key, type = 'text' }) => {
      const input = el('input', { type, value: item[key] });
      inputs[key] = input;
      return el('td', {}, input);
    }),
    el('td', { text: item.archived ? 'Archived' : 'Active' }),
    el('td', {}, [
      el('button', {
        type: 'button', class: 'btn', text: 'Save',
        on: {
          click: () => {
            const patch = {};
            for (const { key, type } of fields) {
              patch[key] = type === 'number' ? Number(inputs[key].value) : inputs[key].value;
            }
            onUpdate(item.id, patch).then(() => toast('Saved.'));
          },
        },
      }),
      el('button', {
        type: 'button', class: 'btn', text: item.archived ? 'Unarchive' : 'Archive',
        on: { click: () => onUpdate(item.id, { archived: !item.archived }).then(() => toast('Updated.')) },
      }),
      el('button', {
        type: 'button', class: 'btn btn-danger', text: 'Delete',
        disabled: item.entryCount > 0,
        title: item.entryCount > 0 ? 'Has logged entries - archive instead of deleting.' : '',
        on: { click: () => onDelete(item.id).then(() => toast('Deleted.')) },
      }),
    ]),
  ]);
  return row;
}

function categoriesPanel(categories, { onCreateCategory, onUpdateCategory, onDeleteCategory }) {
  const nameInput = el('input', { type: 'text', placeholder: 'Category name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add category',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateCategory({ name: nameInput.value, description: descInput.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Category added.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Categories' }),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, categories.map((c) => editableRow(
        c,
        [{ key: 'name' }, { key: 'description' }, { key: 'weight', type: 'number' }],
        onUpdateCategory,
        onDeleteCategory,
      ))),
    ]),
    el('div', { class: 'field' }, [nameInput, descInput, addBtn]),
  ]);
}

function tasksPanel(categories, tasks, { onCreateTask, onUpdateTask, onDeleteTask }) {
  const nameInput = el('input', { type: 'text', placeholder: 'Task name' });
  const descInput = el('input', { type: 'text', placeholder: 'Description' });
  const categorySelect = select(categories.map((c) => ({ value: c.id, label: c.name })), categories[0]?.id ?? '', () => {});
  const addBtn = el('button', {
    type: 'button', class: 'btn btn-primary', text: 'Add task',
    on: {
      click: () => {
        if (!nameInput.value.trim()) return;
        onCreateTask({ categoryId: categorySelect.value, name: nameInput.value, description: descInput.value }).then(() => {
          nameInput.value = ''; descInput.value = '';
          toast('Task added.');
        });
      },
    },
  });

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Tasks' }),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Name', 'Description', 'Weight', 'Status', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, tasks.map((t) => editableRow(
        t,
        [{ key: 'name' }, { key: 'description' }, { key: 'weight', type: 'number' }],
        onUpdateTask,
        onDeleteTask,
      ))),
    ]),
    el('div', { class: 'field' }, [categorySelect, nameInput, descInput, addBtn]),
  ]);
}

export function buildManageView({ categories, tasks, onCreateCategory, onUpdateCategory, onDeleteCategory, onCreateTask, onUpdateTask, onDeleteTask }) {
  return el('div', {}, [
    categoriesPanel(categories, { onCreateCategory, onUpdateCategory, onDeleteCategory }),
    tasksPanel(categories, tasks, { onCreateTask, onUpdateTask, onDeleteTask }),
  ]);
}
```

- [ ] **Step 2: Add a harness section** — append to `dev/harness.js`

```js
import { buildManageView } from '../js/ui/admin-manage.js';

const mockCategories = [
  { id: 'culture', name: 'Culture', description: '', weight: 1, archived: false, entryCount: 1 },
];
const mockTasks = [
  { id: 'culture--team-event', categoryId: 'culture', name: 'Team Culture', description: 'Team events', weight: 1, archived: false, entryCount: 1 },
];

document.getElementById('mount').appendChild(buildManageView({
  categories: mockCategories, tasks: mockTasks,
  onCreateCategory: (c) => { console.log('create category', c); return Promise.resolve(); },
  onUpdateCategory: (id, patch) => { console.log('update category', id, patch); return Promise.resolve(); },
  onDeleteCategory: (id) => { console.log('delete category', id); return Promise.resolve(); },
  onCreateTask: (t) => { console.log('create task', t); return Promise.resolve(); },
  onUpdateTask: (id, patch) => { console.log('update task', id, patch); return Promise.resolve(); },
  onDeleteTask: (id) => { console.log('delete task', id); return Promise.resolve(); },
}));
```

- [ ] **Step 3: Verify in the browser**

Reload the harness. Confirm: the "Team Culture" row's Delete button is disabled (mock `entryCount: 1`) with a tooltip/title about archiving instead; clicking "Archive" logs `update task ... {archived: true}` to the console; typing a new category name and clicking "Add category" logs `create category {...}` and clears the input.

- [ ] **Step 4: Commit**

```bash
git add js/ui/admin-manage.js dev/harness.js
git commit -m "Add admin category/task management view"
```

---

### Task 10: `admin-review.js` (custom-task review queue)

**Files:**
- Create: `js/ui/admin-review.js`
- Modify: `dev/harness.js` (add a review-queue section)

**Interfaces:**
- Consumes: `el, formatDate` (Tasks 3, 5).
- Produces: `buildReviewView(customEntries, { onPromote }) => HTMLElement`, where `customEntries: Array<Entry>` (entries with `isCustomTask === true`) and `onPromote(entry) => Promise` creates a new formal Task pre-filled from `entry`'s free-text task name/description, called when the admin clicks "Add as a task".

- [ ] **Step 1: Write `js/ui/admin-review.js`**

```js
import { el } from './dom.js';
import { formatDate } from '../format.js';

export function buildReviewView(customEntries, { onPromote }) {
  if (customEntries.length === 0) {
    return el('div', { class: 'panel' }, el('p', { class: 'muted', text: 'No "Other" entries to review.' }));
  }

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Custom task review' }),
    el('p', { class: 'muted', text: 'Things employees logged that were not on the task list. Repeated ones are a signal to add a real task.' }),
    el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Date', 'Person', 'Category', 'What they typed', 'Description', ''].map((h) => el('th', { text: h })))),
      el('tbody', {}, customEntries.map((entry) => el('tr', {}, [
        el('td', { text: formatDate(entry.date) }),
        el('td', { text: entry.displayName }),
        el('td', { text: entry.categoryName }),
        el('td', { text: entry.customTaskName || '(no name given)' }),
        el('td', { text: entry.description }),
        el('td', {}, el('button', {
          type: 'button', class: 'btn btn-primary', text: 'Add as a task',
          on: { click: () => onPromote(entry) },
        })),
      ]))),
    ]),
  ]);
}
```

- [ ] **Step 2: Add a harness section** — append to `dev/harness.js`

```js
import { buildReviewView } from '../js/ui/admin-review.js';

const mockCustomEntries = [
  { date: '2026-09-18', displayName: 'Bob', categoryName: 'Learning & Capability', customTaskName: 'Fixed the coffee machine', description: 'Fixed the coffee machine and wrote a guide.' },
];
document.getElementById('mount').appendChild(buildReviewView(mockCustomEntries, {
  onPromote: (entry) => { console.log('promote', entry); return Promise.resolve(); },
}));
```

- [ ] **Step 3: Verify in the browser**

Reload the harness. Confirm the review table shows Bob's "Fixed the coffee machine" row, and clicking "Add as a task" logs `promote {...}` to the console.

- [ ] **Step 4: Commit**

```bash
git add js/ui/admin-review.js dev/harness.js
git commit -m "Add admin custom-task review queue view"
```

---

### Task 11: `firestore.rules` + emulator rules tests

**Files:**
- Create: `firestore.rules`
- Create: `firebase.json`
- Create: `.firebaserc`
- Create: `firestore.rules.test.mjs`
- Modify: `package.json` (add `test:rules` devDependencies)

**Interfaces:**
- No JS interface — this is the server-side enforcement layer described in spec section 6. `js/ui/data.js` (Task 12) writes `entries` docs whose shape must satisfy `isValidEntry()` below, or Firestore rejects the write regardless of what the client believes it computed.

- [ ] **Step 1: Write `firestore.rules`**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isCompanyUser() {
      return isSignedIn() && request.auth.token.email.matches('.*@research-square[.]com$');
    }

    function isAdmin() {
      return isCompanyUser() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    function computedPoints(data) {
      return data.impact * data.proof * data.taskWeight * data.categoryWeight;
    }

    function isValidEntry(data) {
      return data.uid is string &&
        data.impact is number && data.impact >= 1 && data.impact <= 5 &&
        data.proof is number && data.proof >= 1 && data.proof <= 3 &&
        data.taskWeight is number && data.taskWeight > 0 &&
        data.categoryWeight is number && data.categoryWeight > 0 &&
        data.points == computedPoints(data);
    }

    match /entries/{entryId} {
      allow read: if isCompanyUser();
      allow create: if isCompanyUser() &&
        request.resource.data.uid == request.auth.uid &&
        isValidEntry(request.resource.data);
      allow update: if isCompanyUser() &&
        resource.data.uid == request.auth.uid &&
        request.resource.data.uid == request.auth.uid &&
        isValidEntry(request.resource.data);
      allow delete: if isCompanyUser() &&
        (resource.data.uid == request.auth.uid || isAdmin());
    }

    match /categories/{categoryId} {
      allow read: if isCompanyUser();
      allow write: if isAdmin();
    }

    match /tasks/{taskId} {
      allow read: if isCompanyUser();
      allow write: if isAdmin();
    }

    // Every company user can read the directory (names are already visible on
    // every ledger entry, so this adds no new exposure) but may only write
    // their own profile doc.
    match /users/{userId} {
      allow read: if isCompanyUser();
      allow create, update: if isCompanyUser() && request.auth.uid == userId;
      allow delete: if false;
    }

    // No client, including an admin, may ever write here - promoting a user
    // to admin is a manual Firebase-console step (see README).
    match /admins/{uid} {
      allow read: if isCompanyUser() && request.auth.uid == uid;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 2: Write `firebase.json` and `.firebaserc`**

`firebase.json`:
```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": false }
  }
}
```

`.firebaserc`:
```json
{ "projects": { "default": "demo-impact-ledger" } }
```

- [ ] **Step 3: Add devDependencies and the `test:rules` script to `package.json`**

```json
{
  "devDependencies": {
    "firebase": "^10.13.2",
    "firebase-tools": "^13.15.4",
    "@firebase/rules-unit-testing": "^3.0.4"
  }
}
```

(Merge into the existing `package.json` from Task 1 — keep `scripts.test` and `scripts.serve` as they are.)

- [ ] **Step 4: Write `firestore.rules.test.mjs`**

```js
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

let testEnv;

function validEntry(uid) {
  return {
    uid, email: `${uid}@research-square.com`, displayName: uid,
    date: '2026-09-17', categoryId: 'c1', categoryName: 'Culture',
    taskId: 't1', taskName: 'Team event', isCustomTask: false,
    impact: 3, proof: 2, taskWeight: 1, categoryWeight: 1, points: 6,
    description: 'desc',
  };
}

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-impact-ledger',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

test.after(async () => { await testEnv.cleanup(); });
test.beforeEach(async () => { await testEnv.clearFirestore(); });

test('unauthenticated read of entries is rejected', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, 'entries', 'e1')));
});

test('unauthenticated write of entries is rejected', async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('nobody')));
});

test('a non-company-domain user is rejected', async () => {
  const db = testEnv.authenticatedContext('outsider', { email: 'someone@gmail.com' }).firestore();
  await assertFails(getDoc(doc(db, 'entries', 'e1')));
});

test('a company user can create an entry under their own uid', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertSucceeds(setDoc(doc(db, 'entries', 'e1'), validEntry('alice')));
});

test('a company user cannot create an entry under another uid', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), validEntry('bob')));
});

test('a company user cannot create an entry with a tampered points value', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'entries', 'e1'), { ...validEntry('alice'), points: 999 }));
});

test('a company user can read any entry (full company ledger)', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'entries', 'e1'), validEntry('bob'));
  });
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertSucceeds(getDoc(doc(db, 'entries', 'e1')));
});

test('a regular user cannot write to categories', async () => {
  const db = testEnv.authenticatedContext('alice', { email: 'alice@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('an admin can write to categories', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = testEnv.authenticatedContext('admin1', { email: 'admin1@research-square.com' }).firestore();
  await assertSucceeds(setDoc(doc(db, 'categories', 'c1'), { name: 'x', weight: 1, archived: false }));
});

test('no client, including an admin, can write to admins', async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', 'admin1'), { email: 'admin1@research-square.com' });
  });
  const db = testEnv.authenticatedContext('admin1', { email: 'admin1@research-square.com' }).firestore();
  await assertFails(setDoc(doc(db, 'admins', 'admin2'), { email: 'admin2@research-square.com' }));
});
```

- [ ] **Step 5: Attempt to run the rules tests**

Run: `npm install && npm run test:rules`

**Known environment gap:** the Firestore/Auth emulators require a Java runtime (`java`), which is not installed in this development environment (confirmed: `java -version` → command not found). If Java is unavailable, this step will fail to start the emulator, not because the rules are wrong. Do not claim the rules pass without seeing this command's actual output — if it cannot run here, say so explicitly and hand the exact command to the person who deploys this (they need Node + a JRE + `npm install`) as the acceptance test for the brief's "test the rules and confirm both are rejected" requirement.

- [ ] **Step 6: Syntax-check the JS regardless of the emulator**

Run: `node --check firestore.rules.test.mjs`
Expected: no output (valid syntax) — this confirms the test file itself is well-formed even if it cannot execute here.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules firebase.json .firebaserc firestore.rules.test.mjs package.json
git commit -m "Add Firestore security rules and emulator-based rules tests"
```

---

### Task 12: Firebase wiring — `firebase-config.js`, `ui/auth.js`, `ui/data.js`, full `main.js`

**Files:**
- Create: `js/firebase-config.js`
- Create: `js/ui/auth.js`
- Create: `js/ui/data.js`
- Modify: `js/main.js` (replace the static shell from Task 5 with the real composition root)

**Interfaces:**
- `js/firebase-config.js` exports `auth`, `db`, `googleProvider`, `ALLOWED_EMAIL_DOMAIN`.
- `js/ui/auth.js` exports `initAuth({ onSignedIn, onSignedOut, onWrongDomain }) => void` (`onSignedIn({ uid, email, displayName, isAdmin })`), `signIn() => Promise`, `signOutUser() => Promise`.
- `js/ui/data.js` exports the Firestore read/write functions listed in spec section 5, matching the shapes `entries-table.js`, `stats-view.js`, `admin-manage.js`, and `admin-review.js` already expect (Tasks 7–10): `createEntry(payload)`, `updateEntry(id, payload)`, `deleteEntry(id)`, `listenEntries(cb)`, `listenCategories(cb)`, `listenTasks(cb)`, `listenUsers(cb)`, `createCategory(data)`, `updateCategory(id, patch)`, `deleteCategory(id)`, `createTask(data)`, `updateTask(id, patch)`, `deleteTask(id)`, `upsertUserProfile(user)`, `checkIsAdmin(uid)`.

- [ ] **Step 1: Write `js/firebase-config.js`**

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export const ALLOWED_EMAIL_DOMAIN = 'research-square.com';

// This config identifies the Firebase project; it is not a secret. Firebase's
// security model is enforced by Auth + Firestore Rules (firestore.rules), not
// by hiding these values - see the README's "Is this config a secret?" note.
// Replace every value below with this project's config from
// Firebase console > Project settings > General > Your apps > SDK setup.
export const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ hd: ALLOWED_EMAIL_DOMAIN });

if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

- [ ] **Step 2: Write `js/ui/auth.js`**

```js
import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js';
import { auth, googleProvider, db, ALLOWED_EMAIL_DOMAIN } from '../firebase-config.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';

export function signIn() {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser() {
  return signOut(auth);
}

async function upsertUserProfile(user) {
  await setDoc(doc(db, 'users', user.uid), {
    email: user.email,
    displayName: user.displayName || user.email,
    createdAt: new Date().toISOString(),
  }, { merge: true });
}

async function checkIsAdmin(uid) {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

/** onSignedIn({uid, email, displayName, isAdmin}); onWrongDomain(email) fires instead of onSignedIn for a non-company address. */
export function initAuth({ onSignedIn, onSignedOut, onWrongDomain }) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onSignedOut();
      return;
    }
    if (!user.email || !user.email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
      onWrongDomain(user.email);
      await signOut(auth);
      return;
    }
    await upsertUserProfile(user);
    const isAdmin = await checkIsAdmin(user.uid);
    onSignedIn({ uid: user.uid, email: user.email, displayName: user.displayName || user.email, isAdmin });
  });
}
```

- [ ] **Step 3: Write `js/ui/data.js`**

```js
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.13.2/firebase-firestore.js';
import { db } from '../firebase-config.js';
import { computePoints } from '../scoring.js';

function withPoints(payload) {
  return {
    ...payload,
    points: computePoints(payload.impact, payload.proof, payload.taskWeight, payload.categoryWeight),
  };
}

export function createEntry(payload) {
  return addDoc(collection(db, 'entries'), {
    ...withPoints(payload),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateEntry(id, payload) {
  return updateDoc(doc(db, 'entries', id), { ...withPoints(payload), updatedAt: serverTimestamp() });
}

export function deleteEntry(id) {
  return deleteDoc(doc(db, 'entries', id));
}

function listen(collectionName, cb) {
  return onSnapshot(collection(db, collectionName), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export const listenEntries = (cb) => listen('entries', cb);
export const listenCategories = (cb) => listen('categories', cb);
export const listenTasks = (cb) => listen('tasks', cb);
export const listenUsers = (cb) => listen('users', cb);

export function createCategory(data) {
  return addDoc(collection(db, 'categories'), { weight: 1, archived: false, ...data });
}
export function updateCategory(id, patch) {
  return updateDoc(doc(db, 'categories', id), patch);
}
export function deleteCategory(id) {
  return deleteDoc(doc(db, 'categories', id));
}

export function createTask(data) {
  return addDoc(collection(db, 'tasks'), { weight: 1, archived: false, ...data });
}
export function updateTask(id, patch) {
  return updateDoc(doc(db, 'tasks', id), patch);
}
export function deleteTask(id) {
  return deleteDoc(doc(db, 'tasks', id));
}
```

- [ ] **Step 4: Rewrite `js/main.js`** (composition root: auth gate, nav, view routing)

```js
import { el, clear } from './ui/dom.js';
import { initAuth, signIn, signOutUser } from './ui/auth.js';
import * as data from './ui/data.js';
import { buildNav } from './ui/nav.js';
import { buildLogForm } from './ui/log-form.js';
import { buildEntriesTable } from './ui/entries-table.js';
import { buildStatsView } from './ui/stats-view.js';
import { buildManageView } from './ui/admin-manage.js';
import { buildReviewView } from './ui/admin-review.js';
import { summarizeEntries, summarizeParticipation } from './stats.js';

export const APP_VERSION = '0.2.0';

const state = {
  user: null, isAdmin: false,
  categories: [], tasks: [], entries: [], users: [],
  activeTab: 'log',
};

const dom = {};

const EMPLOYEE_TABS = [
  { id: 'log', label: 'Log Effort' },
  { id: 'my-logs', label: 'My Logs' },
  { id: 'ledger', label: 'Company Ledger' },
  { id: 'my-stats', label: 'My Stats' },
  { id: 'company-stats', label: 'Company Stats' },
];
const ADMIN_TABS = [
  { id: 'admin-dashboard', label: 'Admin Dashboard' },
  { id: 'admin-manage', label: 'Manage Tasks & Categories' },
  { id: 'admin-review', label: 'Custom Task Review' },
];

function tabsFor(state) {
  return state.isAdmin ? [...EMPLOYEE_TABS, ...ADMIN_TABS] : EMPLOYEE_TABS;
}

function activeCategories() { return state.categories.filter((c) => !c.archived); }
function activeTasks() { return state.tasks.filter((t) => !t.archived); }

function withEntryCounts(items, key) {
  return items.map((item) => ({
    ...item,
    entryCount: state.entries.filter((e) => e[key] === item.id).length,
  }));
}

function renderView() {
  clear(dom.main);
  const view = { log: renderLog, 'my-logs': renderMyLogs, ledger: renderLedger,
    'my-stats': renderMyStats, 'company-stats': renderCompanyStats,
    'admin-dashboard': renderAdminDashboard, 'admin-manage': renderAdminManage,
    'admin-review': renderAdminReview }[state.activeTab];
  dom.main.appendChild(view());
}

function renderLog() {
  return buildLogForm({
    categories: activeCategories(), tasks: activeTasks(),
    onSubmit: (draft) => {
      const category = state.categories.find((c) => c.id === draft.categoryId);
      const task = state.tasks.find((t) => t.id === draft.taskId);
      return data.createEntry({
        uid: state.user.uid, email: state.user.email, displayName: state.user.displayName,
        date: draft.date, categoryId: draft.categoryId, categoryName: draft.categoryName,
        taskId: draft.isCustomTask ? 'custom' : draft.taskId,
        taskName: draft.isCustomTask ? '' : draft.taskName,
        isCustomTask: draft.isCustomTask, customTaskName: draft.customTaskName,
        impact: draft.impact, proof: draft.proof,
        taskWeight: task?.weight ?? 1, categoryWeight: category?.weight ?? 1,
        description: draft.description, evidenceUrl: draft.evidenceUrl,
      }).then(() => ({
        points: draft.impact * draft.proof * (task?.weight ?? 1) * (category?.weight ?? 1),
      }));
    },
  });
}

function renderMyLogs() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  return buildEntriesTable(own, {
    showOwner: false,
    onDelete: (entry) => data.deleteEntry(entry.id),
  });
}

function renderLedger() {
  return buildEntriesTable(state.entries);
}

function renderMyStats() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  return buildStatsView(summarizeEntries(own));
}

function renderCompanyStats() {
  const summary = summarizeEntries(state.entries);
  const participation = summarizeParticipation(state.entries, state.users.map((u) => u.id));
  return buildStatsView(summary, participation);
}

function renderAdminDashboard() {
  return renderCompanyStats();
}

function renderAdminManage() {
  return buildManageView({
    categories: withEntryCounts(state.categories, 'categoryId'),
    tasks: withEntryCounts(state.tasks, 'taskId'),
    onCreateCategory: data.createCategory,
    onUpdateCategory: data.updateCategory,
    onDeleteCategory: data.deleteCategory,
    onCreateTask: data.createTask,
    onUpdateTask: data.updateTask,
    onDeleteTask: data.deleteTask,
  });
}

function renderAdminReview() {
  const customEntries = state.entries.filter((e) => e.isCustomTask);
  return buildReviewView(customEntries, {
    onPromote: (entry) => data.createTask({
      categoryId: entry.categoryId, name: entry.customTaskName, description: entry.description,
    }),
  });
}

function buildSignedInHeader() {
  return el('div', { class: 'header-actions' }, [
    el('span', { class: 'muted', text: state.user.displayName }),
    el('button', { class: 'btn', type: 'button', text: 'Sign out', on: { click: signOutUser } }),
  ]);
}

function buildSignedOutHeader() {
  return el('div', { class: 'header-actions' },
    el('button', { class: 'btn btn-primary', type: 'button', text: 'Sign in', on: { click: signIn } }));
}

function renderShell() {
  clear(document.body);
  const headerActions = state.user ? buildSignedInHeader() : buildSignedOutHeader();
  document.body.append(
    el('header', { class: 'app-header' }, [
      el('div', { class: 'brand' }, [
        el('img', { class: 'brand__logo', src: 'assets/favicon.svg', alt: '' }),
        el('span', { class: 'brand__name', text: 'Impact Ledger' }),
      ]),
      headerActions,
    ]),
    state.user ? buildNav(tabsFor(state), state.activeTab, (id) => { state.activeTab = id; renderView(); }) : null,
    dom.main = el('main', { class: 'app-main' },
      state.user ? [] : el('p', { class: 'muted', text: 'Sign in with your @research-square.com account to continue.' })),
    el('footer', { class: 'app-footer' }, [
      el('span', { text: 'Research Square Engineering Services - pilot.' }),
      el('span', { text: `v${APP_VERSION}` }),
    ]),
  );
  if (state.user) renderView();
}

let unsubscribers = [];
function subscribeToData() {
  unsubscribers.push(data.listenCategories((categories) => { state.categories = categories; renderView(); }));
  unsubscribers.push(data.listenTasks((tasks) => { state.tasks = tasks; renderView(); }));
  unsubscribers.push(data.listenEntries((entries) => { state.entries = entries; renderView(); }));
  if (state.isAdmin) {
    unsubscribers.push(data.listenUsers((users) => { state.users = users; renderView(); }));
  }
}

initAuth({
  onSignedIn: ({ uid, email, displayName, isAdmin }) => {
    state.user = { uid, email, displayName };
    state.isAdmin = isAdmin;
    state.activeTab = 'log';
    renderShell();
    subscribeToData();
  },
  onSignedOut: () => {
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
    state.user = null; state.isAdmin = false;
    state.categories = []; state.tasks = []; state.entries = []; state.users = [];
    renderShell();
  },
  onWrongDomain: (email) => {
    renderShell();
    dom.main.appendChild(el('div', { class: 'banner banner-danger',
      text: `${email} is not a research-square.com address. Sign in with your company account.` }));
  },
});

renderShell();
```

- [ ] **Step 5: Syntax-check**

Run: `node --check js/firebase-config.js && node --check js/ui/auth.js && node --check js/ui/data.js && node --check js/main.js`
Expected: no output from any of the four (all syntactically valid). Note: this does not execute the Firebase imports (those resolve at runtime in a browser), it only confirms there are no JS syntax errors.

- [ ] **Step 6: Manual verification (requires Java + firebase-tools, or a real Firebase project)**

This cannot be executed in an environment without a JRE (see Task 11, Step 5). Document, do not fabricate, results: once Java/firebase-tools or a real project is available, start the emulators (`firebase emulators:start`) or point `firebase-config.js` at a real project, serve the app (`npm run serve`), and confirm:
- An unauthenticated visitor sees only "Sign in with your @research-square.com account to continue."
- Signing in with a non-`@research-square.com` test account shows the wrong-domain banner and does not reach the nav.
- Signing in with a `@research-square.com` test account shows the employee tabs (no admin tabs) and can submit an entry via "Log Effort", see it appear in "My Logs" and "Company Ledger", and see stats update in "My Stats"/"Company Stats".
- Adding that uid to `admins` (console or emulator UI) and reloading reveals the three admin tabs.

- [ ] **Step 7: Commit**

```bash
git add js/firebase-config.js js/ui/auth.js js/ui/data.js js/main.js
git commit -m "Wire Firebase Auth and Firestore into the composition root"
```

---

### Task 13: Seed data from the spreadsheet

**Files:**
- Create: `seed/extract.py`
- Create: `seed/tasks-and-categories.json` (generated)
- Create: `seed/seed.mjs`
- Modify: `package.json` (devDependency `firebase-admin`)

**Interfaces:**
- `seed/tasks-and-categories.json` shape: `{ categories: Array<{id, name, description, weight, archived, order}>, tasks: Array<{id, categoryId, name, description, weight, archived, order}> }` — this is the exact shape `data.createCategory`/`data.createTask` (Task 12) write to Firestore.

- [ ] **Step 1: Write `seed/extract.py`**

```python
"""One-time conversion of reference/Tasks and Catergories.xlsx into
seed/tasks-and-categories.json. Dev-only tool - not shipped to GitHub Pages.
Only the Category / Tasks / Purpose columns are used; the owner-assignment
and rationale columns belong to a separate, unrelated exercise (see the
design spec, section 2.B) and are dropped.
"""
import json
import re
import sys

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "reference/Tasks and Catergories.xlsx"
OUT = "seed/tasks-and-categories.json"


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def main():
    wb = openpyxl.load_workbook(SRC, data_only=True)
    ws = wb["Tasks"]

    categories = {}
    tasks = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or row[1] is None or row[2] is None:
            continue
        _, category_name, task_name, purpose, _rationale = row[:5]
        cat_id = slugify(category_name)
        if cat_id not in categories:
            categories[cat_id] = {
                "id": cat_id,
                "name": category_name.strip(),
                "description": "",
                "weight": 1,
                "archived": False,
                "order": len(categories),
            }
        tasks.append({
            "id": f"{cat_id}--{slugify(task_name)}",
            "categoryId": cat_id,
            "name": task_name.strip(),
            "description": (purpose or "").strip(),
            "weight": 1,
            "archived": False,
            "order": len(tasks),
        })

    data = {"categories": list(categories.values()), "tasks": tasks}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Wrote {len(data['categories'])} categories and {len(data['tasks'])} tasks to {OUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it**

Run: `python seed/extract.py`
Expected: `Wrote 10 categories and 67 tasks to seed/tasks-and-categories.json`

- [ ] **Step 3: Verify the JSON's shape and counts**

Run:
```bash
node --input-type=module -e "
import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('seed/tasks-and-categories.json'));
console.assert(d.categories.length === 10, 'expected 10 categories, got ' + d.categories.length);
console.assert(d.tasks.length === 67, 'expected 67 tasks, got ' + d.tasks.length);
console.assert(d.tasks.every((t) => d.categories.some((c) => c.id === t.categoryId)), 'every task must reference a real category');
console.log('seed data ok');
"
```
Expected: `seed data ok` with no assertion failures printed above it.

- [ ] **Step 4: Write `seed/seed.mjs`**

```js
// One-time upload of seed/tasks-and-categories.json into a real Firestore
// project. Dev-only - never runs in the shipped app.
// Usage: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed/seed.mjs
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const data = JSON.parse(readFileSync(new URL('./tasks-and-categories.json', import.meta.url)));

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const batch = db.batch();
for (const category of data.categories) {
  batch.set(db.collection('categories').doc(category.id), category);
}
for (const task of data.tasks) {
  batch.set(db.collection('tasks').doc(task.id), task);
}
await batch.commit();
console.log(`Seeded ${data.categories.length} categories and ${data.tasks.length} tasks.`);
```

- [ ] **Step 5: Add the devDependency**

Add `"firebase-admin": "^12.6.0"` to `package.json`'s `devDependencies`.

- [ ] **Step 6: Syntax-check**

Run: `node --check seed/seed.mjs`
Expected: no output (valid syntax). Do not attempt to actually run it here — it requires a real Firebase project and service-account credentials that don't exist yet.

- [ ] **Step 7: Commit**

```bash
git add seed/ package.json
git commit -m "Add task/category seed extraction and upload scripts"
```

---

### Task 14: README, CHANGELOG, and the manual QA runbook

**Files:**
- Create: `README.md`
- Create: `CHANGELOG.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Impact Ledger

A pilot tool for Research Square Engineering Services to measure what
engineers consider "extra effort" outside normal engineering work. Employees
log contributions (category, task, impact, proof, description); everyone can
browse the full company ledger and stats; admins manage the task/category
list, weights, and a review queue for anything logged as "Other".

No money, tax, tenure, ranking, or bonus logic in this version - it is
explicitly a measurement instrument. See `docs/superpowers/specs/2026-09-19-impact-ledger-design.md`
for the full design rationale.

## Architecture

Static HTML/CSS/JS, hosted free on GitHub Pages. No build step, no bundler.
Firebase (Authentication + Firestore) is loaded via its official CDN
ES-module URLs. All logic runs client-side against Firebase; there is no
custom server.

## 1. Firebase project setup (one-time, by a Research Square admin)

1. Go to https://console.firebase.google.com and create a new project.
2. **Authentication > Sign-in method**: enable **Google**.
3. **Authentication > Settings > Authorized domains**: add your GitHub Pages
   domain (e.g. `<org>.github.io`) and `localhost` for local testing.
4. **Firestore Database**: create a database in production mode, in a region
   close to your team.
5. **Project settings > General > Your apps**: add a Web app, copy the config
   object it gives you into `js/firebase-config.js`, replacing every
   `REPLACE_ME` value.

**Is the Firebase config a secret?** No. `apiKey` and friends identify which
Firebase project a request is for; they are meant to be public and ship in
every Firebase web app's client bundle. The actual security boundary is
`firestore.rules` (deployed in step 2) plus Firebase Authentication - never
the config object.

## 2. Deploy the security rules

```bash
npm install -g firebase-tools   # one-time
firebase login
firebase deploy --only firestore:rules --project <your-project-id>
```

This deploys `firestore.rules`, which enforces (server-side, not just in this
app's JS):
- every read/write requires sign-in with an `@research-square.com` address
- a user may create/update/delete only their own `entries` doc
- any signed-in company user may read all `entries`, `categories`, `tasks`,
  and `users` (the full ledger and directory are intentionally open to
  everyone - see the design spec, section 2.B)
- only a UID listed in `admins` may write `categories`/`tasks`
- **no client can ever write to `admins`**, including an existing admin

## 3. Seed the first admin

There is no UI for this by design - the rules block every client write to
`admins`, so it has to be done once, by hand, in the Firebase console:

1. Sign in to the deployed app once with the intended admin's
   `@research-square.com` account (so their `users` doc and UID exist).
2. In the Firebase console, go to **Firestore Database**, open the `admins`
   collection (create it if it doesn't exist yet), and add a document whose
   **document ID is that person's UID** (find it under **Authentication >
   Users**) with a single field `email: "their@research-square.com"`.
3. Reload the app signed in as that person - the admin tabs should appear.

## 4. Seed the task/category list

```bash
pip install openpyxl
python seed/extract.py            # regenerates seed/tasks-and-categories.json from the spreadsheet
npm install
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed/seed.mjs
```

(Get `service-account.json` from **Project settings > Service accounts >
Generate new private key**. Never commit it - it's already in `.gitignore`.)

## Running it locally

```bash
npm run serve
```

Then open http://localhost:8090/. When `location.hostname` is `localhost`,
`js/firebase-config.js` automatically points Auth and Firestore at the local
emulators instead of your real project (see "Tests" below) - so local runs
never touch production data.

There's also `dev/harness.html`, a Firebase-free page that mounts every view
with mock data, useful for checking UI changes without any backend at all.

## Tests

Pure logic (`js/scoring.js`, `js/validation.js`, `js/format.js`,
`js/stats.js`) is DOM-free and runs under Node's built-in test runner, with
nothing to install:

```bash
npm test
```

The Firestore security rules are tested against the local Firebase Emulator
Suite, which requires a Java runtime (JRE 11+) in addition to Node:

```bash
npm install
npm run test:rules
```

This spins up a local, ephemeral Firestore emulator (no real project
touched) and asserts, per the brief's non-negotiable requirement:
- an unauthenticated request cannot read or write `entries`
- a signed-in user from outside `@research-square.com` is rejected
- a regular user can create an entry only under their own UID, cannot forge
  another user's UID or a tampered points value, and cannot write to
  `categories`/`tasks`/`admins`
- an admin can write `categories`/`tasks` but still cannot write `admins`

## Manual QA checklist (before going live)

Run this once against the real deployed app, with two real test accounts (a
regular employee and an admin):

- [ ] Visiting the site signed out shows only the sign-in prompt.
- [ ] Signing in with a non-`@research-square.com` account is rejected with
      a visible message and does not reach the app.
- [ ] A regular employee can log an entry, see it in "My Logs" and edit/
      delete it there, see it (and everyone else's) in "Company Ledger",
      and see "My Stats"/"Company Stats" update.
- [ ] A regular employee does **not** see the admin tabs and cannot reach
      `categories`/`tasks` write operations (try editing a task's weight
      from the browser console while signed in as a non-admin - it should
      be rejected by Firestore, not just hidden in the UI).
- [ ] An admin sees the admin tabs, can add/edit/archive a category or task
      and set its weight, and can promote a custom "Other" entry into a
      real task.
- [ ] Attempt an unauthenticated read via `curl` against the Firestore REST
      API for this project and confirm it is rejected (403), proving the
      rule is enforced server-side and not just hidden in this app's JS.

## Code layout

```
index.html                 the shell; everything else is built by JS
css/tokens.css              Research Square palette as light/dark custom properties
css/layout.css              header, nav, main, footer
css/components.css          buttons, forms, tables, tabs, banners, pickers
css/patterns.css            cross-cutting layout fixes (tooltip clipping, etc.)
js/scoring.js                pure: points formula, impact/proof level text
js/validation.js             pure: entry-draft validation
js/format.js                 pure: date/number/percent formatting
js/stats.js                  pure: participation and breakdown aggregation
js/firebase-config.js        Firebase app/auth/db init (public config)
js/ui/dom.js                  small DOM helpers (vendored from the detronics-app skill)
js/ui/auth.js                  sign-in/out, domain check, admin check
js/ui/data.js                  Firestore reads/writes
js/ui/nav.js, log-form.js, entries-table.js, stats-view.js, admin-manage.js, admin-review.js
                               view modules - each takes plain data + callbacks, no Firebase import
js/main.js                    composition root: auth gate, nav, view routing
tests/                        node --test over the pure modules
dev/harness.html, harness.js   Firebase-free manual test page for the view modules
seed/                          spreadsheet -> Firestore seed data (dev-only)
firestore.rules                security rules (deploy with `firebase deploy --only firestore:rules`)
firestore.rules.test.mjs       emulator-based rules tests (needs Java)
```

## Privacy

Unlike a typical offline Detronics tool, this app's entire purpose is a
shared, authenticated company ledger, so **data does leave the browser** -
every entry, and this account's identity, is sent to Firebase (Google Cloud)
and is readable by every signed-in `@research-square.com` teammate (that's
the point - see the design spec, section 2.B) and by Google as the
infrastructure provider under Firebase's own terms. Fonts are loaded from
Google Fonts (a small, disclosed third-party request beyond Firebase, purely
for the Space Grotesk/Inter typefaces). Nothing is sent to any other
third party, there is no analytics, and there is no server beyond Firebase.

## Deploying to GitHub Pages

Push to `main`, then **Settings > Pages > Deploy from a branch > `main` /
`(root)`**. `.nojekyll` is already present. There is nothing to build.

## Licence

Internal Research Square tool - not published.
```

- [ ] **Step 2: Write `CHANGELOG.md`**

```markdown
# Changelog

## Unreleased
- Initial pilot build: log-effort form, My Logs, Company Ledger, My Stats,
  Company Stats, admin dashboard, task/category management with weights,
  and a custom-task review queue.
```

- [ ] **Step 3: Commit**

```bash
git add README.md CHANGELOG.md
git commit -m "Add setup instructions, manual QA checklist, and changelog"
```

---

## Self-Review Notes (completed during planning)

- **Spec coverage:** every numbered section of the design spec maps to a task — visual identity (5), architecture/data model (11, 12), security rules (11), scoring (1), screens (6–10, 12), admin (9, 10, 12), testing (1–4, 11), seed data (13), deliverables (11, 12, 13, 14).
- **Known, disclosed gap:** Tasks 11 and 12's live-Firebase verification steps cannot be executed in this development environment (no Java for the emulator, no real Firebase project). Every other task is fully testable here. This is called out explicitly in each affected step and in the README's manual QA checklist, rather than claimed as passing.
- **Type consistency check:** `Entry` fields (`categoryName`, `taskName`, `isCustomTask`, `impact`, `proof`, `points`, `uid`, `displayName`, `date`, `evidenceUrl`, `customTaskName`) are used identically across `entries-table.js` (7), `stats.js` (4)/`stats-view.js` (8), `admin-review.js` (10), and `main.js` (12). `Category`/`Task` fields (`id`, `name`, `description`, `weight`, `archived`, `categoryId`) match between `admin-manage.js` (9), `data.js` (12), and `seed/extract.py` (13)'s output shape.
