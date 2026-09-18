import Link from "next/link";
import ShowcaseCard from "@/components/ShowcaseCard";
import { attachEngagement, listShippedProblems } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ShowcasePage() {
  const viewer = await getCurrentUser();
  const shipped = await attachEngagement(await listShippedProblems(60), viewer?.id ?? null);

  return (
    <main className="shell">
      <div className="eyebrow">Showcase</div>
      <h1>Shipped, for real</h1>
      <p className="lede" style={{ marginTop: 14 }}>
        Finished projects from the club, newest first. Open one to read what it took — and if you
        want to build your own version of it, fork it from there.
      </p>

      {shipped.length === 0 ? (
        <div className="empty">
          <p>Nothing shipped yet.</p>
          <Link href="/browse" className="btn btn-primary" style={{ marginTop: 12 }}>
            See what&apos;s in progress
          </Link>
        </div>
      ) : (
        <div className="grid-3 section">
          {shipped.map((p) => (
            <ShowcaseCard key={p.id} problem={p} handle={p.handle} />
          ))}
        </div>
      )}
    </main>
  );
}
