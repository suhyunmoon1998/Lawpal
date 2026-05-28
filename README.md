# Lawpel MVP Scaffold

Lawpel is a legal deadline and case-document automation web app scaffold for U.S. law firms. The MVP emphasizes verified-source deadline detection, immutable source retention, and attorney-controlled approval before anything becomes final.

## Core safety rule

Every AI-generated item must remain in review until an attorney approves it.

Required warning:

> Draft generated from case emails, attachments, and verified rule sources. Not approved for filing, service, or court use until reviewed and approved by an attorney.

System deadline warning:

> System detected a possible deadline based on the source email/document and a verified rule. Attorney approval is required before use.

## Stack

- Next.js 14 App Router
- React + TypeScript
- PostgreSQL + Prisma ORM
- Gmail and Google Calendar service scaffolds
- BullMQ queue stub
- Role-aware auth scaffold
- Audit logging

## Included MVP areas

- Login page and app shell
- Firm dashboard and review queue UI
- Inbox review, cases, case workspace, deadlines, calendar, rules, approvals, logs, and settings pages
- Prisma schema for firm, user, matter, email, attachment, rule, deadline, document, approval, audit, task, contact, and calendar entities
- API route scaffolds for login, Gmail connect, email import, case creation, email assignment, deadline detection, document updates, approvals, calendar push, and audit logs
- Seed data and basic unit tests

## Local setup

1. Copy `.env.example` to `.env`.
2. Start PostgreSQL and Redis locally.
3. Install dependencies with `npm install`.
4. Generate Prisma client with `npm run prisma:generate`.
5. Run migrations with `npm run prisma:migrate`.
6. Seed demo data with `npm run prisma:seed`.
7. Start the app with `npm run dev`.

## Local operations

- Start the email import worker with `npm run worker:email-import`.
- Daily Gmail sync requires:
  - PostgreSQL running
  - Redis running
  - the email import worker running
  - a connected Gmail account with daily sync enabled in Settings
- On macOS, you can keep PostgreSQL and Redis running at login with:
  - `brew services start postgresql@16`
  - `brew services start redis`
- You can keep the email import worker running in a separate terminal or install it as a LaunchAgent that calls [scripts/start-email-import-worker.sh](/Users/soohyunmun/Desktop/lawpel%20/scripts/start-email-import-worker.sh).

## Demo credentials

- `attorney@riverachenlaw.com` / `password123`
- `admin@riverachenlaw.com` / `password123`

## Next recommended build steps

- Replace demo password handling with real hashing and session hardening.
- Implement encrypted token storage helpers using `ENCRYPTION_KEY`.
- Add Gmail webhook or polling ingestion and raw MIME persistence.
- Add holiday calendars and jurisdiction-aware court-day logic.
- Add real source-text verification pipelines for rules and uploaded arbitration rules.
- Add DOCX/PDF export pipelines for attorney-approved or locked document versions only.
