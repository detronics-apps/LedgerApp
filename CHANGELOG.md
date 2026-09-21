# Changelog

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
