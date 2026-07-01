import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourceDir = process.env.GEORGEHOOKS_PATH
  ? path.resolve(process.env.GEORGEHOOKS_PATH)
  : path.resolve(root, "..", "georgehooks");
const hooksDir = path.join(sourceDir, "hooks");
const localHomePathMarker = `/${"Users"}/`;
const publicExamplesHeading = "Public Examples";
const publicMarkdownSectionHeadings = ["Why It Works", publicExamplesHeading, "Reference Videos", "Notes"];
const publicReferenceFields = [
  "Platform",
  "URL",
  "Creator / account",
  "Captured",
  "Public metrics at capture",
  "Hook line / on-screen text",
  "First frame",
  "Why this matches the pattern",
];
const privateOnlyMarkers = [
  "George-Native Examples",
  "Private Notes",
  "Private Context",
  "George Drafts",
  "Internal Notes",
  "Local archive or transcript note",
  "georgerepo/",
  localHomePathMarker,
];

function parseFrontmatter(markdown) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n?/);
  const fields = {};

  if (!match) {
    return fields;
  }

  for (const line of match[1].split("\n")) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);

    if (!field) {
      continue;
    }

    const [, key, rawValue] = field;
    const value = rawValue.trim();

    if (value === "true" || value === "false") {
      fields[key] = value === "true";
    } else if (value.startsWith("[") && value.endsWith("]")) {
      fields[key] = JSON.parse(value);
    } else {
      fields[key] = value.replace(/^["']|["']$/g, "");
    }
  }

  return fields;
}

function stripFrontmatter(markdown) {
  return markdown.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

function section(markdown, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(
    new RegExp(`(?:^|\\n)## ${escaped}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, "i"),
  );

  return match?.[1]?.trim() || "";
}

function sectionBlock(markdown, heading) {
  const text = section(markdown, heading);
  return text ? `## ${heading}\n\n${text}` : "";
}

function filteredReferenceVideos(markdown) {
  const text = section(markdown, "Reference Videos");

  if (!text) {
    return "";
  }

  const allowedFieldPattern = new RegExp(
    `^- (${publicReferenceFields.map((field) => field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}):`,
  );
  const lines = [];
  let keepContinuation = false;

  for (const line of text.split("\n")) {
    if (allowedFieldPattern.test(line)) {
      lines.push(line);
      keepContinuation = true;
      continue;
    }

    if (keepContinuation && /^\s{2,}\S/.test(line)) {
      lines.push(line);
      continue;
    }

    keepContinuation = false;
  }

  return lines.length > 0 ? `## Reference Videos\n\n${lines.join("\n")}` : "";
}

function publicMarkdown(markdown) {
  const title = markdown.match(/^# .+$/m)?.[0] || "";
  const blocks = [
    title,
    sectionBlock(markdown, "Why It Works"),
    sectionBlock(markdown, publicExamplesHeading),
    filteredReferenceVideos(markdown),
    sectionBlock(markdown, "Notes"),
  ].filter(Boolean);

  return blocks.join("\n\n").trim();
}

function assertPublicExportSafe(hooks) {
  for (const hook of hooks) {
    for (const marker of privateOnlyMarkers) {
      if (hook.markdown.includes(marker)) {
        throw new Error(`Public hook export included private-only marker "${marker}" in ${hook.id}`);
      }
    }

    const exportedHeadings = [...hook.markdown.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
    const unexpectedHeading = exportedHeadings.find(
      (heading) => !publicMarkdownSectionHeadings.includes(heading),
    );

    if (unexpectedHeading) {
      throw new Error(`Public hook export included unexpected section "${unexpectedHeading}" in ${hook.id}`);
    }
  }
}

function listItems(text) {
  return text
    .split("\n")
    .map((line) => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter(Boolean);
}

function oneLine(value, fallback) {
  return (value || fallback).replace(/\s+/g, " ").trim();
}

function toHook(filename, markdown) {
  const frontmatter = parseFrontmatter(markdown);

  if (frontmatter.public_ready === false) {
    return null;
  }

  const body = stripFrontmatter(markdown);
  const exportedBody = publicMarkdown(body);
  const id = frontmatter.id || filename.replace(/\.md$/, "");
  const examples = listItems(section(body, publicExamplesHeading));
  const whyItWorks = listItems(section(body, "Why It Works"));
  const onScreenText = frontmatter.on_screen_text || "";

  return {
    id,
    name: frontmatter.name || id,
    status: frontmatter.status || "candidate",
    sourceStrength: frontmatter.source_strength || "candidate",
    proofType: frontmatter.proof_type || "direct-claim",
    useCases: Array.isArray(frontmatter.use_cases) ? frontmatter.use_cases : [],
    formula: frontmatter.formula || "",
    firstFrame: frontmatter.first_frame || "",
    onScreenText,
    twistPayoff: frontmatter.twist_payoff || "",
    sourceBasis: frontmatter.source_basis || "Distilled public-ready pattern.",
    sourceUrl: frontmatter.source_url || "",
    featured: Boolean(frontmatter.featured),
    whyItWorks,
    examples: examples.length > 0 ? examples : [onScreenText || frontmatter.formula || ""].filter(Boolean),
    markdown: exportedBody,
  };
}

function generatedModule(hooks) {
  const sourceStrengths = [...new Set(hooks.map((hook) => hook.sourceStrength))].sort();
  const proofTypes = [...new Set(hooks.map((hook) => hook.proofType))].sort();
  const useCases = [...new Set(hooks.flatMap((hook) => hook.useCases))].sort();

  return `export type HookPattern = {
  id: string;
  name: string;
  status: string;
  sourceStrength: string;
  proofType: string;
  useCases: string[];
  formula: string;
  firstFrame: string;
  onScreenText: string;
  twistPayoff: string;
  sourceBasis: string;
  sourceUrl: string;
  featured: boolean;
  whyItWorks: string[];
  examples: string[];
  markdown: string;
};

export const hookSourceCount = ${hooks.length};
export const sourceStrengths = ${JSON.stringify(sourceStrengths, null, 2)};
export const proofTypes = ${JSON.stringify(proofTypes, null, 2)};
export const useCases = ${JSON.stringify(useCases, null, 2)};
export const hooks: HookPattern[] = ${JSON.stringify(hooks, null, 2)};
`;
}

async function main() {
  const entries = await readdir(hooksDir, { withFileTypes: true });
  const hooks = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }

    const markdown = await readFile(path.join(hooksDir, entry.name), "utf8");
    const hook = toHook(entry.name, markdown);

    if (hook) {
      hooks.push(hook);
    }
  }

  hooks.sort((left, right) => {
    return Number(right.featured) - Number(left.featured) || left.name.localeCompare(right.name);
  });
  assertPublicExportSafe(hooks);

  await mkdir(path.join(root, "data"), { recursive: true });
  await mkdir(path.join(root, "lib"), { recursive: true });
  await writeFile(path.join(root, "data", "hooks.json"), `${JSON.stringify(hooks, null, 2)}\n`);
  await writeFile(path.join(root, "lib", "hooks.ts"), generatedModule(hooks));
  console.log(`Synced ${hooks.length} hook patterns from ${hooksDir}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
