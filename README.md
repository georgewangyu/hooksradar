# Hooks Radar

Hooks Radar is a searchable catalog of reusable short-form video hook patterns.

Live site: https://hooksradar.snackoverflowgeorge.com

Design contract: [DESIGN.md](DESIGN.md)

It follows the same public/private split as `GeorgeLoops`/`loops-radar` and
`georgesbooks`/`books-radar`:

- `georgehooks` keeps private source observations, working notes, and
  George-native examples.
- `hooksradar` keeps the public website, feeds, tests, and installable agent
  skill.

## What You Get

- Searchable public catalog of reusable hook patterns.
- Formula, use cases, first-frame, on-screen text, spoken opening, and payoff
  guidance for each pattern.
- Source-strength labels and public-safe reference receipts.
- Weekly feed generation from the synced public catalog.
- Installable agent skill for adapting hooks to a content idea.
- GitHub-backed request form and install-command lead capture.

## Quick Start

```sh
npx skills add georgewangyu/hooksradar --skill hooks-radar -g
```

Then ask your agent:

```text
Use Hooks Radar for this content idea: [idea].
```

## Local Development

```sh
npm install
npm run sync:hooks
npm run feed:weekly
npm run dev
```

Copy `.env.example` to `.env.local` when testing the install-command lead gate
or GitHub request form locally. Keep the Supabase service role key and GitHub
token server-side and never prefix either with `NEXT_PUBLIC_`.

## Verification

```sh
npm run validate:hooks
npm run feed:weekly
npm run --silent feed:latest
npm run typecheck
npm run build
npm run test:ui
```

## Sync Model

Hooks are authored as markdown in `../georgehooks/hooks/*.md`. The sync script
exports only patterns where `public_ready: true` and writes:

- `data/hooks.json`
- `lib/hooks.ts`

```sh
npm run sync:hooks
```

Check source quality without rewriting generated data:

```sh
npm run validate:hooks
```

`public_ready: true` is a pattern-level gate, not a blanket permission to
publish every section in the private source file. Hooks Radar treats the
private repo as the rich working surface and exports only the public contract:

- public frontmatter fields such as formula, use cases, first frame, on-screen
  text, twist payoff, source basis, and source URL
- allowlisted markdown sections: `Why It Works`, `Public Examples`, filtered
  `Reference Videos`, and `Notes`

The public markdown is rebuilt from that allowlist. It is not a copy of the
private markdown with a few things removed. The sync script fails if generated
data contains private-only markers such as `George-Native Examples`,
`Private Notes`, `Private Context`, `George Drafts`, `Internal Notes`,
`Local archive or transcript note`, local paths, or private repo paths.

## Try The Main Flow

1. Search for a hook by use case, source strength, or pattern language.
2. Open a hook detail page.
3. Compare formula, first frame, on-screen text, spoken opening, and payoff.
4. Copy or adapt a public-safe hook option.
5. Submit a public pattern request or private review note.
6. Install the skill and ask for hook options for a content idea.

## Installable Skill

```sh
npx skills add georgewangyu/hooksradar --skill hooks-radar -g
```

Then ask your agent to use Hooks Radar for first-frame, on-screen text, spoken
opening, and payoff options for a content idea.

The homepage install card asks for name and email before revealing the copyable
install command. Submissions are saved server-side into a shared Supabase table
called `radar_leads`; no Supabase key is exposed to the browser.

Create or update the table with:

```sh
psql "$SUPABASE_DB_URL" -f docs/radar-leads-supabase.sql
```

Required deployment environment variables:

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<server-side-service-role-key>
```

## GitHub Request Intake

The bottom-page request form creates GitHub issues from the server route at
`/api/submit`.

Required deployment environment variables:

```env
GITHUB_TOKEN=<server-side-github-token>
GITHUB_OWNER=georgewangyu
GITHUB_REPO=audience-request-form
GITHUB_PRIVATE_REPO=audience-private-intake
GITHUB_API_VERSION=2022-11-28
HOOKS_RADAR_REQUEST_ALLOWED_ORIGIN=
```

Public submissions create issues in `georgewangyu/audience-request-form`.
Private submissions create issues in `georgewangyu/audience-private-intake`.
Hooks Radar adds `hooksradar` and `source-repo:hooksradar` labels so the shared
queue stays triageable.

## Public-Safety Check

Before publishing, run:

```sh
rg -n "(/Users/|/Volumes/|\\.env|\\.tokens|token|secret|password|api[_-]?key|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,})" .
```

Expected result: no secrets, no absolute local paths, and no private archive
paths.
