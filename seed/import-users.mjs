// Bulk-create sign-in accounts. Usage (from the repo root):
//   $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account-key.json"
//   node seed/import-users.mjs "C:\path\to\users.txt"          (preview only)
//   node seed/import-users.mjs "C:\path\to\users.txt" --go     (create accounts)
// users.txt: one "email;password" per line. Keep it OUTSIDE this repo.
import { readFileSync } from 'node:fs';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const [file, flag] = process.argv.slice(2);
if (!file) { console.error('Give the path to your users file.'); process.exit(1); }

const rows = readFileSync(file, 'utf8').split(/\r?\n/)
  .map((line) => line.split(';').map((s) => s.trim()))
  .filter(([email]) => email)
  .map(([email, password]) => ({ email: email.toLowerCase(), password }));

const bad = rows.filter((r) => !/^[^@\s]+@research-square\.com$/.test(r.email) || !r.password || r.password.length < 6);
if (bad.length) {
  console.error('Fix these lines first (bad email domain or password under 6 characters):');
  for (const r of bad) console.error('  ', r.email);
  process.exit(1);
}

console.log(`${rows.length} accounts in the file${flag === '--go' ? '' : ' (preview - nothing created; add --go to create)'}:`);
for (const r of rows) console.log('  ', r.email);
if (flag !== '--go') process.exit(0);

initializeApp({ credential: applicationDefault(), projectId: 'impact-ledger-96be2' });
const auth = getAuth();
for (const { email, password } of rows) {
  try {
    await auth.getUserByEmail(email);
    console.log('skipped (already exists):', email);
  } catch (err) {
    if (err.code !== 'auth/user-not-found') { console.error('error for', email, err.message); continue; }
    await auth.createUser({ email, password, emailVerified: false });
    console.log('created:', email);
  }
}
