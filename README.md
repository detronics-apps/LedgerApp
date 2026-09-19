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
2. **Authentication > Sign-in method**: enable **Email/Password**. (Not
   Google or Microsoft - Research Square runs on Microsoft/Outlook, so
   neither an employee's Google identity nor an unregistered Microsoft
   OAuth app would work here. Email/Password sidesteps the question
   entirely: there is no dependency on the company's real identity
   provider at all - see section 3 below for how accounts actually get
   created.)
3. **Firestore Database**: create a database in production mode, in a region
   close to your team.
4. **Project settings > General > Your apps**: add a Web app, copy the config
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
- a user may create/update only their own `entries` doc, and may **delete
  only their own** `entries` doc - there is no admin override on delete.
  This is deliberate: the pilot's whole point is preserving honest,
  un-tampered raw behavioral data, so not even an admin can quietly remove
  someone's logged entry.
- any signed-in company user may read all `entries`, `categories`, `tasks`,
  and `users` (the full ledger and directory are intentionally open to
  everyone - see the design spec, section 2.B)
- only a UID listed in `admins` may write `categories`/`tasks`
- an existing admin may **grant** admin access to someone else, but only if
  that person has signed in at least once (their `users` doc must exist)
  and the granted email matches their real one exactly - **no client, not
  even an admin, can ever update or delete an `admins` doc**, so an admin
  can add new admins but can never edit or remove an existing one (that
  stays a manual Firebase-console step, same as bootstrapping the very
  first admin)

**Known limitation - entry weights are not cross-checked against the source
documents.** The rules validate that a logged entry's `taskWeight` and
`categoryWeight` are numbers and positive, and that `points` equals
`impact * proof * taskWeight * categoryWeight` - but they do not verify that
those weight values match the *current* weight actually stored on that
task/category document in the `tasks`/`categories` collections. A signed-in
user could theoretically submit an inflated `taskWeight` or `categoryWeight`
on their own entry to inflate their own score. This was a deliberate scope
decision made during implementation, not an oversight: properly closing it
means adding `get()` lookups against the source `tasks`/`categories` docs
inside the rules, which is a bigger design change than this pilot needs. In
practice it's mitigated by the app's own transparency model - every entry is
visible to every employee in the Company Ledger, so an implausible outlier
is immediately visible to the whole team, not hidden in a private total.
This is worth hardening before this pilot's data is used for anything beyond
the measurement-instrument purpose it's built for.

**Known limitation - the optional pilot rules (daily/weekly caps, R&R
exclusion) are enforced in this app's own JavaScript, not independently
re-checked by the rules.** An admin can turn on a daily entry cap, a weekly
points cap, a once-per-week limit on impact-5 entries, and an exclusion flag
for people with a formal R&R role, from Admin > Settings. All of these are
checked client-side before a submission is sent (`js/limits.js`) - a
technical user could bypass them by calling Firestore directly. Two related
pieces genuinely are rules-enforced: "management validation" (marking a
high-scoring entry as validated) only allows an admin to change the
`validated`/`validatedAt` fields, nothing else; and the R&R exclusion flag
itself can only be toggled by an admin. Hardening the caps into real
server-side limits would need a maintained per-user counter document written
transactionally alongside each entry (a known Firestore pattern, just more
machinery than this pilot needed on day one) - worth doing before these
limits matter for anything beyond shaping pilot behaviour.

**Known limitation - "hide names in the Company Ledger" is a display choice,
not a security boundary.** When an admin enables it, this app's own UI stops
showing employee names to non-admins in the Company Ledger. The underlying
Firestore documents still contain `displayName`/`email` in full - the rules
don't hide fields (only whole-document read/write is possible), so a
technical user reading Firestore directly still sees names either way. Real
anonymization would mean not storing names on entries at all and resolving
them via a `users` lookup gated by the same setting - a bigger schema change
than this pilot needed for its first version.

## 3. Provisioning employee accounts

There is no self-service signup - an admin creates every account by hand:

1. In the Firebase console, go to **Authentication > Users > Add user**.
2. Enter that person's real `@research-square.com` email and choose a
   password for them (anything - there's no policy enforced beyond
   Firebase's own minimum length).
3. Tell them the password out of band (Slack, in person, whatever) - there's
   no email invite flow. They sign in with it at the app's URL.
4. There is no "change my password" screen in the app; if someone needs a
   new one, use **Authentication > Users**, click their account, and reset
   it there.

## 4. Seed the first admin

Nobody can grant admin access before at least one admin exists, so the
*very first* admin has to be set up once, by hand, in the Firebase console
(every admin after that can be added from the app itself - see below):

1. Provision the intended first admin's account as in section 3 above, and
   have them sign in once (this creates their `users` doc and Firebase Auth
   UID).
2. In the Firebase console, go to **Firestore Database**, open the `admins`
   collection (create it if it doesn't exist yet), and add a document whose
   **document ID is that person's UID** (find it under **Authentication >
   Users**) with a single field `email: "their@research-square.com"`.
3. Reload the app signed in as that person - the admin tabs should appear.

**Adding further admins after that** doesn't need the console: on the
**Manage Tasks & Categories** tab, any existing admin can enter another
person's email under "Admins" and click "Make admin" - it only works for
someone who has already signed in at least once (the rules check their
`users` doc exists and the email matches exactly). There's no "remove
admin" button anywhere in the app; de-admin-ing someone is still a manual
Firebase-console step (delete their doc from the `admins` collection), by
design - the rules make an existing `admins` doc permanently un-editable
and un-deletable by any client.

## 5. Seed the task/category list

```bash
pip install openpyxl
python seed/extract.py            # regenerates seed/tasks-and-categories.json from the spreadsheet
npm install
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node seed/seed.mjs
```

(Get `service-account.json` from **Project settings > Service accounts >
Generate new private key**. Never commit it - it's already in `.gitignore`.)

## Running it locally

`js/firebase-config.js` automatically points Auth and Firestore at the local
Firebase emulators when `location.hostname` is `localhost` - so local runs
never touch production data. Start the emulators first, in their own
terminal (this requires the same Java runtime (JRE 11+) and `firebase-tools`
already documented for `npm run test:rules`):

```bash
npm run emulators
```

Then, in a second terminal:

```bash
npm run serve
```

Then open http://localhost:8090/.

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
- an admin can write `categories`/`tasks`, and can grant admin access to a
  user who has signed in before with a matching email, but cannot grant it
  to a made-up UID or with a mismatched email, and can never update or
  delete an existing `admins` doc

These emulator-based rules tests, and the live-Firebase steps in the manual
QA checklist below, have not been executed in this development environment
(no Java runtime, no real Firebase project available here) - they are
written and ready to run, but not yet verified end-to-end. Run them before
going live.

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
- [ ] A signed-in employee cannot delete another employee's entry - **not
      even an admin account can.** Signed in as the admin, attempt to
      delete another employee's entry doc directly from the browser
      console (not through the UI) and confirm Firestore rejects the
      write. This is the deliberately tightened, no-exceptions delete rule
      described above, and it deserves its own explicit check since admins
      can do almost everything else.
- [ ] An admin sees the admin tabs, can add/edit/archive a category or task
      and set its weight, and can promote a custom "Other" entry into a
      real task.
- [ ] An admin can grant admin access to a second account that has already
      signed in once (their email, under "Admins" on the Manage tab), and
      that account then sees the admin tabs on its next reload. Confirm
      granting it to an email that has never signed in fails with a clear
      message, and confirm there's no way in the UI to remove an admin
      once granted.
- [ ] Attempt an unauthenticated read via `curl` against the Firestore REST
      API for this project and confirm it is rejected (403), proving the
      rule is enforced server-side and not just hidden in this app's JS.
- [ ] Admin > Settings: turn on the daily entry cap (set to 1) and confirm a
      second submission the same day is blocked with a clear message; turn
      it back off and confirm submissions work normally again. Flag someone
      as R&R-excluded on the Admin Dashboard and confirm they can no longer
      submit while it's on. Turn on management validation with a low
      threshold, log a qualifying entry, and confirm it appears in "Needs
      validation" and disappears once clicked "Validate". Remember: the
      caps are enforced in this app's JS only (see "Known limitation"
      above) - this checklist confirms the UI behaves correctly, not that
      the caps survive a direct Firestore write.

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
js/limits.js                 pure: pilot-rule checks (daily/weekly caps, R&R exclusion) - client-side only, see "Known limitation"
js/firebase-config.js        Firebase app/auth/db init (public config)
js/ui/dom.js                  small DOM helpers (vendored from the detronics-app skill)
js/ui/auth.js                  sign-in/out, domain check, admin check
js/ui/data.js                  Firestore reads/writes
js/ui/nav.js, log-form.js, entries-table.js, stats-view.js, admin-manage.js, admin-review.js,
js/ui/admin-settings.js, how-to.js
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
