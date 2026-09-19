import { el, clear, toast, field } from './ui/dom.js';
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
import { checkSubmissionLimits, DEFAULT_SETTINGS } from './limits.js';
import { formatDate } from './format.js';

export const APP_VERSION = '0.2.0';

const THEME_KEY = 'impact-ledger-theme';
const THEME_ORDER = ['system', 'light', 'dark'];
const THEME_LABEL = { system: 'Theme: System (system, light or dark)', light: 'Theme: Light (system, light or dark)', dark: 'Theme: Dark (system, light or dark)' };

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

const state = {
  user: null, isAdmin: false,
  categories: [], tasks: [], entries: [], users: [],
  settings: DEFAULT_SETTINGS,
  activeTab: 'log',
  wrongDomainEmail: null,
  editingEntry: null,
  authError: null,
  theme: loadTheme(),
};
applyTheme(state.theme);

function sortedByDateDesc(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7; // Monday = 0
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date;
}

function toJsDate(value) {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

/** How many entries the signed-in user has already submitted today/this
 * week, keyed on when they actually hit submit (createdAt), not the
 * back-datable "when did you do it" field - otherwise the caps below would
 * be trivial to dodge by backdating. */
function myRecentActivity() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  const now = new Date();
  const weekStart = startOfWeek(now);
  const todayCount = own.filter((e) => {
    const created = toJsDate(e.createdAt) ?? now;
    return created.toDateString() === now.toDateString();
  }).length;
  const thisWeek = own.filter((e) => {
    const created = toJsDate(e.createdAt) ?? now;
    return created >= weekStart;
  });
  return {
    todayCount,
    weekPoints: thisWeek.reduce((sum, e) => sum + e.points, 0),
    weekUsedFiveImpact: thisWeek.some((e) => e.impact === 5),
  };
}

const dom = {};

const EMPLOYEE_TABS = [
  { id: 'log', label: 'Log Effort' },
  { id: 'my-logs', label: 'My Logs' },
  { id: 'ledger', label: 'Company Ledger' },
  { id: 'my-stats', label: 'My Stats' },
  { id: 'company-stats', label: 'Company Stats' },
  { id: 'how-to', label: 'How to use' },
];
const ADMIN_TABS = [
  { id: 'admin-dashboard', label: 'Admin Dashboard' },
  { id: 'admin-manage', label: 'Manage Tasks & Categories' },
  { id: 'admin-review', label: 'Custom Task Review' },
  { id: 'admin-settings', label: 'Settings' },
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
    'my-stats': renderMyStats, 'company-stats': renderCompanyStats, 'how-to': () => buildHowTo(state.settings),
    'admin-dashboard': renderAdminDashboard, 'admin-manage': renderAdminManage,
    'admin-review': renderAdminReview, 'admin-settings': renderAdminSettings }[state.activeTab];
  dom.main.appendChild(view());
}

function renderLog() {
  const editing = state.editingEntry;
  return buildLogForm({
    categories: activeCategories(), tasks: activeTasks(),
    initialValues: editing ? { ...editing } : null,
    onCancel: editing ? () => { state.editingEntry = null; renderView(); } : null,
    onSubmit: (draft) => {
      const category = state.categories.find((c) => c.id === draft.categoryId);
      const task = state.tasks.find((t) => t.id === draft.taskId);
      const taskWeight = task?.weight ?? 1;
      const categoryWeight = category?.weight ?? 1;
      const prospectivePoints = computePoints(draft.impact, draft.proof, taskWeight, categoryWeight);

      if (!editing) {
        const isExcluded = !!state.users.find((u) => u.id === state.user.uid)?.excludedFromLedger;
        const { allowed, errors } = checkSubmissionLimits({
          impact: draft.impact, prospectivePoints, isExcluded, settings: state.settings,
          ...myRecentActivity(),
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
        if (editing) state.editingEntry = null;
        return { points: prospectivePoints };
      });
    },
  });
}

function renderMyLogs() {
  const own = state.entries.filter((e) => e.uid === state.user.uid);
  return buildEntriesTable(sortedByDateDesc(own), {
    showOwner: false,
    onEdit: (entry) => { state.editingEntry = entry; state.activeTab = 'log'; renderView(); },
    onDelete: (entry) => data.deleteEntry(entry.id).catch(() => toast('Could not delete - try again.')),
  });
}

function renderLedger() {
  return buildEntriesTable(sortedByDateDesc(state.entries), {
    anonymize: state.settings.anonymizeLedgerEnabled && !state.isAdmin,
  });
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

function renderNeedsValidation() {
  if (!state.settings.managementValidationEnabled) return null;
  const flagged = state.entries.filter((e) => !e.validated && e.points >= state.settings.managementValidationThreshold);
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
  const summary = summarizeEntries(state.entries);
  const participation = summarizeParticipation(state.entries, state.users.map((u) => u.id));
  const userBreakdown = summarizeByUser(state.entries, state.users).map((row) => ({
    ...row,
    excludedFromLedger: !!state.users.find((u) => u.id === row.uid)?.excludedFromLedger,
  }));
  return el('div', {}, [
    buildStatsView(summary, participation),
    el('div', { class: 'panel' }, [
      el('h3', { text: 'By person' }),
      buildUserBreakdownTable(userBreakdown, {
        onToggleExclusion: (uid, excluded) => data.setUserExclusion(uid, excluded).catch((err) => toast(err.message || 'Could not update.')),
      }),
    ]),
    renderNeedsValidation(),
  ].filter(Boolean));
}

function renderAdminSettings() {
  return buildSettingsView(state.settings, data.updateSettings);
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
    onAddAdmin: (email) => {
      const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        return Promise.reject(new Error('No signed-in user found with that email - they need to sign in once first.'));
      }
      return data.addAdmin(user.id, user.email);
    },
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
      data.relinkEntry(entry, category, task).catch((err) => toast(err.message || 'Could not link - try again.'));
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
  }, el('span', { 'aria-hidden': 'true', text: '◐' }));
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
  unsubscribers.push(data.listenSettings((settings) => { state.settings = settings ? { ...DEFAULT_SETTINGS, ...settings } : DEFAULT_SETTINGS; renderView(); }));
}

initAuth({
  onSignedIn: ({ uid, email, displayName, isAdmin }) => {
    state.user = { uid, email, displayName };
    state.isAdmin = isAdmin;
    state.activeTab = 'log';
    state.wrongDomainEmail = null;
    state.authError = null;
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
    state.wrongDomainEmail = email;
    renderShell();
  },
});

renderShell();
