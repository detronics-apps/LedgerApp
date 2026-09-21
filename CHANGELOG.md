# Changelog

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
