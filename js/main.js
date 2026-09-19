import { el, clear, toast } from './ui/dom.js';
import { initAuth, signIn, signOutUser } from './ui/auth.js';
import * as data from './ui/data.js';
import { buildNav } from './ui/nav.js';
import { buildLogForm } from './ui/log-form.js';
import { buildEntriesTable } from './ui/entries-table.js';
import { buildStatsView, buildUserBreakdownTable } from './ui/stats-view.js';
import { buildManageView } from './ui/admin-manage.js';
import { buildReviewView } from './ui/admin-review.js';
import { summarizeEntries, summarizeParticipation, summarizeByUser } from './stats.js';
import { computePoints } from './scoring.js';

export const APP_VERSION = '0.2.0';

const state = {
  user: null, isAdmin: false,
  categories: [], tasks: [], entries: [], users: [],
  activeTab: 'log',
  wrongDomainEmail: null,
  editingEntry: null,
};

function sortedByDateDesc(entries) {
  return [...entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

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
  const editing = state.editingEntry;
  return buildLogForm({
    categories: activeCategories(), tasks: activeTasks(),
    initialValues: editing ? { ...editing } : null,
    onCancel: editing ? () => { state.editingEntry = null; renderView(); } : null,
    onSubmit: (draft) => {
      const category = state.categories.find((c) => c.id === draft.categoryId);
      const task = state.tasks.find((t) => t.id === draft.taskId);
      const payload = {
        uid: state.user.uid, email: state.user.email, displayName: state.user.displayName,
        date: draft.date, categoryId: draft.categoryId, categoryName: draft.categoryName,
        taskId: draft.isCustomTask ? 'custom' : draft.taskId,
        taskName: draft.isCustomTask ? '' : draft.taskName,
        isCustomTask: draft.isCustomTask, customTaskName: draft.customTaskName,
        impact: draft.impact, proof: draft.proof,
        taskWeight: task?.weight ?? 1, categoryWeight: category?.weight ?? 1,
        description: draft.description, evidenceUrl: draft.evidenceUrl,
      };
      const write = editing ? data.updateEntry(editing.id, payload) : data.createEntry(payload);
      return write.then(() => {
        if (editing) state.editingEntry = null;
        return { points: computePoints(draft.impact, draft.proof, task?.weight ?? 1, category?.weight ?? 1) };
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
  return buildEntriesTable(sortedByDateDesc(state.entries));
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
  const summary = summarizeEntries(state.entries);
  const participation = summarizeParticipation(state.entries, state.users.map((u) => u.id));
  const userBreakdown = summarizeByUser(state.entries, state.users);
  return el('div', {}, [
    buildStatsView(summary, participation),
    el('div', { class: 'panel' }, [
      el('h3', { text: 'By person' }),
      buildUserBreakdownTable(userBreakdown),
    ]),
  ]);
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
  dom.main = el('main', { class: 'app-main' },
    state.user ? [] : [
      state.wrongDomainEmail
        ? el('div', { class: 'banner banner-danger',
            text: `${state.wrongDomainEmail} is not a research-square.com address. Sign in with your company account.` })
        : null,
      el('p', { class: 'muted', text: 'Sign in with your @research-square.com account to continue.' }),
    ]);
  document.body.append(...[
    el('header', { class: 'app-header' }, [
      el('div', { class: 'brand' }, [
        el('img', { class: 'brand__logo', src: 'assets/favicon.svg', alt: '' }),
        el('span', { class: 'brand__name', text: 'Impact Ledger' }),
      ]),
      headerActions,
    ]),
    state.user ? buildNav(tabsFor(state), state.activeTab, (id) => { state.activeTab = id; renderView(); }) : null,
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
}

initAuth({
  onSignedIn: ({ uid, email, displayName, isAdmin }) => {
    state.user = { uid, email, displayName };
    state.isAdmin = isAdmin;
    state.activeTab = 'log';
    state.wrongDomainEmail = null;
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
