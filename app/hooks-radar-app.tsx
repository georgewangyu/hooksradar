"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { HookPattern } from "@/lib/hooks";
import { proofTypes, sourceStrengths, useCases } from "@/lib/hooks";

type Props = {
  hooks: HookPattern[];
};

type Status = "idle" | "submitting" | "success" | "error";

type ErrorResponse = {
  error?: string;
  issues?: Record<string, string[] | undefined>;
};

type SubmissionField =
  | "submissionType"
  | "visibility"
  | "title"
  | "outcome"
  | "notes"
  | "context"
  | "handle"
  | "website";

const skillInstallCommand = "npx skills add georgewangyu/hooksradar --skill hooks-radar -g";
const skillRepoUrl = "https://github.com/georgewangyu/hooksradar";
const leadStorageKey = "hooksradar-install-unlocked";
const pageSize = 12;

const submissionTypes = [
  ["submit-hook", "Submit hook"],
  ["request-pattern", "Request pattern"],
  ["improve-catalog", "Improve catalog"],
] as const;

const leadLabels: Record<string, string> = {
  email: "Email",
  name: "Name",
  website: "Website",
};

const submissionLabels: Record<SubmissionField, string> = {
  submissionType: "Request type",
  visibility: "Visibility",
  title: "Title",
  outcome: "Why this belongs",
  notes: "Rough note",
  context: "Link or source",
  handle: "Handle",
  website: "Website",
};

const strengthLabels: Record<string, string> = {
  "owned-proven": "Owned proven",
  "owned-adjacent": "Owned adjacent",
  "source-observed": "Source observed",
  candidate: "Candidate",
};

const proofLabels: Record<string, string> = {
  contrarian: "Contrarian",
  "direct-claim": "Direct claim",
  education: "Education",
  "how-solution": "How / solution",
  "pattern-interrupt": "Pattern interrupt",
  question: "Question",
  "social-proof": "Social proof",
};

function labelize(value: string) {
  return strengthLabels[value] || proofLabels[value] || value.replace(/-/g, " ");
}

function copyText(value: string, setter: (value: string) => void, label: string) {
  navigator.clipboard
    ?.writeText(value)
    .then(() => {
      setter(label);
      window.setTimeout(() => setter(""), 1800);
    })
    .catch(() => setter(""));
}

function hookScore(hook: HookPattern) {
  let score = 0;

  if (hook.featured) score += 5;
  if (hook.sourceStrength === "owned-proven") score += 4;
  if (hook.sourceStrength === "source-observed") score += 3;
  if (hook.useCases.includes("ai-workflow")) score += 2;
  if (hook.proofType === "contrarian") score += 1;

  return score;
}

async function leadErrorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Could not unlock the install command. Try again in a moment.";
  }

  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(
    ([field, messages]) =>
      (messages || []).map((message) => `${leadLabels[field] || field}: ${message}`),
  );

  return fieldMessages.length > 0
    ? fieldMessages.join(" ")
    : body?.error || "Please check your email and try again.";
}

async function submissionErrorMessageFor(response: Response) {
  if (response.status !== 400) {
    return "Could not send the request. Try again in a moment.";
  }

  const body = (await response.json().catch(() => null)) as ErrorResponse | null;
  const fieldMessages = Object.entries(body?.issues || {}).flatMap(
    ([field, messages]) =>
      (messages || []).map(
        (message) => `${submissionLabels[field as SubmissionField] || field}: ${message}`,
      ),
  );

  return fieldMessages.length > 0
    ? fieldMessages.join(" ")
    : body?.error || "Please check the request and try again.";
}

export function HooksRadarApp({ hooks }: Props) {
  const [query, setQuery] = useState("");
  const [strength, setStrength] = useState("All");
  const [proofType, setProofType] = useState("All");
  const [useCase, setUseCase] = useState("All");
  const [selectedId, setSelectedId] = useState(hooks[0]?.id || "");
  const [copied, setCopied] = useState("");
  const [leadStatus, setLeadStatus] = useState<Status>("idle");
  const [leadUnlocked, setLeadUnlocked] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [formStatus, setFormStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState("");
  const [submissionType, setSubmissionType] = useState("submit-hook");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [page, setPage] = useState(1);

  const filteredHooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return hooks
      .filter((hook) => {
        const haystack = [
          hook.name,
          hook.formula,
          hook.firstFrame,
          hook.onScreenText,
          hook.twistPayoff,
          hook.sourceBasis,
          hook.useCases.join(" "),
          hook.examples.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        return (
          (strength === "All" || hook.sourceStrength === strength) &&
          (proofType === "All" || hook.proofType === proofType) &&
          (useCase === "All" || hook.useCases.includes(useCase)) &&
          (!normalizedQuery || haystack.includes(normalizedQuery))
        );
      })
      .sort((left, right) => hookScore(right) - hookScore(left) || left.name.localeCompare(right.name));
  }, [hooks, proofType, query, strength, useCase]);
  const pageCount = Math.max(1, Math.ceil(filteredHooks.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredHooks.length);
  const visibleHooks = filteredHooks.slice(pageStart, pageEnd);

  const selectedHook =
    hooks.find((hook) => hook.id === selectedId) || filteredHooks[0] || hooks[0];
  const recommendedHook = filteredHooks.find((hook) => hook.featured) || filteredHooks[0] || hooks[0];

  useEffect(() => {
    setLeadUnlocked(window.localStorage.getItem(leadStorageKey) === "true");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [proofType, query, strength, useCase]);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const payload = Object.fromEntries(new FormData(formElement).entries());

    setLeadStatus("submitting");
    setLeadError("");

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setLeadStatus("error");
        setLeadError(await leadErrorMessageFor(response));
        return;
      }

      window.localStorage.setItem(leadStorageKey, "true");
      setLeadUnlocked(true);
      setLeadStatus("success");
      formElement.reset();
    } catch {
      setLeadStatus("error");
      setLeadError("Could not unlock the install command. Try again in a moment.");
    }
  }

  async function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payload = {
      submissionType: String(form.get("submissionType") || submissionType),
      visibility: String(form.get("visibility") || visibility),
      title: String(form.get("title") || ""),
      outcome: String(form.get("outcome") || ""),
      notes: String(form.get("notes") || ""),
      context: String(form.get("context") || ""),
      handle: String(form.get("handle") || ""),
      website: String(form.get("website") || ""),
    };

    setFormStatus("submitting");
    setFormError("");

    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setFormStatus("error");
        setFormError(await submissionErrorMessageFor(response));
        return;
      }

      formElement.reset();
      setSubmissionType("submit-hook");
      setVisibility("public");
      setFormStatus("success");
    } catch {
      setFormStatus("error");
      setFormError("Could not send the request. Try again in a moment.");
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Hooks Radar home">
          <span className="brand-mark">HR</span>
          <span>Hooks Radar</span>
        </Link>
        <label className="search" htmlFor="hook-search">
          <span aria-hidden="true">⌕</span>
          <input
            id="hook-search"
            placeholder="Search hook patterns, examples, or use cases..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </header>

      <section className="layout-grid">
        <aside className="filters" aria-label="Hook filters">
          <div className="filter-head">
            <h2>Filters</h2>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStrength("All");
                setProofType("All");
                setUseCase("All");
              }}
            >
              Clear all
            </button>
          </div>

          <label>
            Source Strength
            <select value={strength} onChange={(event) => setStrength(event.target.value)}>
              <option>All</option>
              {sourceStrengths.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Proof Type
            <select value={proofType} onChange={(event) => setProofType(event.target.value)}>
              <option>All</option>
              {proofTypes.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Use Case
            <select value={useCase} onChange={(event) => setUseCase(event.target.value)}>
              <option>All</option>
              {useCases.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </select>
          </label>

          <div className="install-card" id="skill">
            <p className="card-kicker">Agent setup</p>
            <h3>Use these hooks inside Codex.</h3>
            {leadUnlocked ? (
              <div className="setup-command">
                <code>{skillInstallCommand}</code>
                <div className="setup-actions">
                  <button
                    type="button"
                    onClick={() => copyText(skillInstallCommand, setCopied, "install-card")}
                  >
                    {copied === "install-card" ? "Copied" : "Copy command"}
                  </button>
                  <a href={skillRepoUrl}>Star the repo</a>
                </div>
                <p>Star Hooks Radar to save it and support the project.</p>
              </div>
            ) : (
              <form className="unlock-form" onSubmit={submitLead}>
                <label>
                  Name
                  <input name="name" autoComplete="name" required />
                </label>
                <label>
                  Email
                  <input name="email" type="email" autoComplete="email" required />
                </label>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" className="honeypot" />
                <button disabled={leadStatus === "submitting"} type="submit">
                  {leadStatus === "submitting" ? "Unlocking..." : "Unlock install command"}
                </button>
                <p>Unlocks the skill command and occasional updates. No spam.</p>
                {leadStatus === "error" && <p className="error">{leadError}</p>}
              </form>
            )}
          </div>
        </aside>

        <section className="catalog" aria-label="Hook catalog">
          {recommendedHook ? (
            <article className="recommended">
              <div>
                <p className="card-kicker">Recommended today</p>
                <h1>{recommendedHook.name}</h1>
                <p>{recommendedHook.twistPayoff}</p>
                <div className="metric-row" aria-label="Recommended hook metadata">
                  <span>{labelize(recommendedHook.sourceStrength)}</span>
                  <span>{labelize(recommendedHook.proofType)}</span>
                  <span>{recommendedHook.useCases.slice(0, 3).map(labelize).join(" / ")}</span>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedId(recommendedHook.id)}>
                View pattern
              </button>
            </article>
          ) : null}

          <div className="catalog-head">
            <div>
              <p className="card-kicker">Hook Patterns</p>
              <h2>{filteredHooks.length} matching hooks</h2>
            </div>
            <p>
              {hooks.length} total public-ready patterns
              {filteredHooks.length > 0 ? ` / showing ${pageStart + 1}-${pageEnd}` : ""}
            </p>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hook Formula</th>
                  <th>Source</th>
                  <th>Use Cases</th>
                  <th>Example</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleHooks.map((hook) => (
                  <tr key={hook.id} className={hook.id === selectedHook?.id ? "selected-row" : ""}>
                    <td>
                      <button type="button" onClick={() => setSelectedId(hook.id)}>
                        {hook.formula}
                      </button>
                    </td>
                    <td>
                      <span className={`pill ${hook.sourceStrength}`}>{labelize(hook.sourceStrength)}</span>
                    </td>
                    <td>{hook.useCases.slice(0, 3).map(labelize).join(", ")}</td>
                    <td>{hook.examples[0] || hook.onScreenText}</td>
                    <td>
                      <button
                        className="icon-button"
                        type="button"
                        aria-label={`Copy ${hook.name}`}
                        title="Copy formula"
                        onClick={() => copyText(hook.formula, setCopied, hook.id)}
                      >
                        {copied === hook.id ? "✓" : "⧉"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredHooks.length > pageSize ? (
            <nav className="pagination" aria-label="Hook pagination">
              <button
                className="page-button"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                type="button"
              >
                Previous
              </button>
              <span className="page-status">
                Page {currentPage} of {pageCount}
              </span>
              <button
                className="page-button"
                disabled={currentPage === pageCount}
                onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                type="button"
              >
                Next
              </button>
            </nav>
          ) : null}
        </section>

        {selectedHook ? (
          <aside className="detail-panel" aria-label="Selected hook pattern">
            <div className="detail-head">
              <p className="card-kicker">Selected Pattern</p>
              <Link href={`/hooks/${selectedHook.id}`}>Open</Link>
            </div>
            <h2>{selectedHook.name}</h2>
            <span className={`pill ${selectedHook.sourceStrength}`}>
              {labelize(selectedHook.sourceStrength)}
            </span>

            <dl>
              <div>
                <dt>Formula</dt>
                <dd>{selectedHook.formula}</dd>
              </div>
              <div>
                <dt>First Frame</dt>
                <dd>{selectedHook.firstFrame}</dd>
              </div>
              <div>
                <dt>On-Screen Text</dt>
                <dd>{selectedHook.onScreenText}</dd>
              </div>
              <div>
                <dt>Twist / Payoff</dt>
                <dd>{selectedHook.twistPayoff}</dd>
              </div>
            </dl>

            <div className="example-box">
              <p className="card-kicker">Example Opening</p>
              <p>{selectedHook.examples[0] || selectedHook.formula}</p>
            </div>

            <div>
              <p className="card-kicker">Why it works</p>
              <ul>
                {selectedHook.whyItWorks.slice(0, 3).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <button
              className="use-hook"
              type="button"
              onClick={() => copyText(selectedHook.markdown, setCopied, "markdown")}
            >
              {copied === "markdown" ? "Copied" : "Use this hook"}
            </button>
          </aside>
        ) : null}
      </section>

      <section className="submit-section" id="submit" aria-labelledby="submit-title">
        <div>
          <p className="card-kicker">Submit</p>
          <h2 id="submit-title">Send a hook pattern or source.</h2>
          <p>
            Public notes go to the shared audience queue. Private review notes go
            to George's private intake.
          </p>
        </div>

        <form className="submit-form" onSubmit={submitRequest}>
          <fieldset>
            <legend>Request type</legend>
            {submissionTypes.map(([value, label]) => (
              <label key={value}>
                <input
                  type="radio"
                  name="submissionType"
                  value={value}
                  checked={submissionType === value}
                  onChange={() => setSubmissionType(value)}
                />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>

          <fieldset>
            <legend>Visibility</legend>
            <label>
              <input
                type="radio"
                name="visibility"
                value="public"
                checked={visibility === "public"}
                onChange={() => setVisibility("public")}
              />
              <span>Public queue</span>
            </label>
            <label>
              <input
                type="radio"
                name="visibility"
                value="private"
                checked={visibility === "private"}
                onChange={() => setVisibility("private")}
              />
              <span>Private note</span>
            </label>
          </fieldset>

          <label>
            Title
            <input name="title" placeholder="A hook pattern, source, or improvement" required />
          </label>
          <label>
            Why this belongs
            <textarea
              name="outcome"
              placeholder="What should Hooks Radar capture or improve?"
              required
            />
          </label>
          <label>
            Rough note
            <textarea
              name="notes"
              placeholder="Paste the hook, transcript fragment, examples, or review note."
              required
            />
          </label>
          <label>
            Link or source
            <input name="context" placeholder="Optional URL, creator handle, or context" />
          </label>
          <label>
            Your handle
            <input name="handle" placeholder="Optional name, email, or social handle" />
          </label>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" className="honeypot" />

          <button type="submit" disabled={formStatus === "submitting"}>
            {formStatus === "submitting" ? "Sending..." : "Send request"}
          </button>
          {formStatus === "success" && (
            <p className="success">Request sent for review.</p>
          )}
          {formStatus === "error" && <p className="error">{formError}</p>}
        </form>
      </section>
    </main>
  );
}
