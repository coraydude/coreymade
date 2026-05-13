import { PROJECTS } from "@/lib/projects";
import { notFound } from "next/navigation";
import BackToWork from "@/components/BackToWork";
import CaseStudyContent from "@/components/CaseStudyContent";
import CaseStudyImagesGL from "@/components/CaseStudyImagesGL";
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
  // explicit case-study images are set in lib/projects.ts.
  const blocks =
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
            <div className="px-6 md:px-10 max-w-[1600px] mx-auto pb-20 md:pb-28">
              <p className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light">
                {project.description}
              </p>
            </div>

            <CaseStudyImagesGL srcs={blocks} alt={project.title} />
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
