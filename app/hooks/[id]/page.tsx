import Link from "next/link";
import { hooks } from "@/lib/hooks";

type Props = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return hooks.map((hook) => ({ id: hook.id }));
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const hook = hooks.find((item) => item.id === id);

  return {
    title: hook ? `${hook.name} - Hooks Radar` : "Hook Pattern - Hooks Radar",
    description: hook?.twistPayoff || "A reusable short-form hook pattern.",
  };
}

export default async function HookDetailPage({ params }: Props) {
  const { id } = await params;
  const hook = hooks.find((item) => item.id === id);

  if (!hook) {
    return (
      <main className="hook-detail">
        <nav>
          <Link href="/">Back to Hooks Radar</Link>
        </nav>
        <h1>Hook not found</h1>
      </main>
    );
  }

  return (
    <main className="hook-detail">
      <nav>
        <Link href="/">Back to Hooks Radar</Link>
      </nav>
      <p className="card-kicker">{hook.sourceStrength}</p>
      <h1>{hook.name}</h1>
      <p>{hook.twistPayoff}</p>

      <dl>
        <div>
          <dt>Formula</dt>
          <dd>{hook.formula}</dd>
        </div>
        <div>
          <dt>Use Cases</dt>
          <dd>{hook.useCases.join(", ")}</dd>
        </div>
        <div>
          <dt>Source Basis</dt>
          <dd>{hook.sourceBasis}</dd>
        </div>
      </dl>

      <h2>Copyable Markdown</h2>
      <pre className="markdown-box">{hook.markdown}</pre>
    </main>
  );
}

