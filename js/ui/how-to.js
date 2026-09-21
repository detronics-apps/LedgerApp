import { el } from './dom.js';
import { DEFAULT_SETTINGS } from '../limits.js';

function section(title, children) {
  return el('details', { class: 'panel explain', open: true }, [
    el('summary', { text: title }),
    ...children,
  ]);
}

function activeRules(settings) {
  const rules = [];
  if (settings.dailyEntryCapEnabled) {
    rules.push(`You can log up to ${settings.dailyEntryCap} ${settings.dailyEntryCap === 1 ? 'entry' : 'entries'} per day.`);
  }
  if (settings.fiveImpactOncePerWeekEnabled) {
    rules.push('A "company-shaping" (impact 5) contribution can only be logged once per week.');
  }
  if (settings.weeklyPointsCapEnabled) {
    rules.push(`There's a cap of ${settings.weeklyPointsCap} points per week.`);
  }
  if (settings.managementValidationEnabled) {
    rules.push(`Entries worth ${settings.managementValidationThreshold}+ points get reviewed by management before they're finalised.`);
  }
  return rules;
}

function adminSections(isFullAdmin) {
  const sections = [
    section('Admin: adding and editing categories & tasks', [
      el('p', {}, 'Go to "Manage Tasks & Categories".'),
      el('ul', {}, [
        el('li', { text: 'Add a category with the name/description fields at the bottom of the Categories panel, then "Add category".' }),
        el('li', { text: 'Add a task the same way in the Tasks panel - pick which category it belongs to from the dropdown next to the name/description fields before clicking "Add task".' }),
        el('li', { text: 'To change an existing task\'s category, use the Category dropdown directly on its row, then click "Save".' }),
        el('li', { text: 'Use "Filter by category" above the Tasks table to narrow a long list down to one category.' }),
        el('li', { text: '"Archive" hides a category/task from the log-entry form without deleting its history - its row gets a "Restore" button to bring it back any time. "Delete" is permanent and asks you to confirm first; it\'s only available once nothing has ever been logged against it (archive instead if it has history).' }),
      ]),
    ]),
    section('Admin: adding users and assigning passwords', [
      el('p', {}, 'There\'s no self-service signup - every account is created by hand in the Firebase console (not in this app):'),
      el('ol', {}, [
        el('li', { text: 'Firebase console -> Authentication -> Users -> "Add user".' }),
        el('li', { text: 'Enter their @research-square.com email and set an initial password yourself - Firebase does not email it to them, so you share that password with them directly (in person, over chat, however your team normally shares a first-time password).' }),
        el('li', { text: 'They sign in at the app with that email/password. Nothing else to set up - their profile is created automatically on first sign-in.' }),
        el('li', { text: 'If someone forgets their password, an admin resets it from the same Authentication -> Users list in the Firebase console - there is no "forgot password" link in the app itself.' }),
      ]),
    ]),
  ];

  if (isFullAdmin) {
    sections.push(
      section('Admin: granting admin access', [
        el('p', {}, 'On "Manage Tasks & Categories", the Admins panel lets you grant access by email (the person must have signed in at least once already).'),
        el('ul', {}, [
          el('li', { text: 'Tick "All categories" to grant a full admin - they get every admin tab (Settings, granting further admins, deleting any entry from the Company Ledger) and every category.' }),
          el('li', { text: 'Tick one or more specific categories instead (not "All") to grant a category-scoped admin - they see Admin Dashboard, "Manage Tasks & Categories", and Leaderboard, each scoped to just their assigned categories. They can\'t create brand-new categories, grant admin access to anyone else, reach Settings, or delete an entry from the Company Ledger, even in their own category - deleting is reserved for full admins.' }),
          el('li', { text: 'There\'s no "remove admin" button - de-admin-ing someone is a manual step in the Firebase console (delete their doc from the admins collection).' }),
        ]),
      ]),
      section('Admin: how scoring works and how to change it', [
        el('p', {}, 'Points = Impact x Proof x Task weight x Category weight.'),
        el('ul', {}, [
          el('li', { text: 'Impact (1-5) and Proof (1-3) are fixed scales everyone uses the same way - the employee picks these when logging, and they aren\'t admin-adjustable per entry.' }),
          el('li', { text: 'Task weight is admin-adjustable - edit the "Weight" field on a task\'s row in "Manage Tasks & Categories" and click Save to make that task worth more or less.' }),
          el('li', { text: 'Category weight comes from a contribution type instead of a per-category number - pick Cultural, Operational, or Leadership on a category\'s row, and set what each type is worth on the "Settings" tab (default x1 / x1.5 / x2). Changing a type\'s weight there instantly changes every category assigned to it.' }),
          el('li', { text: 'Weight and scoring changes are never retroactive: a task/category/type weight change only affects entries logged (or edited/relinked) after the change. Every entry stores its own points at the moment it\'s saved, so nothing already logged is rewritten.' }),
          el('li', { text: 'The other pilot rules (daily entry caps, weekly point caps, once-a-week limit on impact-5 entries, ledger anonymization, and management validation of high-scoring entries) are all toggled and tuned from the "Settings" tab. Turning any of these on updates what non-admins see on this How-to page automatically.' }),
        ]),
      ]),
    );
  }

  sections.push(
    section('Admin: reviewing "Other" (custom) task entries', [
      el('p', {}, 'Go to "Custom Task Review" to see every entry someone logged under "Other - not listed".'),
      el('ul', {}, [
        el('li', { text: 'If it\'s a genuinely new kind of task, click "Promote" to turn it into a real task under its category - it\'ll then show up on the log-entry form for everyone.' }),
        el('li', { text: 'If it actually matches a task that already exists (maybe worded differently), use "Link to existing" to pick the category and task it should count as instead - this recalculates its points using that task\'s weight, without changing anything the employee entered (their description, evidence, impact, proof, date, all stay exactly as logged).' }),
      ]),
    ]),
  );

  return sections;
}

export function buildHowTo(settings = DEFAULT_SETTINGS, { isAdmin = false, isScopedAdmin = false } = {}) {
  const rules = activeRules(settings);

  return el('div', {}, [
    section('How do I log an entry?', [
      el('ol', {}, [
        el('li', { text: 'Go to "Log Effort".' }),
        el('li', { text: 'Pick the Category that best matches what you did, then the specific Task under it.' }),
        el('li', { text: 'Nothing fits? Choose "Other - not listed" and describe it in a few words - an admin reviews these and either adds a real task for it or links it to one that already exists.' }),
        el('li', { text: 'Pick the date, rate the Impact and the Proof, write a short description, and add an evidence link if you have one.' }),
        el('li', { text: 'Submit. You can see and edit your own entries any time under "My Logs".' }),
      ]),
    ]),
    section('Logging rules', rules.length === 0
      ? [el('p', {}, 'No extra rules are active right now beyond the basics above - log what you did, as often as it happens.')]
      : [el('ul', {}, rules.map((r) => el('li', { text: r })))]),
    section('What happens to "Other" entries?', [
      el('p', {}, 'If what you did doesn\'t match any task on the list, log it under "Other - not listed" with a short description anyway - it still counts. An admin reviews these in the Custom Task Review queue and either adds it as a real task (so it\'s on the list for everyone next time) or links your entry to an existing task that already covers it.'),
    ]),
    section('If an admin changes how something is weighted, does that change what I already logged?', [
      el('p', {}, 'No. A change like that only applies going forward - it never rewrites something you\'ve already submitted. Your existing entries keep exactly what they had at the time you logged them.'),
    ]),
    ...(isAdmin || isScopedAdmin ? adminSections(isAdmin) : []),
  ]);
}
