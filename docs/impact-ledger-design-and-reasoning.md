# Impact Ledger: why it exists, what it is, and why every decision was made

Written for the book on growing a company by focusing on the people in it.
Reflects the app as of version 0.6.8 (October 2026).

A note on sources. The decisions below were made over a long build between
the owner and Claude, starting from a design spec dated 2026-09-19. Where the
owner stated a reason in their own words, it is given as the reason. Where a
reason is clear from how the app is built but was not stated outright, that
is said plainly. The honest limits and the mistakes along the way are part of
the story, so they are included (Parts 6 and 7).

---

## Part 1. The idea behind the tool

### The problem

In an engineering company, most work is tracked. Projects have deliverables,
timesheets have hours, and invoices have lines. But a lot of what keeps the
company running is not tracked anywhere:

- showing a new hire how things work
- fixing a process that kept wasting time
- building a template everyone ends up using
- sorting out a disagreement between two colleagues
- setting up a client visit
- writing something down so the next person does not have to ask

This is real work and it has real value. Management cannot see most of it.
And what nobody knows about, nobody can thank, support, or build on.

Two things follow from that. The people who quietly do the most extra work
get no credit for it, and may burn out or leave without anyone knowing how
much they carried. And the company makes decisions (who to promote, where to
invest, what is working) without knowing what it does not know.

### The belief

A company grows when its people grow. If you focus on the employee, helping
them grow, building them up, and giving thanks where it is due, the company
grows as a result. You cannot do any of that for effort you do not know
about.

So the tool is built around one idea: **make sure the company knows what it
does not know.** It is a tool for each person who uses it. It is how you get
your extra effort seen. If you do not log it, nobody can be blamed for not
noticing it.

### Why a tool at all

The owner could have asked managers to pay closer attention. That does not
work well, for three reasons:

1. Managers cannot be everywhere, and the work that goes unseen is exactly
   the work that happens out of their sight.
2. If recognition depends on one manager noticing, then your career depends
   on how well that one person sees you, and on whether they like you.
3. Memory is a poor record. At review time people remember the last month,
   the loudest person, and the closest person.

A shared, dated record fixes all three. It does not depend on one person's
attention, and it does not fade.

### What the pilot asks

The first design spec put the question this way: when given a simple way to
record contributions outside normal work, what do people choose to record,
how often, and what do they consider extra effort? That is a measuring
question, not a rewarding question. This matters for everything below.

---

## Part 2. What it is, and what it is not

### What it is

- **A way for you to make your extra effort visible.** You log it yourself.
  Nobody does it for you.
- **A measuring instrument.** It gives the company an honest picture of what
  effort happens outside normal duties, who does it, and in which areas.
- **A shared record.** Everyone can see what was done (not who scored the
  most), so knowledge spreads and mistakes get caught.
- **Evidence for a conversation.** In a review, "here is what I did and when"
  is much stronger than "I think I did a lot".

### What it is not, and why each of these was ruled out

| It is not... | Why that matters |
|---|---|
| A bonus or pay tool | Once points turn into money, people write entries to earn money, not to tell the truth. The numbers stop being trustworthy and the tool stops being useful. |
| A competition | Ranking people against each other turns helping a colleague into a race, and makes people hide their methods. It also makes the quiet, steady helper look worse than the loud one. |
| A timesheet | Hours spent do not measure how much something mattered. A five-minute fix that saves a team a week can matter more than a long effort that changes little. |
| A replacement for normal work tracking | Your regular project work stays where it already is. This is only for effort outside your normal duties. |
| A lie detector | Nothing checks entries automatically. The tool relies on honesty, with flags and optional management validation as a safety net. |
| A way to catch people out | A flag asks for a second look. It is not an accusation, and the person who raised it is kept private. |
| Your performance review | It gives your manager something real to talk about. It does not decide a promotion on its own. |
| A reason to overwork | The daily limit (when switched on) exists so nobody piles everything onto one day to look busy. |

**The stop clause.** The How-to page ends its first section with a promise:
*if at any point this tool turns into something it should not be, we stop.*
The tool is only worth having while it does what it is here to do. If it
starts to behave like one of the things in the table above, the right answer
is to stop using it, not to patch it.

---

## Part 3. The principles, and where each one shows up in the tool

| Principle | How the tool puts it into practice |
|---|---|
| You get seen only if you log it | Logging is quick (about 10 to 20 seconds once familiar), and "Relog" copies a past entry so repeat work takes seconds. |
| Measure, do not reward | No money anywhere. No ranking. Points are hidden on the shared ledger. |
| You against yourself, not against others | You see your own score and history. Nobody sees a league table. |
| Honest input beats clever input | Impact is scored on what actually happened. Proof is tiered by effort. Guidance explains the common traps. |
| Many eyes, not one | The ledger is open, anyone can flag, and no single person decides how your work is seen. |
| Catch mistakes without blame | Flags are private, go to admins, and are framed as "second look", not "report". |
| Knowledge should travel | Because the ledger is open, someone can see a OneNote onboarding section or a bolt calculator already exists and build on it. |
| Use plain words | The How-to page is written in plain language on purpose. |
| Be able to stop | The stop clause, and a design where every strong rule is optional and can be switched off. |

---

## Part 4. The decisions in detail

Each decision has the same four parts: what was decided, why, what it
prevents, and an example.

### 4.1 A measurement instrument, not a bonus calculator

**Decided.** The first spec states that there is no money, tax, tenure,
bonus pool, or ranking. Points exist, but they are a measuring scale and not
a currency.

**Why.** The moment a number pays out, the number gets gamed. A measure that
people have a reason to inflate stops measuring anything.

**Prevents.** Inflated entries, fake entries, and arguments about "fair pay"
that would drown out the real goal, which is to see the effort.

**Example.** Two engineers each log a small favour. If points were money, one
might log five favours that did not happen. If points are only a record, the
only reason to log is that it did happen and you want it seen.

### 4.2 No ranking, no leaderboard: you against yourself

**Decided.** Employees do not see their position against colleagues, and
there is no leaderboard page. Each person sees their own points and
breakdown, so the idea is to improve on your own past.

**Why.** The owner stated it this way: the competition part that should stay
is you against yourself. You still see your score and the idea is to improve
it. But it is not a competition between employees.

**Prevents.** People treating help as a race, hiding what they know,
ignoring quiet work because it scores lower, and the slow damage to trust
between colleagues.

**What happened along the way.** This is worth telling honestly. At version
0.4.0 the app added a ranking position to "My Stats" and a Leaderboard page
for admins. At version 0.6.0 both were removed, because they went against the
original scope. Admins can still see who scored what in each category on the
dashboard's "By person" table, because that is useful for oversight. It is
not a ranked, public table.

### 4.3 An open ledger, with limits on what is shared

**Decided.** Every signed-in employee can see the Company Ledger. But points
are hidden on it, other employees do not see who logged an entry, nobody
sees who flagged an entry except admins, and there are no rankings.

**Why.** There are five reasons, and the owner supplied the last three:

1. **Colleagues do the checking.** Nothing checks entries automatically.
   Anyone can flag an entry, but only if they can see it. A private ledger
   would leave the admin as the only check. It also means no single person
   decides how your work is seen. You cannot get stuck under one person who
   does not like you, because many people can see your entries.
2. **Thanks needs someone to see it.** If someone helped a colleague, that
   colleague can see it was logged, and others can notice effort that
   management missed.
3. **Knowledge spreads.** If you see that someone already created a OneNote
   section on onboarding, you can ask in the Friday meeting who made it, ask
   for access, or share ideas on improving it. If you see someone already
   built a bolt calculator, you can use it as it is, or use it as a starting
   point and add to it. The company gets one better calculator, not five
   separate ones built by people who never knew about each other.
4. **It shows what the company values.** Seeing what others log helps you
   judge your own entries fairly and find work you had not thought to log.
5. **It builds trust.** People believe the scoring is fair when they can see
   how everyone is scored.

**Prevents.** Hidden favouritism, a single point of failure in who gets
noticed, and duplicated work.

**Example.** An engineer builds a reusable onboarding notebook and logs it.
Three months later, a different team lead is about to start their own. They
see the entry, ask at the Friday meeting, and end up improving the existing
notebook instead.

**What stays private, and why.**

- *Points.* The ledger shows what was done, not who scored the most. This
  keeps it from turning into a scoreboard.
- *Names.* Other employees do not see who logged an entry. Admins do.
  The Friday-meeting question ("who made this?") is how people find each
  other, so a person's work can be found without making a public list of
  names next to scores.
- *Who flagged.* Only admins see this (and each person sees their own flags).
  If flaggers were known, people would stop flagging to avoid awkwardness.
- *Rankings.* There are none.

### 4.4 Ten categories, with clear edges

**Decided.** Every task belongs to one of ten categories: Strategy & Growth,
Communication & Transparency, Client Success, People, Culture, Learning &
Capability, Operations Workplace & IT, Engineering Excellence, Finance, and
Governance. Each has a stated purpose and a stated "not part of this topic"
line (Appendix A).

**Why.** Categories sound like they overlap. Without clear edges, the same
work lands in different categories depending on who logs it, and the
company cannot see where effort really goes. The "not part of this topic"
column is the tie-breaker: it says which other category owns the thing you
might be unsure about.

**Prevents.** Muddy data, and arguments about where something belongs.

**The decisions the owner made while sharpening these edges:**

- **People is the employment relationship only.** Joining, contract,
  paperwork, benefits, leave, leaving. It is not about wellbeing (that is
  Culture) and not about growth or promotion (that is Learning & Capability).
  *Why:* the deciding question is "is this about getting a person into the
  company, or about helping them once they are here?"
- **Culture is how it feels to work here.** Day to day treatment, resolving
  conflict, wellbeing, and giving recognition and praise.
- **Learning & Capability is focused on the engineer.** Training, mentoring,
  coaching, and making their growth and effort visible to management for
  reviews and promotion. This is where onboarding training sits.
- **Operations, Workplace & IT is physical and IT.** Equipment, the kitchen
  and office, contractors for physical work. The earlier vague wording
  ("company processes, internal projects") was removed because it worked as
  a catch-all for anything.
- **Engineering Excellence is mechanical engineering standards and the
  quality of what is delivered to clients.** The company is a mechanical
  engineering company, so this is not about software.

**The tool rule.** *Categorise a tool by what it does, not by the fact that
it is a tool.* Building a tool does not fit one single category. The task is
not "building a tool"; it is the reason for the tool, or what the tool does.
Every category can have a task about building a tool, but what the tool does
must match the category's purpose.

- A tool for tracking IT equipment belongs under Operations.
- A tool for checking engineering quality belongs under Engineering
  Excellence.
- The Impact Ledger itself belongs under Learning & Capability, because its
  purpose is helping engineers make their effort and growth visible.
- If Culture later uses the Impact Ledger to decide who to praise, that does
  not turn the tool into a Culture entry. The praising is a separate, later
  activity, logged separately by whoever does it.

To make this work in practice, every one of the ten categories has a task
named "Build a tool or system to support..." followed by that category's
own purpose.

**The act versus system test.** Within a category, doing something once is
different from building the reusable thing. "Onboard a new engineer" means
sitting down with one particular new hire. A OneNote onboarding notebook
(training material, how the buddy system works, how to set up the process
for new clients) is not one onboarding. It is the system that makes every
later onboarding consistent. So it is logged under "Build a tool or system to
support engineer development". Ask: is this a one-off act, or am I building
the reusable thing that lets everyone do the act well from now on?

### 4.5 Tasks, and the "Other" escape hatch

**Decided.** The tasks list is about 60 tasks across the ten categories.
If nothing fits, you choose "Other - not listed" and describe it. An admin
reviews these and either adds a real task or links the entry to one that
already exists.

**Why.** A fixed list will always miss things. If people cannot log
something because it is not on the list, the company never learns it
happened, which is exactly the problem the tool exists to solve.

**Prevents.** Lost effort, and a task list that slowly goes out of date.

**Also useful.** The "Other" rate tells you how well the list matches
reality. Many "Other" entries in one area is a sign that a task should be
added.

### 4.6 Impact: score what actually happened

**Decided.** Impact is a 1 to 5 scale:

1. Small help: a quick, low-effort assist with limited or personal scope.
2. Noticeable help: saved someone real time or unblocked a specific problem.
3. Meaningful contribution: improved how a team or process works, not just
   one person's day.
4. Significant improvement: measurably improved outcomes across a team or
   client, likely to keep paying off.
5. Company-shaping improvement: changed how the company operates, does or
   gets work, or is perceived. Company wide change.

The guidance says: **score what actually happened, not a hypothetical.**

**Why.** Almost anything can be made to sound bigger than it was, often
without meaning to. The owner identified two traps that look like measures
but are not:

- **Reach.** "It touched the whole company." Changing the fire alarm
  batteries reaches everyone in the building. It is still a five-minute
  task, not a company-shaping change. Reach is a rough guide only.
- **Hypothetical drama.** "It could have prevented a disaster." A worst case
  you can imagine is not something that happened. Almost any task can be
  described this way if you try hard enough.

A third proxy was ruled out too: **time spent.** Taking longer does not make
something more impactful, and working fast should not score you lower.

**Prevents.** Slow inflation of scores, where every entry drifts toward a 4
or 5 because that is how people describe their own work.

**Example.** Two entries:
- *"I replaced the fire-alarm batteries."* Reached everyone, took five
  minutes. Impact 1 or 2.
- *"I rebuilt the way we hand over files to clients, and the next three
  handovers went without rework."* Reached one team, changed how they work
  and keeps paying off. Impact 3 or 4.

The first reached more people. The second changed more.

**A quick check** before submitting: what actually changed because of what
you did, and would a colleague agree with the level you picked if you
described it plainly? Nobody expects perfect precision. It is a judgement
call and reasonable people will differ on borderline cases. Flagging exists
for the entries that still look wrong.

### 4.7 Proof: how much effort went into the record

**Decided.** Proof is a three level scale, defined by how much effort went
into producing the proof:

1. **Trust me.** Verbal only. Your word, or a colleague who can vouch for it
   out loud.
2. **A reference.** Some effort went into recording it: an email, meeting
   minutes, or similar.
3. **The full record.** The effort is captured in an actual document,
   presentation, or tool that everyone can see and use. For example a
   training guide, a written explanation, or a link to a page that lays it out.

**Why.** The owner's reasoning: proof one is a verbal proof, either your word
or a person that can vouch. Proof two is some effort put into the proof,
like an email or minutes of a meeting. Proof three is the effort actually
captured in something everyone can see and use.

This also does something good for the company. A level 3 proof is itself
useful to others. The effort has been turned into something the whole company
can use, which is the knowledge-sharing goal again.

**Prevents.** A scale that only rewards paperwork for its own sake. It also
means honest, undocumented work can still be logged (level 1) and is not
shut out.

**Evidence field.** Evidence can be a link, or plain text describing who can
vouch for it. A link shows as a compact "View" with the full address behind it.

### 4.8 The points formula and the weights

**Decided.** `points = impact x proof x task weight x category weight`.
The employee does not calculate this while logging. Impact and proof are
fixed scales that admins cannot change on a single entry. Task weights are
editable by admins. Category weight comes from one of three contribution
types, each with its own weight that admins can change:

| Type | Default weight |
|---|---|
| Cultural | x1 |
| Operational | x1.5 |
| Leadership | x2 |

**Why.** The first spec leaned toward not weighting at all. The owner's
requirement was to let the company adjust what it values. All weights start
at 1 so an unweighted setup behaves like plain impact times proof until a
choice is made. Contribution types (instead of one number per category)
mean the company decides once what kind of effort it wants to nudge, and
every category of that type follows.

**Weight changes are never retroactive.** Every entry keeps the weights it
was saved with.

**Why.** If a weight change rewrote old scores, people's past records would
shift under them. Records have to stay honest to what was true when they
were written. The tool stores the weights on each entry for exactly this.

**Prevents.** Quiet rewriting of history, and a loss of trust when old
numbers change.

### 4.9 The date of the effort, and the daily and weekly limits

**Decided.** Every entry has a "when did you do it" date. Several optional
limits can be turned on by an admin:

- a daily entry limit (default 1 per date)
- a weekly points limit (default 39)
- one company-shaping (impact 5) entry per week

All of these are off by default. When they are on, they work by the date of
the effort, not by the day you pressed submit.

**Why.** The owner's reason for the daily limit: it helps people not burn out
by putting too much effort into one single date. And it should not stop
someone catching up on a backlog of different days in one sitting.

**What went wrong first.** The first version counted by the day you
submitted. That blocked someone who logged several different past days in
one sitting, which is legitimate. It was corrected so that the limit counts
by the entry's own date. What it blocks now is piling several entries onto
the same single date.

**Prevents.** Burnout, padding a day to look busy, and one huge week
distorting the picture.

**Why optional.** Limits are rules about behaviour. The pilot question is
what people do when left alone, so the rules are tools to switch on only
when they are needed.

### 4.10 Management validation

**Decided.** An admin can switch on a rule where high scoring entries
(default 15 points or more) are listed as "Needs validation" for management
to confirm.

**Why.** High points are where an honest mistake or an inflated entry
matters most. A second look on the big ones is cheap and targets the risk.

**Prevents.** One inflated entry quietly dominating a person's record.

### 4.11 Flagging: a second look without blame

**Decided.** Anyone can flag an entry that is not their own, with a reason
(possible duplicate, impact too high or low, proof too high or low, other)
and an optional note. More than one person can flag the same entry
independently. Admins see one row per entry with a count ("Flagged by 2"),
and can move all the flags on it through Open, Under review, Updated, or
Rejected. Each flagger can see the status of their own flags on "My Logs".

**Why.** The owner's thinking is that this only works if we trust each other
to catch mistakes, not to police each other. So:

- The person who logged the entry never learns who flagged it. Otherwise
  people would avoid flagging to keep the peace.
- It goes to an admin, not to the entry's owner. This keeps it from being a
  public argument between colleagues.
- Several independent flags matter. If two people flag it separately, that is
  a stronger signal than one, and the admin sees the count and not duplicates.
- Admins cannot edit someone else's entry. If a flag looks valid, they ask
  the owner to fix it. The record stays the owner's.
- You can flag again later, once your previous flag has been resolved.

**Prevents.** Silent inflation, copied or duplicate entries, and the opposite
problem: personal grudges turning into public accusations.

**Example.** An entry claims impact 5 for changing which kitchen cups the
office buys. Two colleagues flag it as "impact too high". The admin sees
"Flagged by 2", asks the owner (privately) to look again, the owner lowers
it, and the flags move to "Updated". Nobody was called out in public.

### 4.12 Who can do what

**Decided.**

- Every employee can create, edit, and delete their own entries.
- A full ("All categories") admin can also delete any entry from the Company
  Ledger. A category-scoped admin cannot, even in their own category.
- Category-scoped admins see the Admin Dashboard and task management only
  for their own categories. They cannot create categories, grant admin
  access, or reach Settings.
- A full admin can see everyone with admin access and revoke others, but
  cannot revoke themselves, so nobody can lock the company out by accident.
- Accounts are created by an admin by hand. There is no self sign up.
- Admin edits to someone else's impact, proof, or description do not exist.

**Why.** Deleting is destructive in a way editing is not, so it is limited to
the most trusted role. Scoping admins by category means the person who owns
a topic can look after it without seeing or changing the rest. Admin-created
accounts mean the tool is for the company only. The company runs on
Outlook, so it uses email and password accounts that the admin creates, in
place of a Google sign in nobody could actually use.

**History.** The first spec said not even an admin can delete an entry, to
protect raw honest data. During the build, the owner asked for admins to be
able to remove a mistake or duplicate, and then narrowed it to full admins
only. This is a real trade-off between keeping a clean record and being able
to fix errors.

### 4.13 Making logging easy

**Decided.** A short form (category, task, date, impact, proof, description,
optional evidence). A "Relog" button that copies a past entry, dated today.
Every employee can download their own entries as a CSV.

**Why.** If logging is a chore, people will not do it, and the people who
skip it will be the busiest, who are also the ones doing the most. Making it
quick is what makes the tool fair. The personal CSV export is there because
it is your data: you can keep it for a review or for your own records.

**Detail.** In your own export, your email is stated once at the top, not
repeated in every row. In the company wide admin export, each row names the
person, because that file covers many people.

### 4.14 Plain language

**Decided.** The How-to page and tooltips are written in simple words. The
How-to page opens with the aim and the mindset. The page is collapsed by
default, with one section open at a time.

**Why.** The owner pointed out that a sentence like "reach and drama are the
two easiest ways scores get inflated without anyone meaning to game it" is
hard to read, and "no one talks like that". A tool that asks people to be
honest about their effort has to be easy to understand, or people will
guess. Shorter is not always clearer, so the rule is clear communication
first, even when that means more words.

### 4.15 Keeping the record trustworthy as the company changes

**Decided.** Names, categories, task weights, and category weights are stored
on every entry at the time it is written.

**Why.** If an admin renames a task or changes a weight later, old entries
should still say what was true when they were logged.

**Prevents.** History that shifts over time without anyone choosing to
change it.

---

## Part 5. How the tool makes sure it is what it says it is

This table lists each promise the tool makes, how it is kept, and whether it
is enforced by the database itself or only by the app's screens.

| The promise | How it is kept | Where it is enforced |
|---|---|---|
| Only company people can use it | Admin-created accounts, no self sign up, company email required | Database rules |
| You can only change your own entries | Edit and delete limited to the owner (plus full admin delete) | Database rules |
| Scores cannot be tampered with | Points must equal impact x proof x weights, recalculated in the rules | Database rules |
| You cannot flag your own entry | Rule checks the entry's owner | Database rules |
| No one can lock themselves out as admin | An admin cannot revoke their own access | Database rules |
| Weight changes do not rewrite history | Weights are saved on each entry | Data design |
| No ranking | The Leaderboard and ranking were removed | Not built |
| Points are hidden on the shared ledger | Points column is not shown there | App screens only |
| Names are hidden from other employees | Person column is shown to admins only | App screens only |
| Flaggers are private | Flag identity shown to admins and to the flagger | App screens only |
| Daily and weekly limits | Checked before submit, by the entry's own date | App screens only |

---

## Part 6. The honest limits

A tool is more trustworthy when it is clear about what it cannot do.

1. **Some privacy is by design of the screens, not the database.** The
   database allows any signed-in employee to read whole documents. So the
   hidden points, hidden names and hidden flaggers are hidden in the app's
   own screens. A technically skilled employee reading the database
   directly could see them. This is fine for a pilot among colleagues. It is
   not fine if the data is ever used for anything with real consequences,
   and it is worth tightening before that point.
2. **The limits (daily, weekly, impact 5) are checked by the app, not by the
   database.** They shape normal behaviour. They are not a barrier against
   someone determined to skip them.
3. **Task and category weights are not checked against a source document.**
   The database checks that weights are positive numbers and that the points
   add up, but not that an entry used the correct weight for its task.
4. **Honest input is still the foundation.** Nothing can fully check a claim
   like "I mentored three people this week". The tool lowers the cost of
   catching mistakes and raises the cost of exaggerating. It does not remove
   the need for honesty.
5. **In a small team, anonymity is thin.** Hiding names does not stop people
   from guessing who did what. The tool does not pretend otherwise. The
   privacy is there to remove casual comparison, not to make people
   impossible to identify.
6. **It depends on culture.** If employees believe the numbers feed a
   ranking or a pay decision, they will either avoid it or game it. How
   management talks about it matters as much as how it is built. That is why
   the How-to page explains the aim and the mindset, and why the stop clause
   exists.

---

## Part 7. Mistakes and course corrections

These are included because the corrections are the clearest evidence of what
the tool is meant to be.

- **Ranking crept in, and was removed.** The ranking position and the
  Leaderboard were added at 0.4.0 and removed at 0.6.0. The drift toward
  competition happened quietly, which is the point: it is easy to build, and
  it needs to be actively resisted.
- **The daily limit was counted by the wrong date.** It counted by the day
  of submission, which blocked someone catching up on a backlog. It now
  counts by the date of the effort.
- **A date bug in the weekly maths.** Dates were converted through UTC,
  which moved a date back a day for anyone in a country ahead of UTC (this
  includes the company's own staff). Found by writing a test, and fixed.
- **Category edges were wrong several times.** People, Culture, Learning &
  Capability, Operations and Engineering Excellence each needed correcting.
  The earlier assumption that Operations and Engineering Excellence could
  never hold a tool-building task was itself wrong, and was corrected.
- **Admin deletion was added after the spec ruled it out**, then narrowed to
  full admins only.
- **Sign in was changed from Google to email and password**, because the
  company's accounts are on Microsoft/Outlook.
- **Buttons were scrolled out of sight** on wide tables. The action column is
  now pinned so it stays reachable.
- **Hard wording was rewritten.** The How-to page was rewritten once in
  plainer language after a sentence was called out as hard to read. Later
  sections were also restored to full length when they had been cut too far.
- **The Proof scale was reframed** around how much effort went into the
  proof, with vouching moved to the lowest level.

---

## Part 8. Lessons for building a growth culture around people

These are the ideas in the tool that apply to any company, with or without
software.

1. **You cannot thank what you cannot see.** Start by making the invisible
   work visible. Recognition, fair promotion, and support all depend on it.
2. **Make the person the owner of their own record.** Do not rely on
   someone else noticing you. Give people a simple way to say what they did.
3. **Measure, then decide.** Keep measuring separate from rewarding. Once a
   number pays, it stops being a measurement.
4. **Compete with yesterday, not with a colleague.** People help each other
   more when helping does not cost them a place in a ranking.
5. **Many eyes beat one.** Do not let one manager's view be the only view of
   your work. An open record spreads the judgement across the people who
   actually saw it.
6. **Make mistakes easy to fix without blame.** A private, framed-as-help
   process catches more honest mistakes than a public accusation process.
7. **Rate what happened, not the story.** The best story you can tell is a
   weak basis for a fair score. Ask what actually changed.
8. **Spread knowledge by default.** When work is visible, people stop
   rebuilding what already exists and start improving it together.
9. **Write rules you can switch off.** Limits and checks should be tools
   used on purpose, not permanent walls.
10. **Be honest about limits, and be willing to stop.** A system that says
    what it cannot do, and promises to stop if it goes wrong, earns more
    trust than one that claims to be perfect.

---

## Appendix A. The ten categories

| Category | Purpose / focus | Not part of this topic |
|---|---|---|
| Strategy & Growth | Where the company is going and how it grows: the goals we set, the markets we choose, and how people and time get invested toward that. | Running an individual project (Operations). Individual client opportunities (Client Success). Budgets and anything financial (Finance). |
| Communication & Transparency | How information moves through the company: decisions coming down, concerns and ideas going up, and teams staying in step while things change. | The content of a decision, which belongs to whichever topic owns it. This topic owns whether you heard about it and had a way to respond. |
| Client Success | Everything that wins and keeps clients: sales, relationships, marketing, social media, our public profile, and the feedback loop from clients. | The technical quality of what we deliver (Engineering Excellence). Revenue targets (Finance). |
| People | Your employment relationship with the company: joining, contract and paperwork, benefits, leave, and leaving. | Growth, promotion and performance review (Learning & Capability). Problems with colleagues and wellbeing (Culture). |
| Culture | How it feels to work here day to day: how we treat each other, how conflict is resolved, wellbeing, and giving recognition or praise. | The formal performance or disciplinary process (Learning & Capability / People). |
| Learning & Capability | Focused on the engineer: internal training, mentoring, coaching, where you are now versus where you are going, and making growth and effort visible to management. | Company-wide engineering standards and the quality of output (Engineering Excellence). |
| Operations, Workplace & IT | Physical and IT scope: IT equipment, the physical workspace, contractors for physical work. Includes building a tool for this. | How engineering work should be performed (Engineering Excellence). A tool built for a different purpose just because it is software. |
| Engineering Excellence | Focused on the company: mechanical engineering standards and the quality of what we deliver to clients, how work is checked, how technical decisions are made. Includes building a tool for this. | Developing an individual engineer (Learning & Capability). A tool built for a different purpose just because it is software. |
| Finance | The company's money: budgets, spending approval, cash flow, pay. | Company policy (Governance). Strategic investment of people and time (Strategy & Growth). |
| Governance | The rules we operate under: policy, legal and regulatory compliance, intellectual property, data security, ethics. | Leave and parental leave (People). |

## Appendix B. Two worked examples

**1. The Impact Ledger app itself.**
- Category: Learning & Capability.
- Task: Build a tool or system to support engineer development.
- Why there: its purpose is to help engineers make their effort and growth
  visible to management. That is the stated purpose of Learning &
  Capability. It is not Culture, even though Culture might later use it to
  decide who to praise, because that praising is a separate, later activity.

**2. A OneNote notebook on the onboarding process.**
- Category: Learning & Capability.
- Task: Build a tool or system to support engineer development (not
  "Onboard a new engineer").
- Why there: onboarding training sits under Learning & Capability, and the
  notebook is a reusable system (training material, how the buddy works, how
  to set the process up for new clients), not a single act of onboarding one
  person. Act versus system.
- Proof: likely the top level, because the effort is captured in something
  everyone can see and use.
- Knowledge sharing: because the ledger is open, a colleague can see it
  exists, ask in the Friday meeting who made it, and add ideas to it.

## Appendix C. Settings and their defaults

| Setting | Default |
|---|---|
| Daily entry limit | Off (1 per date when on) |
| Weekly points limit | Off (39 when on) |
| One impact-5 entry per week | Off |
| Hide names in the Company Ledger | Off |
| Management validation | Off (threshold 15 points when on) |
| Cultural weight | x1 |
| Operational weight | x1.5 |
| Leadership weight | x2 |

Every strong rule is optional and starts off, so the company can first watch
what people do on their own before deciding what to limit.
