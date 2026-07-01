import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const hooksPath = path.join(root, "data", "hooks.json");
const memoryPath = path.join(root, "memory", "seen-hook-ids.json");
const feedRoot = path.join(root, "feeds");

function localDate() {
  if (process.env.HOOKS_RADAR_FEED_DATE) {
    return process.env.HOOKS_RADAR_FEED_DATE;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Los_Angeles",
    year: "numeric",
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${byType.year}-${byType.month}-${byType.day}`;
}

async function readSeenIds() {
  if (process.env.HOOKS_RADAR_FEED_RESET === "1") {
    return new Set();
  }

  try {
    const raw = await readFile(memoryPath, "utf8");
    const parsed = JSON.parse(raw);

    return new Set(Array.isArray(parsed.hookIds) ? parsed.hookIds : []);
  } catch (error) {
    if (error.code === "ENOENT") {
      return new Set();
    }

    throw error;
  }
}

function scoreHook(hook) {
  let score = 0;

  if (hook.featured) score += 4;
  if (hook.sourceStrength === "owned-proven") score += 3;
  if (hook.sourceStrength === "source-observed") score += 2;
  if (hook.useCases.includes("ai-workflow")) score += 2;
  if (hook.useCases.includes("career")) score += 1;

  return score;
}

function selectFeatured(hooks, seenIds) {
  const newHooks = hooks.filter((hook) => !seenIds.has(hook.id));
  const pool = newHooks.length > 0 ? newHooks : hooks;

  return [...pool]
    .sort((left, right) => scoreHook(right) - scoreHook(left) || left.name.localeCompare(right.name))
    .slice(0, 8);
}

function oneLine(value) {
  return (value || "See source pattern.").replace(/\s+/g, " ").trim();
}

function renderFeed({ date, hooks, featured }) {
  const hookIds = featured.map((hook) => hook.id);

  return `# Hooks Radar Weekly Feed - ${date}

Updated after the Hooks Radar source sync.

<!-- hooks-radar-feed-version: 1 -->
<!-- featured-hook-ids: ${hookIds.join(", ")} -->

## Summary

- Catalog count: ${hooks.length} public-ready hook patterns.
- Featured this week: ${featured.length}.
- Source model: private GeorgeHooks markdown -> public Hooks Radar catalog.

## Featured Hooks

${featured
  .map(
    (hook) => `- [${hook.name}](https://hooksradar.snackoverflowgeorge.com/hooks/${hook.id})
  - Formula: ${hook.formula}
  - Strength: ${hook.sourceStrength}
  - Proof type: ${hook.proofType}
  - Use cases: ${hook.useCases.join(", ")}
  - Why it matters: ${oneLine(hook.twistPayoff)}`,
  )
  .join("\n\n")}

## Agent Setup Prompt

Ask your agent:

\`\`\`text
Use Hooks Radar. Pick two hook patterns relevant to my current content idea,
explain the tradeoff between them, and rewrite the first 1-6 seconds with
visual frame, on-screen text, spoken opening, and payoff.
\`\`\`

## Builder Takeaways

- Use: start with the recommended hook and adapt the formula, not the original creator's identity.
- Verify: the first 1-6 seconds should include visual frame, on-screen text, and spoken opening.
- Save: keep winning variants in the private GeorgeHooks source repo before syncing public-ready patterns.
`;
}

async function main() {
  const date = localDate();
  const [year, month] = date.split("-");
  const hooks = JSON.parse(await readFile(hooksPath, "utf8"));
  const seenIds = await readSeenIds();
  const featured = selectFeatured(hooks, seenIds);
  const feedDir = path.join(feedRoot, year, month);
  const feedPath = path.join(feedDir, `${date}.md`);

  await mkdir(feedDir, { recursive: true });
  await mkdir(path.dirname(memoryPath), { recursive: true });
  await writeFile(feedPath, renderFeed({ date, hooks, featured }));
  await writeFile(memoryPath, `${JSON.stringify({ hookIds: hooks.map((hook) => hook.id) }, null, 2)}\n`);
  console.log(`Wrote ${feedPath}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

