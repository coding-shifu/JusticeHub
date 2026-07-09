**JusticeHub**

**MVP Product Requirements Document**

Category: Legal Technology / Practice Management

Version: 0.1 — Draft

Date: June 29, 2026

# **1\. Problem Statement**

Small and mid-size law firms still run their practice on a patchwork of email threads, shared drives, and Word documents. Case knowledge lives in individual inboxes, not in a shared system, which creates two compounding problems:

* Internal chaos: status, documents, and deadlines are scattered, hard to hand off between staff, and easy to lose track of.

* Client anxiety: clients have no visibility into where their case stands, so they call or email the firm repeatedly for updates — adding admin load instead of removing it.

JusticeHub's MVP goal is to fix both problems with the smallest possible product: one shared system of record per case, and one simple window into it for the client.

# **2\. Target User & Initial Beachhead**

Primary buyer: solo and small law firms (1–10 attorneys) currently coordinating cases via email and Word. These firms feel the pain of problem \#1 daily but typically can't afford or don't need a full enterprise legal OS like Clio or PracticePanther.

Recommended beachhead market: independent firms and solo practitioners in underserved geographies (e.g. Nigeria/West Africa) where Clio-class tools are priced, marketed, and built for the US/UK market. This avoids a head-on feature war with incumbents and gives a defensible early wedge — worth validating with 3–5 target firms before writing code.

# **3\. MVP Scope**

The MVP is intentionally narrow: it should make a firm's case status and documents live in one shared place, and let clients check status without calling the office. Everything else from the original concept is explicitly deferred.

## **3.1 In Scope (MVP)**

| Feature | MVP Definition |
| :---- | :---- |
| Case management | Create/view/update cases: title, client, matter type, assigned attorney, status (e.g. Intake → Active → Awaiting Court → Closed), internal notes. |
| Document hub | Upload, tag, and organize documents per case. Replaces email attachments and local Word folders as the source of truth. |
| Client portal | Read-only client login showing: case status, key dates, and documents the firm has explicitly shared. |
| Team collaboration (lite) | Internal comments/notes on a case, assign a case to a team member, basic activity log. |
| Court dates & deadlines | Add key dates to a case; visible to internal team and to the client on the portal. |

## **3.2 Out of Scope for MVP (Phase 2+)**

* AI drafting — high value, but needs a validated user base and document corpus first; revisit once case/doc data exists to ground it.

* Billing & invoicing — important for monetization but adds payments/compliance complexity; sequence after core workflow is proven.

* Time tracking — natural pairing with billing; build together in Phase 2\.

* Document e-signature — typically requires third-party integration (e.g. DocuSign API) or compliance review; Phase 2/3.

* Contract lifecycle management — a distinct product surface (templates, clauses, redlining); treat as a separate module post-MVP, not bundled into the case workflow.

Rationale: shipping all 9 features before a single firm has validated the core loop risks months of build time on features nobody asked for yet. The MVP should be buildable in 6–8 weeks by a single developer.

# **4\. Success Metrics for MVP**

| Metric | MVP Target (first 60 days post-launch) |
| :---- | :---- |
| Pilot firms onboarded | 3–5 firms actively using it |
| Cases created per firm | 10+ active cases per firm |
| Client portal adoption | ≥50% of clients with portal access log in at least once |
| Reduction in status-check calls/emails | Self-reported decrease from pilot firms (qualitative survey) |
| Weekly active usage by staff | ≥3 logins/week per active staff user |

# **5\. User Personas**

## **Persona A — Solo Attorney ("Adaeze")**

* Runs her own practice, juggles 15–25 active cases, no dedicated admin staff.

* Currently: cases tracked via email folders \+ a Word "case list" she updates inconsistently.

* Needs: a fast way to see all case statuses at a glance and stop re-explaining status to clients on the phone.

## **Persona B — Firm Admin / Paralegal ("Tunde")**

* Manages document intake and scheduling for 2–3 attorneys.

* Currently: forwards documents by email, manually tracks court dates in a calendar app disconnected from case files.

* Needs: one place to upload/find documents per case, and to know what's overdue.

## **Persona C — Client ("Mrs. Okafor")**

* Has an active case (e.g. property dispute) and no visibility into progress beyond occasional calls.

* Needs: a simple way to check "what's happening with my case" without bothering the firm.

# **6\. Core User Flows**

## **6.1 Attorney/Admin: Create and manage a case**

1. Log in → "New Case" → enter client, matter type, assigned attorney

2. Upload relevant documents and tag them (e.g. "Pleadings", "Correspondence", "Evidence")

3. Set case status and add key dates (hearings, filing deadlines)

4. Invite client to the portal (generates secure access link/login)

5. As case progresses, update status and add notes; client view updates automatically

## **6.2 Client: Check case status**

6. Receive portal invite via email/SMS → set password

7. Log in → see case status, next key date, and shared documents

8. No ability to edit — strictly read access to reduce support/permissions complexity in MVP

# **7\. Data Model (Simplified)**

| Entity | Key Fields | Relationships |
| :---- | :---- | :---- |
| Firm | id, name, plan\_tier | Has many Users, Cases |
| User (staff) | id, firm\_id, name, role (admin/attorney/staff) | Belongs to Firm; assigned to Cases |
| Client | id, firm\_id, name, email, phone, portal\_access (bool) | Belongs to Firm; linked to Cases |
| Case | id, firm\_id, client\_id, title, matter\_type, status, assigned\_user\_id | Belongs to Firm \+ Client; has many Documents, CaseEvents, Notes |
| Document | id, case\_id, filename, storage\_url, tag, visible\_to\_client (bool) | Belongs to Case |
| CaseEvent | id, case\_id, title, date, visible\_to\_client (bool) | Belongs to Case (court dates/deadlines) |
| Note | id, case\_id, author\_id, body, created\_at | Belongs to Case; internal only |

# **8\. Recommended Tech Stack**

Aligned to a stack that's fast to ship an MVP with and easy to extend in Phase 2:

* Frontend & backend: Next.js (single codebase, server actions/API routes for case \+ document logic)

* Database & auth: Supabase (Postgres \+ row-level security — important for firm/client data isolation; built-in auth covers staff \+ client logins)

* File storage: Supabase Storage (signed URLs for document access control between staff/client visibility)

* Notifications (status updates, portal invites): Email via a transactional provider; Zapier can bridge to SMS/WhatsApp if needed without custom build

* Phase 2 candidates: OpenAI API for AI drafting once a document corpus exists; e-signature via a third-party API rather than building in-house

# **9\. Non-Functional Requirements**

* Data isolation: every query scoped by firm\_id; Postgres row-level security enforced, not just app-layer checks — legal data is highly sensitive.

* Access control: three roles minimum — firm admin, staff, client (read-only). Document and event visibility to clients is opt-in per item, not default-on.

* Audit trail: every status change and document upload logged with user \+ timestamp (table-stakes for legal context, and a future trust signal for firms).

* Availability: client-facing portal should not depend on the same infra path as internal tools failing together — basic uptime monitoring from day one.

# **10\. Roadmap Beyond MVP**

| Phase | Focus |
| :---- | :---- |
| Phase 2 | Billing & invoicing, time tracking, e-signature integration — turns the tool into a revenue-replacing system, not just an ops tool. |
| Phase 3 | AI drafting (using accumulated case/document data), contract lifecycle module, deeper automation (e.g. auto-drafted client status updates). |
| Phase 4 | Multi-firm scale features: reporting/analytics, integrations marketplace, white-label options. |

# **11\. Risks & Open Questions**

* Competitive risk: Clio, MyCase, PracticePanther, Smokeball, and CASEpeer are established, well-funded incumbents — MVP must win on a specific underserved segment, not feature parity.

* Compliance risk: legal data may be subject to confidentiality/privilege obligations and local data protection law — worth a lightweight compliance review before onboarding real client data, even pre-revenue.

* Trust risk: a new, unproven tool holding privileged case data is a harder sell than most SaaS categories — pilot firms may want guarantees (data export, deletion, security posture) before committing.

* Open question: which beachhead segment (geography or practice area, e.g. immigration, family law, small-claims) to target first for the pilot cohort — recommend validating with 5–10 discovery calls before MVP build starts.

# **12\. Suggested Next Steps**

9. Run 5–10 discovery conversations with target firms to validate the two core problems and pick a beachhead segment.

10. Build MVP per Section 3.1 scope — target 6–8 weeks with Next.js \+ Supabase.

11. Pilot with 3–5 firms for 60 days, track metrics in Section 4\.

12. Use pilot feedback to prioritize Phase 2 (billing/time tracking vs. e-signature) based on what pilot firms actually ask for first.