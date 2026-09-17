import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { attachEngagement, getProblem, listProjectRoles, listTeamMembers } from "@/lib/db";
import { getCurrentUser } from "@/lib/supabase/server";
import ProblemCard from "@/components/ProblemCard";
import TeamSection from "@/components/TeamSection";
import OpenRoles from "@/components/OpenRoles";
import BuildLog from "@/components/BuildLog";

export const dynamic = "force-dynamic";

interface Params {
  id: string;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const problem = await getProblem(id);
  if (!problem) return { title: "Damaru" };
  return {
    title: `${problem.title} — Damaru`,
    description: problem.hook,
  };
}

/**
 * The project's own page - the first shareable, single-thing deep link in
 * the app. Public, like /browse and /u/[handle]: reads db.ts directly rather
 * than round-tripping a route, so there's no spinner and no client-side 404.
 */
export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;

  const viewer = await getCurrentUser();
  const problem = await getProblem(id);
  if (!problem) notFound();

  const [team, roles, [withEngagement]] = await Promise.all([
    listTeamMembers(id),
    listProjectRoles(id),
    attachEngagement([problem], viewer?.id ?? null),
  ]);

  const isOwner = viewer?.id === problem.profileId;
  const isMember = team.some((m) => m.profileId === viewer?.id);
  const canPost = isOwner || isMember;

  return (
    <main className="shell">
      <ProblemCard
        problem={withEngagement}
        interactive={isOwner}
        canEngage={Boolean(viewer)}
        startExpanded
        hideLog
      />

      <TeamSection problemId={id} members={team} isOwner={isOwner} viewerId={viewer?.id ?? null} />

      <OpenRoles
        problemId={id}
        roles={roles}
        isOwner={isOwner}
        canApply={Boolean(viewer) && !canPost}
        signedIn={Boolean(viewer)}
      />

      <section className="section">
        <BuildLog
          problemId={id}
          entries={problem.progress ?? []}
          canPost={canPost}
          density="full"
        />
      </section>
    </main>
  );
}
