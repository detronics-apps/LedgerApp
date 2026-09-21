import { el, clear, toast, field, select, download } from './ui/dom.js';
import { initAuth, signIn, signOutUser } from './ui/auth.js';
import * as data from './ui/data.js';
import { buildNav } from './ui/nav.js';
import { buildLogForm } from './ui/log-form.js';
import { buildEntriesTable } from './ui/entries-table.js';
import { buildStatsView, buildUserBreakdownTable } from './ui/stats-view.js';
import { buildManageView } from './ui/admin-manage.js';
import { buildReviewView } from './ui/admin-review.js';
import { buildHowTo } from './ui/how-to.js';
import { buildSettingsView } from './ui/admin-settings.js';
import { summarizeEntries, summarizeParticipation, summarizeByUser } from './stats.js';
import { computePoints } from './scoring.js';
import { checkSubmissionLimits, DEFAULT_SETTINGS, categoryWeightFor, summarizeRecentActivity } from './limits.js';
import { formatDate } from './format.js';
import { entriesToCsv } from './csv.js';
import { FLAG_STATUSES, flagReasonLabel, flagStatusLabel, hasActiveFlagFrom } from './flags.js';

export const APP_VERSION = '0.5.6';

const THEME_KEY = 'impact-ledger-theme';
const THEME_ORDER = ['system', 'light', 'dark'];
const THEME_LABEL = { system: 'Theme: System (system, light or dark)', light: 'Theme: Light (system, light or dark)', dark: 'Theme: Dark (system, light or dark)' };
const THEME_ICON = { system: '◐', light: '☀', dark: '☾' };

function loadTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (THEME_ORDER.includes(saved)) return saved;
  } catch { /* localStorage unavailable - fall through to default */ }
  return 'system';
}

function applyTheme(theme) {
  if (theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme);
}

const DEFAULT_LEDGER_FILTERS = { enabled: true, dateStart: '', dateEnd: '', categoryId: 'all', taskId: 'all' };

const state = {
  user: null, isAdmin: false, adminCategoryIds: [],
  categories: [], tasks: [], entries: [], users: [], flags: [], admins: [],
  leaderboardCategoryId: 'all',
  ledgerFilters: { ...DEFAULT_LEDGER_FILTERS },
  settings: DEFAULT_SETTINGS,
  activeTab: 'log',
  wrongDomainEmail: null,
  editingEntry: null,
  relogDraft: null,
  authError: null,
  theme: loadTheme(),
};
applyTheme(state.theme);

function sortedByDateDesc(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** How many of the signed-in user's own entries already fall on the date
 * they're about to log, and their week (by that date) so far. Delegates to
 * the pure summarizeRecentActivity() in limits.js. */
function myRecentActivity(forDate) {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  return summarizeRecentActivity(own, forDate);
}

const dom = {};

// Grouped by kind, not alphabetically: the employee's own pages, then company-wide pages,
// then the help tab - each group fenced off with a hairline (see nav.js's `sep` entries).
const EMPLOYEE_TABS = [
  { id: 'log', label: 'Log Effort' },
  { id: 'my-logs', label: 'My Logs' },
  { id: 'my-stats', label: 'My Stats' },
  { sep: true },
  { id: 'ledger', label: 'Company Ledger' },
  { id: 'company-stats', label: 'Company Stats' },
  { sep: true },
  { id: 'how-to', label: 'How to use' },
];
const ADMIN_TABS = [
  { id: 'admin-dashboard', label: 'Admin Dashboard' },
  { id: 'admin-manage', label: 'Manage Tasks & Categories' },
  { id: 'leaderboard', label: 'Leaderboard' },
  { id: 'admin-review', label: 'Custom Task Review' },
  { id: 'admin-settings', label: 'Settings' },
];

function isScopedAdmin() { return !state.isAdmin && state.adminCategoryIds.length > 0; }

function tabsFor(state) {
  if (state.isAdmin) return [...EMPLOYEE_TABS, { sep: true }, ...ADMIN_TABS];
  if (isScopedAdmin()) {
    return [...EMPLOYEE_TABS, { sep: true },
      { id: 'admin-dashboard', label: 'Admin Dashboard' },
      { id: 'admin-manage', label: 'Manage Tasks & Categories' },
      { id: 'leaderboard', label: 'Leaderboard' },
    ];
  }
  return EMPLOYEE_TABS;
}

/** Every admin (full or category-scoped) reaches the Admin Dashboard; a scoped
 * admin's copy is itself scoped to their own categories - same filtering the
 * Leaderboard already applies. */
function dashboardEntries() {
  return isScopedAdmin() ? state.entries.filter((e) => state.adminCategoryIds.includes(e.categoryId)) : state.entries;
}

function dashboardFlags() {
  return isScopedAdmin() ? state.flags.filter((f) => state.adminCategoryIds.includes(f.categoryId)) : state.flags;
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
    'my-stats': renderMyStats, 'company-stats': renderCompanyStats, 'how-to': () => buildHowTo(state.settings, { isAdmin: state.isAdmin, isScopedAdmin: isScopedAdmin() }),
    'admin-dashboard': renderAdminDashboard, 'admin-manage': renderAdminManage,
    'leaderboard': renderLeaderboard,
    'admin-review': renderAdminReview, 'admin-settings': renderAdminSettings }[state.activeTab];
  dom.main.appendChild(view());
}

function renderLog() {
  const editing = state.editingEntry;
  const relog = !editing && state.relogDraft;
  const initialValues = editing ? { ...editing } : relog ? { ...relog, date: new Date().toISOString().slice(0, 10) } : null;
  return buildLogForm({
    categories: activeCategories(), tasks: activeTasks(),
    initialValues,
    onCancel: editing ? () => { state.editingEntry = null; renderView(); } : null,
    onSubmit: (draft) => {
      const category = state.categories.find((c) => c.id === draft.categoryId);
      const task = state.tasks.find((t) => t.id === draft.taskId);
      const taskWeight = task?.weight ?? 1;
      const categoryWeight = categoryWeightFor(category, state.settings);
      const prospectivePoints = computePoints(draft.impact, draft.proof, taskWeight, categoryWeight);

      if (!editing) {
        const { allowed, errors } = checkSubmissionLimits({
          impact: draft.impact, prospectivePoints, settings: state.settings,
          ...myRecentActivity(draft.date),
        });
        if (!allowed) return Promise.reject(new Error(errors[0]));
      }

      const payload = {
        uid: state.user.uid, email: state.user.email, displayName: state.user.displayName,
        date: draft.date, categoryId: draft.categoryId, categoryName: draft.categoryName,
        taskId: draft.isCustomTask ? 'custom' : draft.taskId,
        taskName: draft.isCustomTask ? '' : draft.taskName,
        isCustomTask: draft.isCustomTask, customTaskName: draft.customTaskName,
        impact: draft.impact, proof: draft.proof,
        taskWeight, categoryWeight,
        description: draft.description, evidenceUrl: draft.evidenceUrl,
      };
      const write = editing ? data.updateEntry(editing.id, payload) : data.createEntry(payload);
      return write.then(() => {
        state.editingEntry = null;
        state.relogDraft = null;
        return { points: prospectivePoints };
      });
    },
  });
}

function renderMyLogs() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  return el('div', {}, [
    buildEntriesTable(sortedByDateDesc(own), {
      showOwner: false,
      onRelog: (entry) => { state.relogDraft = entry; state.activeTab = 'log'; renderShell(); },
      onEdit: (entry) => { state.editingEntry = entry; state.activeTab = 'log'; renderShell(); },
      onDelete: (entry) => data.deleteEntry(entry.id).catch(() => toast('Could not delete - try again.')),
    }),
    renderMyFlags(),
  ].filter(Boolean));
}

function renderMyFlags() {
  const mine = state.flags.filter((f) => f.flaggedBy === state.user.uid);
  if (mine.length === 0) return null;
  return el('div', { class: 'panel' }, [
    el('h3', { text: "Entries you've flagged" }),
    el('p', { class: 'muted', text: 'Status updates here as an admin looks into these.' }),
    el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
      el('thead', {}, el('tr', {}, ['Date', 'Category', 'Task', 'Reason', 'Status'].map((h) => el('th', { text: h })))),
      el('tbody', {}, mine.map((flag) => {
        const entry = state.entries.find((e) => e.id === flag.entryId);
        return el('tr', {}, [
          el('td', { text: entry ? formatDate(entry.date) : '' }),
          el('td', { text: entry ? entry.categoryName : '(entry no longer exists)' }),
          el('td', { text: entry ? (entry.isCustomTask ? (entry.customTaskName || 'Other') : entry.taskName) : '' }),
          el('td', { text: flagReasonLabel(flag.reason) }),
          el('td', { text: flagStatusLabel(flag.status) }),
        ]);
      })),
    ])),
  ]);
}

function renderLedger() {
  const canSeeIdentity = state.isAdmin || isScopedAdmin();
  // Deletion is destructive in a way editing isn't, so it stays reserved for
  // full ("All categories") admins - a category-scoped admin never sees it,
  // even for their own category. Matches firestore.rules' delete rule.
  const showDeleteColumn = state.isAdmin;
  const f = state.ledgerFilters;

  const categoryOptions = [{ value: 'all', label: 'All categories' }, ...state.categories.map((c) => ({ value: c.id, label: c.name }))];
  const tasksForFilter = f.categoryId === 'all' ? state.tasks : state.tasks.filter((t) => t.categoryId === f.categoryId);
  const taskOptions = [{ value: 'all', label: 'All tasks' }, ...tasksForFilter.map((t) => ({ value: t.id, label: t.name }))];
  if (!taskOptions.some((o) => o.value === f.taskId)) f.taskId = 'all';

  const filtered = !f.enabled ? state.entries : state.entries.filter((e) =>
    (!f.dateStart || e.date >= f.dateStart) &&
    (!f.dateEnd || e.date <= f.dateEnd) &&
    (f.categoryId === 'all' || e.categoryId === f.categoryId) &&
    (f.taskId === 'all' || e.taskId === f.taskId));

  const startInput = el('input', { type: 'date', value: f.dateStart, disabled: !f.enabled, on: { change: (e) => { f.dateStart = e.target.value; renderView(); } } });
  const endInput = el('input', { type: 'date', value: f.dateEnd, disabled: !f.enabled, on: { change: (e) => { f.dateEnd = e.target.value; renderView(); } } });
  const categorySelect = select(categoryOptions, f.categoryId, (value) => { f.categoryId = value; f.taskId = 'all'; renderView(); }, { disabled: !f.enabled });
  const taskSelect = select(taskOptions, f.taskId, (value) => { f.taskId = value; renderView(); }, { disabled: !f.enabled });
  const toggleBtn = el('button', {
    type: 'button', class: 'btn', text: f.enabled ? 'Turn filters off' : 'Turn filters on',
    on: { click: () => { f.enabled = !f.enabled; renderView(); } },
  });
  const clearBtn = el('button', {
    type: 'button', class: 'btn', text: 'Clear filters',
    on: { click: () => { state.ledgerFilters = { ...DEFAULT_LEDGER_FILTERS }; renderView(); } },
  });

  return el('div', {}, [
    el('details', { class: 'panel explain', open: true }, [
      el('summary', { text: 'Filters' }),
      field('From', startInput),
      field('To', endInput),
      field('Category', categorySelect),
      field('Task', taskSelect),
      el('div', { class: 'btn-row' }, [toggleBtn, clearBtn]),
    ]),
    buildEntriesTable(sortedByDateDesc(filtered), {
      // Nobody but an admin sees real names/emails unless anonymized identifiers
      // are turned on for everyone else (settings.anonymizeLedgerEnabled) - the
      // column is hidden entirely otherwise, not just shown with real identity.
      showOwner: canSeeIdentity || state.settings.anonymizeLedgerEnabled,
      anonymize: state.settings.anonymizeLedgerEnabled && !canSeeIdentity,
      showPoints: false,
      onDelete: showDeleteColumn ? (entry) => data.deleteEntry(entry.id).catch((err) => toast(err.message || 'Could not delete - try again.')) : null,
      onFlag: (entry, { reason, note }) => data.submitFlag(entry.id, entry.categoryId, { reason, note, flaggedBy: state.user.uid, flaggedByEmail: state.user.email })
        .then(() => toast('Flag submitted - thanks for helping keep this fair.'))
        .catch((err) => toast(err.message || 'Could not submit flag.')),
      currentUid: state.user.uid,
      hasMyActiveFlag: (entry) => hasActiveFlagFrom(state.flags, entry.id, state.user.uid),
    }),
  ]);
}

function renderMyStats() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  const ranked = summarizeByUser(state.entries, state.users);
  const rank = ranked.findIndex((r) => r.uid === state.user.uid) + 1;
  const rankPanel = rank > 0 ? el('div', { class: 'panel' }, [
    el('h3', { text: 'Your ranking' }),
    el('p', {}, `You're #${rank} of ${ranked.length} people company-wide, based on total points.`),
  ]) : null;
  return el('div', {}, [rankPanel, buildStatsView(summarizeEntries(own))].filter(Boolean));
}

function renderCompanyStats() {
  const summary = summarizeEntries(state.entries);
  const participation = summarizeParticipation(state.entries, state.users.map((u) => u.id));
  return buildStatsView(summary, participation, { hidePoints: true, hideTaskBreakdown: true });
}

function renderNeedsValidation(entries) {
  if (!state.settings.managementValidationEnabled) return null;
  const flagged = entries.filter((e) => !e.validated && e.points >= state.settings.managementValidationThreshold);
  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Needs validation' }),
    el('p', { class: 'muted', text: `Entries worth ${state.settings.managementValidationThreshold}+ points, not yet validated.` }),
    flagged.length === 0
      ? el('p', { class: 'muted', text: 'Nothing waiting.' })
      : el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Date', 'Person', 'Task', 'Points', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, flagged.map((entry) => el('tr', {}, [
            el('td', { text: formatDate(entry.date) }),
            el('td', { text: entry.displayName }),
            el('td', { text: entry.isCustomTask ? (entry.customTaskName || 'Other') : entry.taskName }),
            el('td', { class: 'value', text: String(entry.points) }),
            el('td', {}, el('button', {
              type: 'button', class: 'btn btn-primary', text: 'Validate',
              on: { click: () => data.validateEntry(entry.id).catch((err) => toast(err.message || 'Could not validate.')) },
            })),
          ]))),
        ])),
  ]);
}

function renderAdminDashboard() {
  const entries = dashboardEntries();
  const summary = summarizeEntries(entries);
  const participation = summarizeParticipation(entries, state.users.map((u) => u.id));
  const userBreakdown = summarizeByUser(entries, state.users);
  return el('div', {}, [
    buildStatsView(summary, participation),
    el('div', { class: 'panel' }, [
      el('h3', { text: 'By person' }),
      buildUserBreakdownTable(userBreakdown),
    ]),
    renderFlaggedEntries(),
    renderNeedsValidation(entries),
    renderExportPanel(entries),
  ].filter(Boolean));
}

function renderFlaggedEntries() {
  const activeFlags = dashboardFlags().filter((f) => f.status === 'open' || f.status === 'under-review');
  const byEntry = new Map();
  for (const flag of activeFlags) {
    if (!byEntry.has(flag.entryId)) byEntry.set(flag.entryId, []);
    byEntry.get(flag.entryId).push(flag);
  }
  const rows = [...byEntry.entries()]
    .map(([entryId, entryFlags]) => ({ entry: state.entries.find((e) => e.id === entryId), entryFlags }))
    .filter((r) => r.entry); // a flagged entry that's since been deleted has nothing left to show

  const settableStatuses = FLAG_STATUSES.filter((s) => s.value !== 'open');

  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Flagged entries' }),
    el('p', { class: 'muted', text: "Raised by colleagues asking for a second look - the point is catching honest mistakes together, not calling anyone out. Whoever raised it is never shown to the entry's owner." }),
    rows.length === 0
      ? el('p', { class: 'muted', text: 'Nothing flagged right now.' })
      : el('div', { class: 'table-scroll' }, el('table', { class: 'table' }, [
          el('thead', {}, el('tr', {}, ['Date', 'Person', 'Task', 'Flagged by', 'Reasons', 'Notes', ''].map((h) => el('th', { text: h })))),
          el('tbody', {}, rows.map(({ entry, entryFlags }) => {
            const reasons = [...new Set(entryFlags.map((f) => flagReasonLabel(f.reason)))].join('; ');
            const notes = entryFlags.map((f) => f.note).filter(Boolean).join('; ');
            const statusSelect = select(settableStatuses, 'under-review', () => {});
            const applyBtn = el('button', {
              type: 'button', class: 'btn btn-primary', text: 'Update status',
              on: {
                click: () => Promise.all(entryFlags.map((f) => data.setFlagStatus(f.id, statusSelect.value)))
                  .catch((err) => toast(err.message || 'Could not update.')),
              },
            });
            return el('tr', {}, [
              el('td', { text: formatDate(entry.date) }),
              el('td', { text: entry.displayName }),
              el('td', { text: entry.isCustomTask ? (entry.customTaskName || 'Other') : entry.taskName }),
              el('td', { class: 'value', text: String(entryFlags.length) }),
              el('td', { text: reasons }),
              el('td', { text: notes }),
              el('td', {}, el('div', { class: 'btn-row' }, [statusSelect, applyBtn])),
            ]);
          })),
        ])),
  ]);
}

function renderExportPanel(entries) {
  return el('div', { class: 'panel' }, [
    el('h3', { text: 'Export' }),
    el('p', { class: 'muted', text: `Download ${isScopedAdmin() ? 'your categories’' : 'the entire company'} ledger (${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}) as a CSV file.` }),
    el('button', {
      type: 'button', class: 'btn btn-primary', text: 'Download CSV',
      on: {
        click: () => {
          const csv = entriesToCsv(sortedByDateDesc(entries));
          download(new Blob([csv], { type: 'text/csv' }), `impact-ledger-export-${new Date().toISOString().slice(0, 10)}.csv`);
        },
      },
    }),
  ]);
}

function renderLeaderboard() {
  const scoped = isScopedAdmin();
  const availableCategories = scoped
    ? state.categories.filter((c) => state.adminCategoryIds.includes(c.id))
    : state.categories;
  const options = [{ id: 'all', name: scoped ? 'All my categories' : 'All categories' }, ...availableCategories];
  if (!options.some((o) => o.id === state.leaderboardCategoryId)) state.leaderboardCategoryId = 'all';

  const scopedEntries = scoped ? state.entries.filter((e) => state.adminCategoryIds.includes(e.categoryId)) : state.entries;
  const filteredEntries = state.leaderboardCategoryId === 'all'
    ? scopedEntries
    : scopedEntries.filter((e) => e.categoryId === state.leaderboardCategoryId);

  const rows = summarizeByUser(filteredEntries, state.users);
  const filterSelect = select(
    options.map((o) => ({ value: o.id, label: o.name })),
    state.leaderboardCategoryId,
    (value) => { state.leaderboardCategoryId = value; renderView(); },
  );
  const selectedName = options.find((o) => o.id === state.leaderboardCategoryId)?.name ?? 'All categories';

  return el('div', {}, [
    el('div', { class: 'panel' }, [
      el('h3', { text: 'Leaderboard' }),
      field('Category', filterSelect),
    ]),
    el('div', { class: 'panel' }, [
      el('h3', { text: `Top scorers - ${selectedName}` }),
      buildUserBreakdownTable(rows, { showRank: true }),
    ]),
  ]);
}

function renderAdminSettings() {
  return buildSettingsView(state.settings, data.updateSettings);
}

function renderAdminManage() {
  return buildManageView({
    categories: withEntryCounts(state.categories, 'categoryId'),
    tasks: withEntryCounts(state.tasks, 'taskId'),
    contributionWeights: state.settings.contributionWeights,
    restrictToCategoryIds: state.isAdmin ? null : state.adminCategoryIds,
    onCreateCategory: data.createCategory,
    onUpdateCategory: data.updateCategory,
    onDeleteCategory: data.deleteCategory,
    onCreateTask: data.createTask,
    onUpdateTask: data.updateTask,
    onDeleteTask: data.deleteTask,
    onAddAdmin: state.isAdmin ? (email, categoryIds) => {
      const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return Promise.reject(new Error('No signed-in user found with that email - they need to sign in once first.'));
      }
      return data.addAdmin(user.id, user.email, categoryIds);
    } : null,
    admins: state.admins,
    currentUid: state.user.uid,
    onRemoveAdmin: state.isAdmin ? data.removeAdmin : null,
  });
}

function renderAdminReview() {
  const customEntries = state.entries.filter((e) => e.isCustomTask);
  return buildReviewView(customEntries, {
    onPromote: (entry) => data.createTask({
      categoryId: entry.categoryId, name: entry.customTaskName, description: entry.description,
    }),
    onLink: (entry, categoryId, taskId) => {
      const category = state.categories.find((c) => c.id === categoryId);
      const task = state.tasks.find((t) => t.id === taskId);
      if (!category || !task) return;
      data.relinkEntry(entry, category, task, categoryWeightFor(category, state.settings))
        .catch((err) => toast(err.message || 'Could not link - try again.'));
    },
    categories: activeCategories(),
    tasks: activeTasks(),
  });
}

function buildThemeToggle() {
  return el('button', {
    class: 'btn btn-icon', type: 'button',
    'data-field': 'theme',
    'aria-label': `${THEME_LABEL[state.theme]} - click to change`,
    title: THEME_LABEL[state.theme],
    on: {
      click: () => {
        state.theme = THEME_ORDER[(THEME_ORDER.indexOf(state.theme) + 1) % THEME_ORDER.length];
        applyTheme(state.theme);
        try { localStorage.setItem(THEME_KEY, state.theme); } catch { /* best effort only */ }
        renderShell();
      },
    },
  }, el('span', { 'aria-hidden': 'true', text: THEME_ICON[state.theme] }));
}

function buildSignedInHeader() {
  return el('div', { class: 'header-actions' }, [
    buildThemeToggle(),
    el('span', { class: 'muted', text: state.user.displayName }),
    el('button', { class: 'btn', type: 'button', text: 'Sign out', on: { click: signOutUser } }),
  ]);
}

function buildSignedOutHeader() {
  return el('div', { class: 'header-actions' }, [buildThemeToggle()]);
}

function buildSignInForm() {
  const emailInput = el('input', { type: 'email', required: true, placeholder: 'you@research-square.com' });
  const passwordInput = el('input', { type: 'password', required: true, placeholder: 'Password' });
  const submitBtn = el('button', { type: 'submit', class: 'btn btn-primary', text: 'Sign in' });

  const form = el('form', { class: 'panel' }, [
    el('h3', { text: 'Sign in' }),
    field('Email', emailInput),
    field('Password', passwordInput),
    submitBtn,
  ]);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.authError = null;
    submitBtn.disabled = true;
    signIn(emailInput.value.trim(), passwordInput.value).catch((err) => {
      state.authError = err.message || String(err);
      renderShell();
    });
  });

  return form;
}

function renderShell() {
  clear(document.body);
  const headerActions = state.user ? buildSignedInHeader() : buildSignedOutHeader();
  dom.main = el('main', { class: 'app-main' },
    state.user ? [] : [
      state.wrongDomainEmail
        ? el('div', { class: 'banner banner-danger',
            text: `${state.wrongDomainEmail} is not a research-square.com address. Sign in with your company account.` })
        : null,
      state.authError
        ? el('div', { class: 'banner banner-danger', text: `Sign-in failed: ${state.authError}` })
        : null,
      buildSignInForm(),
    ]);
  document.body.append(...[
    el('header', { class: 'app-header' }, [
      el('div', { class: 'brand' }, [
        el('img', { class: 'brand__logo', src: 'assets/logo-mark.png', alt: '' }),
        el('span', { class: 'brand__name', text: 'Impact Ledger' }),
      ]),
      headerActions,
    ]),
    state.user ? buildNav(tabsFor(state), state.activeTab, (id) => { state.activeTab = id; renderShell(); }) : null,
    dom.main,
    el('footer', { class: 'app-footer' }, [
      el('span', { text: 'Research Square Engineering Services - pilot.' }),
      el('span', { text: `v${APP_VERSION}` }),
    ]),
  ].filter(Boolean));
  if (state.user) renderView();
}

let unsubscribers = [];
function subscribeToData() {
  unsubscribers.push(data.listenCategories((categories) => { state.categories = categories; renderView(); }));
  unsubscribers.push(data.listenTasks((tasks) => { state.tasks = tasks; renderView(); }));
  unsubscribers.push(data.listenEntries((entries) => { state.entries = entries; renderView(); }));
  unsubscribers.push(data.listenUsers((users) => { state.users = users; renderView(); }));
  unsubscribers.push(data.listenFlags((flags) => { state.flags = flags; renderView(); }));
  unsubscribers.push(data.listenAdmins((admins) => { state.admins = admins; renderView(); }));
  unsubscribers.push(data.listenSettings((settings) => { state.settings = settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS; renderView(); }));
}

initAuth({
  onSignedIn: ({ uid, email, displayName, isAdmin, categoryIds }) => {
    state.user = { uid, email, displayName };
    state.isAdmin = isAdmin;
    state.adminCategoryIds = categoryIds || [];
    state.activeTab = 'log';
    state.wrongDomainEmail = null;
    state.authError = null;
    renderShell();
    subscribeToData();
  },
  onSignedOut: () => {
    unsubscribers.forEach((u) => u());
    unsubscribers = [];
    state.user = null; state.isAdmin = false; state.adminCategoryIds = [];
    state.categories = []; state.tasks = []; state.entries = []; state.users = []; state.flags = []; state.admins = [];
    renderShell();
  },
  onWrongDomain: (email) => {
    state.wrongDomainEmail = email;
    renderShell();
  },
});

renderShell();
