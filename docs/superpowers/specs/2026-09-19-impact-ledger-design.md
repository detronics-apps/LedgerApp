# Impact Ledger — Design Spec

Date: 2026-09-19
Status: Draft, awaiting owner approval before implementation begins.

## 1. Purpose

A pilot tool for Research Square Engineering Services to measure what engineers
consider "extra effort" outside normal engineering work. It is explicitly a
measurement instrument, not a bonus calculator: no money, tax, tenure,
consistency multiplier, bonus pool, ranking, or logging caps in this version.

The pilot question: *when given a simple way to record contributions outside
normal work, what do people choose to record, how often, and what do they
consider extra effort?*

## 2. Conflicts found in the source material, and how they were resolved

**A. Detronics-app skill vs. a cloud-backed multi-user app.** The
`detronics-app` skill's non-negotiables assume an offline, single-user
calculator (nothing leaves the browser, no network after load, state in
localStorage). This app's whole purpose is a shared, authenticated, cloud
ledger, so those specific rules do not apply here — confirmed with the owner,
who chose to keep the skill's *technical* architecture (no build step, ES
modules, pure-module-plus-tests discipline, token-based CSS) and the
Detronics-neutral chrome (no Buy-Me-a-Coffee / detronics.co.za links — this
isn't a Detronics-branded product) while dropping the offline-only
constraints and building instead to the Research Square palette below.

**B. "Full company ledger visible to everyone" vs. the generic security
boilerplate's "users read only their own entries."** The functional spec is
specific and repeated: every employee sees the full company ledger and
company-wide mean/median stats, not just their own. The security-requirements
paragraph in the brief reads like an unfilled generic template (it still
contains placeholder brackets, e.g. "[effort/data entries — describe fields
here]"). Resolution: **any signed-in @research-square.com user can read all
entries**; a user can only **create/update/delete their own**. Admin's extra
power is not "can see the ledger" (everyone can) — it's the per-person
breakdown by real name (via a `users` directory), the full stats dashboard,
managing tasks/categories/weights, and the custom-task review queue.

**C. Weighting vs. the pilot notes' "don't weight yet."** The pilot notes
argue against weighting categories in v1. The owner's explicit admin
requirement overrides this for this build: weights exist and apply to the
live score from day one (`points = impact × proof × taskWeight ×
categoryWeight`), defaulting to 1.0 so an unweighted category behaves exactly
like the pilot notes describe until an admin changes it.

## 3. Visual identity

Research Square Engineering Services palette, read from
research-square.com/engineeringservices:

| Token | Value |
|---|---|
| `--font-heading` | 'Space Grotesk', sans-serif — weight 500–600, tight negative letter-spacing |
| `--font-body` | 'Inter', sans-serif |
| `--color-navy` (headings) | #102A43 |
| `--color-body-text` | #4A5A6A |
| `--color-muted` | #8294A4 |
| `--color-accent` | #2E6A9E |
| `--tint-1` | #E3EEF8 |
| `--tint-2` | #EEF4FA |
| `--tint-pale` | #CFE0F0 |
| `--border` | rgba(16,42,67,0.12), 4px radius |
| Eyebrow labels | Inter 600, uppercase, ~0.22em letter-spacing, accent blue |

Dark mode: not part of the source site's identity; ship a sensible dark
variant of the same tokens (navy background, tints darkened) following the
Detronics dual dark-mode pattern (`prefers-color-scheme` + `[data-theme]`
override), since users may still want it, but it is a secondary concern to
matching the light-mode identity exactly.

No Detronics logo, favicon spec, or "Buy me a coffee" chrome — this is a
Research Square internal tool, not a Detronics product. Favicon uses the
Research Square mark from `reference/Logo.png` / `reference/Logo Small.jpg`.

## 4. Architecture

- Static HTML/CSS/JS, hosted free on GitHub Pages. No build step, no
  bundler, no framework.
- `<script type="module">` throughout. Firebase is loaded via its official
  CDN ES-module URLs (`https://www.gstatic.com/firebasejs/.../firebase-app.js`
  etc.) — this is Google's supported no-bundler integration path, not a
  bundled dependency.
- Firebase Authentication (Email/Password provider) + Firestore for all
  data. No custom server; all logic runs client-side against Firebase.
  Post-implementation change from the original design (Google Sign-In,
  restricted by `hd` hint): Research Square runs on Microsoft/Outlook, not
  Google, so employees have no Google identity tied to their work email —
  Google Sign-In was never actually usable for real accounts. Email/Password
  sidesteps identity-provider integration (Google or Microsoft) entirely:
  an admin creates each account by hand (Firebase console > Authentication
  > Users > Add user) and hands out the password out of band. This also
  means `isCompanyUser()` in `firestore.rules` no longer checks
  `email_verified` — the trust boundary shifted from "this person clicked a
  link in their own inbox" to "an admin explicitly created this account,"
  so self-verification no longer maps to anything real here.
- The Firebase web config (apiKey, projectId, etc.) is public by design —
  Firebase's security model relies on Firestore Rules and Auth, not on
  hiding the config. This will be called out in the README so it is never
  mistaken for a leaked secret.
- Every data write is tagged with `auth.uid`, the user's email, and a
  server-set `updatedAt` (`serverTimestamp()`).

## 5. Data model (Firestore)

```
entries/{entryId}
  uid, email, displayName
  date                 (the "when did you do it" date the user picked)
  categoryId, categoryName   (denormalized at write time)
  taskId, taskName           (denormalized; taskId is "custom" when isCustomTask)
  isCustomTask: bool
  impact: 1-5
  proof: 1-3
  taskWeight, categoryWeight (denormalized at write time, so historical
                               points don't drift if a weight changes later)
  points: impact * proof * taskWeight * categoryWeight
  description: string
  evidenceUrl: string (optional)
  createdAt, updatedAt (serverTimestamp)

categories/{categoryId}
  name, description, weight (default 1.0), archived: bool, order: number

tasks/{taskId}
  categoryId, name, description, weight (default 1.0), archived: bool, order

users/{uid}
  email, displayName, createdAt
  (written by the signed-in user themselves on first login — this is how
  admin gets real names without needing broad read access to Firebase Auth,
  which Firestore rules cannot query directly)

admins/{uid}
  email
  (presence of a doc = admin. The first admin is seeded manually via the
  Firebase console; after that, any existing admin can grant admin access
  to someone who has already signed in, from the app itself. No client,
  including an existing admin, can update or delete a doc in this
  collection once created — enforced in rules. Post-implementation change:
  see section 6, rule 6, and the implementation plan's ledger.)
```

Denormalizing `taskWeight`/`categoryWeight`/`categoryName`/`taskName` onto
each entry at write time means a later admin edit to a task's weight or name
does not silently rewrite the score or label of past entries — historical
data stays honest to what was true when it was logged.

## 6. Security rules (firestore.rules)

Enforced rules, to be delivered as a ready-to-deploy `firestore.rules` file:

1. Deny all reads/writes by default.
2. A request must be authenticated **and** `request.auth.token.email` must
   end in `@research-square.com`, or every rule below denies it.
3. `entries`:
   - `create`: allowed only if `request.resource.data.uid ==
     request.auth.uid`, and `request.resource.data.points` matches
     `impact * proof * taskWeight * categoryWeight` recomputed in-rule (so a
     tampered points value from devtools is rejected server-side).
   - `read`: allowed to any authenticated @research-square.com user (full
     company ledger, per section 2.B).
   - `update`/`delete`: allowed only if `resource.data.uid ==
     request.auth.uid` — owner-only, no admin exception. (An earlier draft
     of this rule let admins delete any entry; that was removed during
     implementation review as an unrequested capability that worked against
     the pilot's goal of preserving honest raw behavioral data — see the
     implementation plan's ledger for the ruling.) Same points validation
     on update.
4. `categories`/`tasks`: `read` allowed to any authenticated
   @research-square.com user (needed for the log form); `create`/`update`/
   `delete` allowed only to admins.
5. `users/{uid}`: a user may `create`/`update` only their own doc
   (`uid == request.auth.uid`); delete is denied to everyone. `read` is
   allowed to any authenticated @research-square.com user, not just the
   doc's own owner — kept consistent with `entries` being fully open (per
   section 2.B): a user's name is already visible on every entry they've
   logged, so restricting the `users` directory to admins-only would add no
   real privacy and would block the participation-rate stat (which needs
   the full headcount) from being computed by a regular employee's client.
6. `admins/{uid}`: `read` allowed for `uid == request.auth.uid` (so the
   client can check "am I an admin" to show/hide the admin nav) or for an
   admin (so the admin UI could list current admins, though this pilot
   doesn't build that screen). `create` allowed only for an existing admin,
   only when `uid` has a `users` doc (has signed in at least once) and the
   submitted `email` matches that user's real email exactly. `update` and
   `delete` are denied unconditionally, for everyone, always — an admin
   doc, once created, can never be changed or removed by any client. This
   means an admin can add new admins but never edit or de-admin an existing
   one; de-admin-ing stays a manual Firebase-console step, same as
   bootstrapping the very first admin (nobody can grant admin before at
   least one exists). Post-implementation change from the original design
   ("no write from any client, ever") — the original all-manual approach
   proved unnecessarily restrictive for onboarding a pilot team; the
   tightened create-only, target-verified version preserves the same
   core guarantee (no self-escalation, no silent tampering) while letting
   admins onboard each other. Verified by testing this rule explicitly
   (see section 9).

## 7. Scoring

Pure module, `js/scoring.js`:

```
computePoints(impact, proof, taskWeight, categoryWeight)
  => impact * proof * taskWeight * categoryWeight
```

Impact is a full 1–5 picker (expanded from the pilot notes' 1/3/5):

| Score | Meaning |
|---|---|
| 1 | Small help — a quick, low-effort assist with limited or personal scope |
| 2 | Noticeable help — saved someone real time or unblocked a specific problem |
| 3 | Meaningful contribution — improved how a team or process works, not just one person's day |
| 4 | Significant improvement — measurably improved outcomes across a team or client, likely to keep paying off |
| 5 | Company-shaping improvement — changed how the company operates, wins work, or is perceived, company-wide |

Proof stays a 3-point picker, unchanged from the pilot notes:

| Score | Meaning |
|---|---|
| 1 | Trust me bro — no specific evidence |
| 2 | Here is the data — a document, link, or result exists |
| 3 | Here is proof of the impact — clear evidence the impact actually happened |

The employee never sees or computes the points formula while filling the
form — points are shown only on the confirmation after submit, per the
pilot notes' explicit "don't ask them to calculate points" requirement.

## 8. Screens

**Employee (any signed-in @research-square.com user):**
- **Log Effort** — Category → Task (includes "Other — not listed" with
  required free text, flagged `isCustomTask`) → date (defaults today) →
  Impact (1–5, description shown per option) → Proof (1–3, description
  shown) → description (required) → evidence link (optional) → submit.
  Target: fillable in 10–20 seconds once familiar.
- **My Logs** — the user's own entries, editable and deletable in place.
- **Company Ledger** — all entries, read-only, sortable/filterable by
  category/task/date/person.
- **My Stats** — the user's own participation and distribution (entry
  count, points total, category breakdown, impact/proof distribution).
- **Company Stats** — company-wide mean/median entries per person,
  participation rate, category/task popularity, "Other" frequency, impact
  and proof distributions, evidence-level breakdown — the analysis list
  from the pilot notes section 10, computed client-side from the full
  `entries` read.

**Admin (uid present in `admins`):**
- **Admin Dashboard** — everything in Company Stats, plus a per-user
  breakdown table (name, email, entry count, points total, last activity)
  built from `users` + `entries`.
- **Manage Tasks & Categories** — add/edit categories and tasks, set each
  one's weight, archive (soft-remove: hidden from the employee picker but
  kept for historical entries, which already carry their own denormalized
  name/weight) or hard-delete (only offered when a task/category has zero
  entries against it).
- **Custom Task Review** — a queue of entries where `isCustomTask == true`,
  so an admin can see what employees are calling "Other" and optionally
  promote one into a real Task (pre-filled from the free text).

Promoting the *first* admin is not a UI action anywhere in the app — it
requires manually adding a doc to `admins` via the Firebase console, because
nobody can grant admin access before at least one admin exists. Every admin
after that can be granted from the "Manage Tasks & Categories" tab (enter
an email, click "Make admin") by any existing admin, as long as the target
has signed in at least once — the rules verify their `users` doc exists and
the email matches exactly. There is deliberately no "remove admin" UI
anywhere: de-admin-ing someone is still a manual Firebase-console step,
since the rules make an existing `admins` doc permanently un-editable and
un-deletable by any client. This is documented step by step in the setup
README.

## 9. Testing plan

- **Pure modules** (`scoring.js`, `stats.js`, task/category weight helpers):
  one `tests/<name>.test.js` per module using Node's built-in `node --test`
  runner. No framework, nothing to install.
- **Firestore rules**: automated tests against the local Firestore Emulator
  (`firebase emulators:exec`), a dev-only tool never shipped to GitHub
  Pages, covering explicitly:
  - an unauthenticated request reading or writing `entries` is rejected
  - a non-@research-square.com authenticated user is rejected
  - a regular @research-square.com user can create an entry under their own
    uid, cannot create one under another uid, can read any entry, cannot
    write to `categories`/`tasks`/`admins`
  - a user in `admins` can write `categories`/`tasks`, and can grant admin
    access to a user who has signed in before with a matching email, but
    cannot grant it to a made-up uid or a mismatched email, and can never
    update or delete an existing `admins` doc
  This is how the brief's "prove the rules reject bad actors" requirement
  gets satisfied concretely, not just by inspection.
- **UI modules** are thin (DOM + Firestore calls) and are verified manually
  in a live Firebase project rather than unit-tested, per the Detronics
  testing discipline (only `js/` outside `js/ui/` is pure and gets tests).

## 10. Seed data

Categories and tasks are seeded from `reference/Tasks and Catergories.xlsx`
("Tasks" sheet): 10 categories, 67 tasks, using the sheet's
Purpose/Explanation column as each task's description. The owner-assignment
and rationale columns (which belong to a separate, unrelated
points-of-contact exercise) are dropped. All seeded weights default to 1.0.
Admins can add, edit, reweight, or remove any of these after launch.

## 11. Deliverables

- GitHub Pages-ready static frontend (this repo)
- `firestore.rules`, ready to deploy
- Firestore emulator rules-test suite
- Seed script/data for `categories`/`tasks` from the spreadsheet
- README covering: Firebase project setup (enabling Email/Password auth,
  deploying rules, provisioning accounts, seeding the first admin), running
  locally, running tests, deploying
  to GitHub Pages, and a plain statement of what data leaves the browser
  (all of it, to Firebase — unlike a typical Detronics tool) and why.

## 12. Explicitly out of scope for this pilot

No money, tax, tenure, or bonus-pool logic. No consistency/frequency
multiplier. No ranking. No logging caps or rate limits. No Cloud Functions
or any server-side compute — all aggregation happens client-side against
Firestore reads, which is acceptable at pilot scale (a single company's
engineering team).
