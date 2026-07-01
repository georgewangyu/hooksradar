import type { HooksSubmission } from "./submission-schema";

const sourceRepo = "hooksradar";

const typeLabels: Record<HooksSubmission["submissionType"], string> = {
  "submit-hook": "type:submit-hook",
  "request-pattern": "type:request-pattern",
  "improve-catalog": "type:improve-catalog",
};

const typeTitles: Record<HooksSubmission["submissionType"], string> = {
  "submit-hook": "Submit hook",
  "request-pattern": "Request pattern",
  "improve-catalog": "Improve catalog",
};

function compactTitle(input: string) {
  const singleLine = input.replace(/\s+/g, " ").trim();
  return singleLine.length > 78 ? `${singleLine.slice(0, 75)}...` : singleLine;
}

export function issueTitle(submission: HooksSubmission) {
  return `[hooksradar:${submission.submissionType}] ${compactTitle(submission.title)}`;
}

export function issueLabels(submission: HooksSubmission) {
  return [
    sourceRepo,
    `source-repo:${sourceRepo}`,
    "status:needs-triage",
    typeLabels[submission.submissionType],
    `visibility:${submission.visibility}`,
  ];
}

export function issueBody(submission: HooksSubmission) {
  const handle = submission.handle || "_Anonymous / not provided_";
  const context = submission.context || "_Not provided_";
  const visibility =
    submission.visibility === "private" ? "Private review issue" : "Public GitHub issue";

  return [
    "## Hooks Radar submission",
    "",
    `**Type:** ${typeTitles[submission.submissionType]}`,
    `**Source repo:** ${sourceRepo}`,
    `**Visibility:** ${visibility}`,
    `**Handle:** ${handle}`,
    "",
    "## Hook or pattern",
    "",
    submission.title,
    "",
    "## Why this belongs",
    "",
    submission.outcome,
    "",
    "## Rough note or context",
    "",
    submission.notes,
    "",
    "## Link or source",
    "",
    context,
    "",
    "## Triage checklist",
    "",
    "- [ ] Check whether this is already in the public hook catalog",
    "- [ ] Verify the source link and public-safe framing",
    "- [ ] Decide whether it belongs as a new pattern, example, or improvement",
    "- [ ] Add formula, first-frame, on-screen text, payoff, and source-basis notes before publishing",
  ].join("\n");
}

export async function createGitHubIssue(submission: HooksSubmission) {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo =
    submission.visibility === "private"
      ? process.env.GITHUB_PRIVATE_REPO
      : process.env.GITHUB_REPO;

  if (!token || !owner || !repo) {
    throw new Error("Missing GitHub issue environment configuration.");
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": process.env.GITHUB_API_VERSION || "2022-11-28",
      },
      body: JSON.stringify({
        title: issueTitle(submission),
        body: issueBody(submission),
        labels: issueLabels(submission),
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub issue creation failed: ${response.status} ${body}`);
  }

  return (await response.json()) as { html_url: string; number: number };
}
