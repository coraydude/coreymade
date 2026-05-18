import { PROJECTS } from "@/lib/projects";
import { notFound } from "next/navigation";
import BackToWork from "@/components/BackToWork";
import CaseStudyContent from "@/components/CaseStudyContent";
import CaseStudyImages from "@/components/CaseStudyImages";
import NextProjectFooter from "@/components/NextProjectFooter";

export const dynamicParams = false;

export async function generateStaticParams() {
  return PROJECTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  return {
    title: project
      ? `${project.title} — Corey Haggard`
      : "Work — Corey Haggard",
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = PROJECTS.find((p) => p.slug === slug);
  if (!project) notFound();

  // Use the project's own image stack; fall back to the cover if no
  // explicit case-study images are set in lib/projects.ts. Entries can
  // be a string (single full-bleed row) or a string[] (two-up or N-up
  // row, side by side).
  const blocks: (string | string[])[] =
    project.images && project.images.length > 0
      ? project.images
      : [project.image];
  const currentIdx = PROJECTS.findIndex((p) => p.slug === project.slug);
  const nextProject =
    PROJECTS[(currentIdx + 1) % PROJECTS.length];

  return (
    <main className="min-h-screen pb-32">
      <BackToWork />

      <CaseStudyContent>
        {/* Padding-top must stay in sync with computeTopPx() in
            components/PersistentTitle.tsx — that fn anchors the title to
            this content top with a 40px gap. */}
        <div className="pt-[42svh] md:pt-[50svh]">
          <div data-case-body>
            <div
              data-stage="intro"
              className="px-6 md:px-10 max-w-[1600px] mx-auto pb-20 md:pb-28 space-y-6 md:space-y-8"
            >
              {(Array.isArray(project.description)
                ? project.description
                : project.description
                ? [project.description]
                : []
              ).map((para, i) => (
                <p
                  key={i}
                  className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light"
                >
                  {para}
                </p>
              ))}
            </div>

            <div data-stage="images">
              <CaseStudyImages rows={blocks} alt={project.title} />
            </div>

            {project.results && (
              <div
                data-stage="results"
                className="px-6 md:px-10 max-w-[1600px] mx-auto pt-20 md:pt-28 space-y-6 md:space-y-8"
              >
                <div className="text-[12px] uppercase tracking-[0.18em] text-muted">
                  Results
                </div>
                {(Array.isArray(project.results)
                  ? project.results
                  : [project.results]
                ).map((para, i) => (
                  <p
                    key={i}
                    className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light"
                  >
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>

          <NextProjectFooter
            nextSlug={nextProject.slug}
            nextTitle={nextProject.title}
          />
        </div>
      </CaseStudyContent>
    </main>
  );
}
