# Hooks Radar

Hooks Radar is a searchable catalog of reusable short-form video hook patterns.

Live site: https://hooksradar.snackoverflowgeorge.com

It follows the same public/private split as `GeorgeLoops`/`loops-radar` and
`georgesbooks`/`books-radar`:

- `georgehooks` keeps private source observations, working notes, and
  George-native examples.
- `hooksradar` keeps the public website, feeds, tests, and installable agent
  skill.

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

## Checks

```sh
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
