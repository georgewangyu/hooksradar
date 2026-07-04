import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

const feedsRoot = path.join(process.cwd(), "feeds");

function feedPaths() {
  if (!existsSync(feedsRoot)) return [];

  return readdirSync(feedsRoot, { recursive: true, encoding: "utf8" })
    .filter((entry): entry is string => /^\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.md$/.test(entry))
    .map((entry) => path.join(feedsRoot, entry))
    .sort();
}

function readFeed(filePath: string) {
  const markdown = readFileSync(filePath, "utf8");
  const id = path.basename(filePath, ".md");
  const title = markdown.match(/^# (.+)$/m)?.[1]?.trim() || `Hooks Radar Feed - ${id}`;
  const summary = markdown.match(/## Summary\s+([\s\S]*?)(?=\n## |$)/)?.[1]?.trim() || "";
  const receipts = Array.from(
    new Set([...markdown.matchAll(/https?:\/\/[^\s)]+/g)].map((match) => match[0])),
  );

  return { id, markdown, receipts, summary, title };
}

const feeds = feedPaths().map(readFeed).sort((left, right) => right.id.localeCompare(left.id));

export function generateStaticParams() {
  return feeds.map((feed) => ({ id: feed.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const feed = feeds.find((item) => item.id === id);

  if (!feed) return { title: "Feed not found | Hooks Radar" };

  return {
    title: `${feed.id} | Hooks Radar`,
    description: feed.summary.replace(/\s+/g, " ").slice(0, 160),
  };
}

export default async function FeedPage({ params }: Props) {
  const { id } = await params;
  const feed = feeds.find((item) => item.id === id);

  if (!feed) notFound();

  return (
    <main className="hook-detail feed-detail-page">
      <nav>
        <Link href="/">Back to Hooks Radar</Link>
      </nav>
      <p className="card-kicker">Weekly Feed</p>
      <h1>{feed.title}</h1>
      {feed.summary && <p>{feed.summary}</p>}

      <h2>Copyable Feed Markdown</h2>
      <pre className="markdown-box">{feed.markdown}</pre>

      {feed.receipts.length > 0 && (
        <>
          <h2>Source Receipts</h2>
          <div className="receipt-list">
            {feed.receipts.map((receipt) => (
              <a href={receipt} key={receipt}>
                {receipt}
              </a>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
