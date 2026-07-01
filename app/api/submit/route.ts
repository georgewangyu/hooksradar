import { NextResponse } from "next/server";
import { createGitHubIssue } from "@/lib/github-issue";
import { parseHooksSubmission } from "@/lib/submission-schema";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const allowedOrigin = process.env.HOOKS_RADAR_REQUEST_ALLOWED_ORIGIN;

  if (allowedOrigin && origin && origin !== allowedOrigin) {
    return NextResponse.json({ error: "Origin not allowed." }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = parseHooksSubmission(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid submission.",
        issues: parsed.issues,
      },
      { status: 400 },
    );
  }

  if (parsed.data.website) {
    return NextResponse.json({ ok: true });
  }

  try {
    const issue = await createGitHubIssue(parsed.data);
    return NextResponse.json({
      ok: true,
      issueNumber: issue.number,
      issueUrl: issue.html_url,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Could not create hook request." },
      { status: 500 },
    );
  }
}
