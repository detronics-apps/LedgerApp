# Changelog

## 0.5.2
- Info tooltips (the (i) icons) now keep working after the first page
  navigation - fixes a bug where the shared tooltip element got silently
  detached from the page on every nav click and never showed again.
- Shortened the Log Effort "impact" tooltip; the full 1-5 reach guide moved
  to the How-to page instead of being duplicated inline.
- Rewrote the whole How-to page in plainer language (fewer stiff/clever
  phrases, shorter sentences) - same sections and behaviour, just clearer.
- New How-to section "What does each category actually cover?": a full
  Purpose/Focus and Not-part-of-this-topic table for all 10 categories, plus
  the rule for categorizing a tool by what it does, not by who later uses
  its output.

## 0.5.1
- Admins panel now lists everyone with admin access and their level (full,
  or which categories), with a "Revoke access" button per row - reverses
  the earlier "no client can ever remove an admins doc" rule. A full admin
  can revoke anyone else's access (with a confirm prompt); their own row
  has no revoke button, to prevent a self-lockout. firestore.rules updated
  (delete allowed for a full admin, never on their own doc) and redeployed.

## 0.5.0
- Company Ledger filters: date range (From/To) instead of a single exact
  date, a "Turn filters off" toggle that keeps your selections while
  showing everything, and the whole Filters panel now collapses.
- New: flag an entry for a second look. Any entry that isn't your own gets
  a "Flag" button on the Company Ledger (reason + optional note). More
  than one person can independently flag the same entry - the Admin
  Dashboard's "Flagged entries" panel groups these into one row per entry
  with a headcount ("Flagged by 2") and every distinct reason/note, and an
  admin can move all of an entry's flags to Under review / Updated /
  Rejected at once. Whoever raised a flag is never shown to the entry's
  owner or to other employees - only to admins, and to the person who
  raised it (their own status on "My Logs"). New `flags` Firestore
  collection and `js/flags.js`; rules redeployed.

## 0.4.1
- Deleting a logged entry is now reserved for full ("All categories")
  admins only - a category-scoped admin no longer sees the Delete button
  on the Company Ledger, even within their own category, since deletion
  is destructive in a way editing isn't.
- Granting admin access now has an explicit "All categories" checkbox
  (locks out the individual category boxes while ticked) instead of the
  old implicit "leave everything unchecked for full admin" convention.
- Deleting a task or category now asks for confirmation first; its
  Archive button reads "Restore" once archived.
- How-to page: added an everyone-visible note that weight/scoring changes
  are never retroactive, and expanded the admin section on Delete vs.
  Archive and on how category weight now works (contribution types, not
  a per-category number - this text had gone stale).
- Fixed: the Relog and Edit buttons on My Logs switched the page to Log
  Effort but left the nav bar's highlight on "My Logs" - same root cause
  as the earlier nav-highlight bug (changing the active tab needs a full
  shell re-render, not just the page content).

## 0.4.0
- "Relog" button on My Logs: pre-fills a new Log Effort entry (dated today)
  from a past one, for fast repeat submissions.
- Company Ledger: filters by Date, Category and Task; Points column removed.
- Company Stats: all points columns/stat-cards removed (activity/category/
  task counts and impact/proof distributions stay visible).
- My Stats: shows the employee's own company-wide ranking position.
- Leaderboard: dropped the redundant "Name" column (it was just the email
  again) - Email is now the only identity column.
- All admins (full and category-scoped) now reach the Admin Dashboard; a
  scoped admin's copy (stats, by-person, needs-validation, CSV export) is
  itself scoped to their own categories.
- Removed the "Excluded from ledger" checkbox and the whole R&R-exclusion
  pilot rule it belonged to (it had no other way to be set). In its place,
  an admin can delete an entry directly from the Company Ledger (e.g. a
  mistake or duplicate) - a full admin any entry, a category-scoped admin
  only within their own categories. This replaces the ledger's earlier
  no-exceptions "not even an admin can delete" rule.

## 0.3.0
- Switched sign-in from Google to admin-provisioned email/password accounts
  (no self-service signup), matching a Microsoft/Outlook shop.
- Real branding, light/dark/system theme toggle, and a dedicated "How to
  use" tab (with extra sections for admins) instead of inline help text.
- Admin-configurable pilot rules (daily/weekly caps, once-a-week impact-5,
  R&R exclusion, ledger anonymization, management validation) via a new
  Settings tab; the How-to page reflects whichever are on.
- Company Ledger's Person column is hidden from non-admins by default
  (it was showing a plain-text sign-in email).
- Category-scoped admins: an admin can be granted access to just one or
  more categories instead of full access, enforced in firestore.rules.
- Replaced per-category weight with three admin-adjustable contribution
  types (Cultural / Operational / Leadership), set once on Settings.
- New admin Leaderboard, filterable by category.
- New admin CSV export of the full ledger.
- Admin task/category management: category filter, visible/editable
  category-per-task, wrapping name/description fields, mobile-safe tables.
- Grouped top nav with hairline separators between kinds of page.

## 0.2.0
- Initial pilot build: log-effort form, My Logs, Company Ledger, My Stats,
  Company Stats, admin dashboard, task/category management with weights,
  and a custom-task review queue.
