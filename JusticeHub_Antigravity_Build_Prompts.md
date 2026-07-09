# JusticeHub MVP — Antigravity Build Sequence

A staged set of prompts to paste into Antigravity, in order. Each chunk builds on the last. Review the Implementation Plan artifact before approving each one, and commit after each chunk completes.

---

## 0. One-time setup (before the first prompt)

- [ ] `git init` in your project folder, make an empty initial commit
- [ ] Create a Supabase project (supabase.com) — free tier is fine for MVP
- [ ] Copy your Supabase Project URL + anon key + service role key somewhere handy
- [ ] Place `PRD.md` (the JusticeHub MVP PRD) in the project root
- [ ] Open the folder as a Project in Antigravity
- [ ] Create a `.env.local` file (empty for now — Antigravity will fill it in, or you'll paste your Supabase keys in when prompted)

---

## Chunk 1 — Project scaffold, auth, and core schema

```
Read PRD.md in this project. We're building the MVP scope from Section 3.1 only.

Step 1 of the build: scaffold the project and set up auth + core schema.

- Initialize a Next.js (App Router, TypeScript) project
- Connect Supabase (Postgres + Auth + Storage) — I'll provide my project URL and keys when you need them
- Create the database schema from Section 7 of the PRD: Firm, User (staff), Client, Case, Document, CaseEvent, Note
- Implement row-level security policies so every table is scoped by firm_id, per Section 9 (Non-Functional Requirements) — this is critical, don't skip or simplify it
- Set up three roles: firm admin, staff, client (read-only)
- Build basic auth: staff signup/login, and a separate client login flow (clients are invited, not self-registering)

Propose an implementation plan first. Don't write code until I approve the plan.
```

**Before approving:** check the plan explicitly addresses RLS per-firm isolation and the three distinct roles — don't let it merge admin/staff into one role to save time.

---

## Chunk 2 — Case management

```
Continue building JusticeHub. Step 2: case management.

- Staff can create a case: title, client (link to existing or create new), matter type, assigned attorney, status (Intake → Active → Awaiting Court → Closed)
- Staff can view a case list filtered/sorted by status, assigned attorney, client
- Staff can update case status and assignment
- Add an activity log: every status change and assignment change is recorded with user + timestamp (per Section 9 audit trail requirement)
- Build the basic UI for case list and case detail view

Show me the implementation plan before coding.
```

---

## Chunk 3 — Document hub

```
Step 3: document hub, per PRD Section 3.1.

- Staff can upload documents to a case, using Supabase Storage
- Documents have a tag (e.g. Pleadings, Correspondence, Evidence) and a visible_to_client boolean, per the Document entity in Section 7
- Document visibility to clients is opt-in per document — default to NOT visible, staff must explicitly toggle it on
- Staff can view/download all documents on a case; client view will only show documents flagged visible
- Use signed URLs for document access, not public buckets

Plan first, then build.
```

---

## Chunk 4 — Client portal

```
Step 4: client-facing portal, per PRD Section 6.2 (the client user flow).

- Staff can invite a client to the portal from the case detail view (generates a secure invite — email link to set a password)
- Client login is separate from staff login and is strictly read-only — no edit capability anywhere
- Client portal shows: case status, the next upcoming key date (from CaseEvent), and any documents flagged visible_to_client
- If a client has multiple cases with the firm, show all of them
- Double-check RLS: a client should only ever be able to query their own case(s), never another client's data, even by guessing IDs

Propose the plan, including how you'll test the RLS isolation between clients, before building.
```

---

## Chunk 5 — Court dates, deadlines, and internal notes

```
Step 5 (final MVP chunk): court dates/deadlines and internal collaboration.

- Staff can add CaseEvents (court dates, filing deadlines) to a case, with a visible_to_client toggle
- Case detail view shows upcoming events sorted by date
- Staff can add internal Notes to a case (text, author, timestamp) — these are never visible to clients
- Add a simple activity feed on the case detail page combining status changes, notes, and events in chronological order

Plan first. After this chunk, use the Browser Subagent to walk through the full MVP flow end-to-end: create a case as staff, upload a document, add a court date, invite a client, then log in as that client and confirm they see only what they should.
```

---

## After all 5 chunks: end-to-end review prompt

```
Do a full review pass across the MVP:

1. Confirm RLS policies on every table are scoped correctly by firm_id and, for clients, by client_id
2. Confirm no client-facing route can leak another firm's or another client's data
3. List anything from PRD Section 3.1 that's incomplete or stubbed
4. Suggest what's needed to deploy this somewhere I can share with a pilot firm (e.g. Vercel + Supabase production project)

Don't make changes yet — just report findings as a plan I can review.
```

---

## Notes while you work

- **Approve plans, don't skim them.** The few minutes spent reading the Implementation Plan artifact before clicking Proceed is the cheapest insurance you have.
- **Commit after every chunk.** If a chunk goes sideways, you want to revert to the last clean commit, not three chunks back.
- **RLS is the one place not to let the agent take shortcuts.** This is legal data — re-read the RLS logic yourself at least once, don't just trust the plan summary.
- **Test the client view as an actual client**, not just by reading the code — create a test client login and click through it yourself before showing it to a pilot firm.
