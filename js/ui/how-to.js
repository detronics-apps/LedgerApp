import { el } from './dom.js';
import { DEFAULT_SETTINGS } from '../limits.js';

function section(title, children) {
  return el('details', { class: 'panel explain' }, [
    el('summary', { text: title }),
    ...children,
  ]);
}

/** Accordion: opening one section closes every other top-level <details> in
 * this container, so at most one is expanded at a time. */
function wireAccordion(container) {
  const sections = [...container.children].filter((c) => c.tagName === 'DETAILS');
  for (const section of sections) {
    section.addEventListener('toggle', () => {
      if (section.open) {
        for (const other of sections) { if (other !== section) other.open = false; }
      }
    });
  }
  return container;
}

function activeRules(settings) {
  const rules = [];
  if (settings.dailyEntryCapEnabled) {
    rules.push(`You can log up to ${settings.dailyEntryCap} ${settings.dailyEntryCap === 1 ? 'entry' : 'entries'} per day.`);
  }
  if (settings.fiveImpactOncePerWeekEnabled) {
    rules.push('You can only log one "company-shaping" (impact 5) entry per week.');
  }
  if (settings.weeklyPointsCapEnabled) {
    rules.push(`There's a cap of ${settings.weeklyPointsCap} points per week.`);
  }
  if (settings.managementValidationEnabled) {
    rules.push(`Entries worth ${settings.managementValidationThreshold}+ points get reviewed by management before they count.`);
  }
  return rules;
}

function adminSections(isFullAdmin) {
  const sections = [
    section('Admin: adding and editing categories & tasks', [
      el('p', {}, 'Go to "Manage Tasks & Categories".'),
      el('ul', {}, [
        el('li', { text: 'Add a category with the name/description fields at the bottom of the Categories panel, then click "Add category".' }),
        el('li', { text: 'Add a task the same way, in the Tasks panel. Pick its category from the dropdown before clicking "Add task".' }),
        el('li', { text: 'To change an existing task\'s category, use the Category dropdown on its row, then click "Save".' }),
        el('li', { text: 'Use "Filter by category" above the Tasks table to narrow a long list down to one category.' }),
        el('li', { text: '"Archive" hides a category or task from the log-entry form without deleting its history - click "Restore" to bring it back any time. "Delete" is permanent and asks you to confirm first; it only works once nothing has ever been logged against it (archive instead if it has history).' }),
      ]),
    ]),
    section('Admin: adding users and assigning passwords', [
      el('p', {}, 'There\'s no sign-up page - every account is created by hand in the Firebase console, not in this app:'),
      el('ol', {}, [
        el('li', { text: 'Firebase console -> Authentication -> Users -> "Add user".' }),
        el('li', { text: 'Enter their @research-square.com email and set a password yourself. Firebase won\'t email it to them, so tell them the password directly - in person, over chat, however your team normally shares a first-time password.' }),
        el('li', { text: 'They sign in at the app with that email and password. Nothing else to set up - their profile is created automatically the first time they sign in.' }),
        el('li', { text: 'If someone forgets their password, an admin resets it from the same Authentication -> Users list in the Firebase console. There\'s no "forgot password" link in the app itself.' }),
      ]),
    ]),
  ];

  if (isFullAdmin) {
    sections.push(
      section('Admin: granting admin access', [
        el('p', {}, 'On "Manage Tasks & Categories", the Admins panel lets you grant access by email. The person must have signed in at least once already.'),
        el('ul', {}, [
          el('li', { text: 'Tick "All categories" to make someone a full admin. They get every admin tab - Settings, granting other admins, deleting any entry from the Company Ledger - and every category.' }),
          el('li', { text: 'Tick specific categories instead (not "All") to make someone a category-scoped admin. They see Admin Dashboard, "Manage Tasks & Categories", and Leaderboard, but only for their own categories. They can\'t create new categories, grant admin access to anyone else, reach Settings, or delete an entry from the Company Ledger, even in their own category.' }),
          el('li', { text: 'The same panel lists everyone with admin access and their level. Click "Revoke access" to remove anyone else\'s - you\'ll be asked to confirm. You can\'t revoke your own, so you can\'t lock yourself out.' }),
        ]),
      ]),
      section('Admin: how scoring works and how to change it', [
        el('p', {}, 'Points = Impact x Proof x Task weight x Category weight.'),
        el('ul', {}, [
          el('li', { text: 'Impact (1-5) and Proof (1-3) are fixed scales. Everyone uses the same one - the employee picks these when logging, and admins can\'t change them on a single entry.' }),
          el('li', { text: 'Task weight can be changed: edit the "Weight" field on a task\'s row in "Manage Tasks & Categories" and click Save to make that task worth more or less.' }),
          el('li', { text: 'Category weight comes from a contribution type, not a number you set per category. Pick Cultural, Operational, or Leadership on a category\'s row. Each type\'s own weight (default x1 / x1.5 / x2) is set on the "Settings" tab - change it there and every category of that type updates immediately.' }),
          el('li', { text: 'Weight changes are never retroactive. They only affect entries logged, edited, or relinked after the change - each entry keeps the points it was given when it was saved.' }),
          el('li', { text: 'The other pilot rules - daily entry caps, weekly point caps, a once-a-week limit on impact-5 entries, ledger anonymisation, and management validation of high scores - are all turned on and tuned from the "Settings" tab. Turning one on updates what everyone else sees on this How-to page automatically.' }),
        ]),
      ]),
    );
  }

  sections.push(
    section('Admin: reviewing flagged entries', [
      el('p', {}, 'The Admin Dashboard has a "Flagged entries" panel listing every entry someone has flagged for a second look (see "Something looks off? Flag it." above). It\'s one row per entry, not per flag.'),
      el('ul', {}, [
        el('li', { text: 'If more than one person flagged the same entry, you\'ll see a count ("Flagged by 2") instead of duplicate rows, with every reason and note listed together.' }),
        el('li', { text: 'Set the status to "Under review" while you look into it, or straight to "Updated" or "Rejected" once you\'ve decided. This updates everyone\'s flag on that entry at once, and each person who flagged it sees the new status on their own "My Logs" page.' }),
        el('li', { text: 'There\'s no way for an admin to change someone else\'s impact, proof, or description directly. If a flag looks valid, ask the entry\'s owner (e.g. on Slack) to fix it themselves from "My Logs", then set the flag to "Updated". If the entry is fine as it is, set it to "Rejected".' }),
        el('li', { text: 'Who raised a flag is only ever visible here, to admins - never to the entry\'s owner or anyone else. Following up stays between you and them, not a public callout.' }),
        el('li', { text: 'Once every flag on an entry is resolved (Updated or Rejected), it drops off this panel. It can be flagged again later if something new comes up.' }),
      ]),
    ]),
    section('Admin: reviewing "Other" (custom) task entries', [
      el('p', {}, 'Go to "Custom Task Review" to see every entry someone logged under "Other - not listed".'),
      el('ul', {}, [
        el('li', { text: 'If it\'s a genuinely new kind of task, click "Promote" to turn it into a real task under its category. It\'ll then show up on the log-entry form for everyone.' }),
        el('li', { text: 'If it actually matches a task that already exists (just worded differently), use "Link to existing" to pick which one it should count as. This recalculates its points using that task\'s weight - everything the employee entered (description, evidence, impact, proof, date) stays exactly as logged.' }),
      ]),
    ]),
  );

  return sections;
}

export function buildHowTo(settings = DEFAULT_SETTINGS, { isAdmin = false, isScopedAdmin = false } = {}) {
  const rules = activeRules(settings);

  return wireAccordion(el('div', {}, [
    section('How do I log an entry?', [
      el('ol', {}, [
        el('li', { text: 'Go to "Log Effort".' }),
        el('li', { text: 'Pick the Category that best matches what you did, then the specific Task under it.' }),
        el('li', { text: 'Nothing fits? Choose "Other - not listed" and describe it in a few words - an admin reviews these and either adds a real task for it or links it to one that already exists.' }),
        el('li', { text: 'Pick the date, rate the Impact and the Proof, write a short description, and add an evidence link if you have one.' }),
        el('li', { text: 'Submit. You can see and edit your own entries any time under "My Logs".' }),
      ]),
    ]),
    section('How do I judge impact fairly?', [
      el('p', {}, "This only works if everyone rates things the same way. Two people doing very different work, but achieving something similarly sized, should end up with similar Impact ratings."),
      el('p', {}, el('strong', { text: "The trap: almost anything can be made to sound bigger than it is." })),
      el('p', {}, "Two things make that easy to do without even meaning to:"),
      el('ul', {}, [
        el('li', { text: '"It touched the whole company" - reaching a lot of people doesn\'t make something bigger on its own. Changing the fire-alarm batteries reaches everyone in the building. It\'s still a five-minute task, not a company-shaping change.' }),
        el('li', { text: '"It could have prevented a disaster" - a worst case you can imagine is not something that actually happened. Score what your work really achieved, not what might have gone wrong without it. Almost any task can be described this way if you try hard enough - that doesn\'t change what you actually did.' }),
      ]),
      el('p', {}, el('strong', { text: "One more thing: how long something took doesn't tell you how much it mattered." })),
      el('p', {}, "Taking longer doesn't make something more impactful, and working fast shouldn't score you lower. Rate what changed, not how long it took."),
      el('p', {}, el('strong', { text: "Reach is still a useful rough guide, as long as it's not the only thing you look at:" })),
      el('ul', {}, [
        el('li', { text: '1 = helped one person with something small.' }),
        el('li', { text: '2 = helped a few people, or saved someone real time.' }),
        el('li', { text: '3 = changed how a team works, not just for a moment.' }),
        el('li', { text: '4 = a team or client is noticeably better off, and it keeps paying off.' }),
        el('li', { text: '5 = changed something for the whole company, in a lasting way.' }),
      ]),
      el('p', {}, el('strong', { text: 'A quick check before you submit:' })),
      el('ul', {}, [
        el('li', { text: 'What actually changed because of what you did - not what might have happened otherwise?' }),
        el('li', { text: 'If you described just what really happened, plainly - would a colleague agree with the level you picked?' }),
      ]),
      el('p', {}, "Nobody expects perfect precision here. It's a judgement call, and reasonable people will land differently on borderline cases - that's fine. What matters is rating what really happened, not the best story you could tell about it. If a rating still looks off to someone, that's what \"Flag it\" (below) is for."),
    ]),
    section('Doing the same thing again? Use "Relog".', [
      el('p', {}, 'Every entry on "My Logs" has a "Relog" button. It starts a new entry pre-filled with the same category, task, impact, proof, description and evidence - but dated today. Change whatever\'s different and submit in seconds, instead of filling in the form from scratch. Handy for anything you do daily or weekly.'),
    ]),
    section('Logging rules', rules.length === 0
      ? [el('p', {}, 'No extra rules are active right now beyond the basics above - log what you did, as often as it happens.')]
      : [el('ul', {}, rules.map((r) => el('li', { text: r })))]),
    section('What happens to "Other" entries?', [
      el('p', {}, 'If what you did doesn\'t match any task on the list, log it under "Other - not listed" anyway, with a short description - it still counts. An admin reviews these and either adds it as a real task (so it\'s on the list next time) or links your entry to a task that already covers it.'),
    ]),
    section('If an admin changes how something is weighted, does that change what I already logged?', [
      el('p', {}, "No. A change like that only applies going forward. It never rewrites something you've already submitted - your entries keep the points they had when you logged them."),
    ]),
    section('Something looks off? Flag it.', [
      el('p', {}, 'This only works if we trust each other to catch mistakes, not to police each other. Any entry that isn\'t yours has a "Flag" button on the Company Ledger.'),
      el('ol', {}, [
        el('li', { text: 'Click "Flag" - a small form opens under that row.' }),
        el('li', { text: 'Pick a reason: looks like a duplicate, impact rated too high or too low, proof rated too high or too low, or other.' }),
        el('li', { text: 'Add an optional note (what made you look twice) and click "Submit flag".' }),
      ]),
      el('p', {}, 'What happens next:'),
      el('ul', {}, [
        el('li', { text: 'An admin sees it and follows up with whoever logged it, if it needs a second look. The point is catching honest mistakes together, not reporting someone.' }),
        el('li', { text: 'Nobody sees that you flagged something except admins - not the entry\'s owner, not anyone else on the Company Ledger.' }),
        el('li', { text: 'You can check the status of anything you\'ve flagged - Open, Under review, Updated, or Rejected - in a small table at the bottom of "My Logs".' }),
        el('li', { text: 'More than one person can flag the same entry independently. An admin sees how many people raised it, not a queue of duplicate reports.' }),
        el('li', { text: 'You can flag the same entry again later if something new comes up, once your last flag on it has been resolved (Updated or Rejected) - not while one of yours is still open.' }),
      ]),
    ]),
    ...(isAdmin || isScopedAdmin ? adminSections(isAdmin) : []),
  ]));
}
