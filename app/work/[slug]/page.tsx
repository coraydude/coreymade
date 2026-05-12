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

  const blocks = [project.image, project.image, project.image, project.image];
  const currentIdx = PROJECTS.findIndex((p) => p.slug === project.slug);
  const nextProject =
    PROJECTS[(currentIdx + 1) % PROJECTS.length];

  return (
    <main className="min-h-screen pb-32">
      <BackToWork />

      <CaseStudyContent>
        <div className="pt-[50svh]">
          <div data-case-body>
            <div className="px-6 md:px-10 max-w-[1600px] mx-auto pb-20 md:pb-28">
              <p className="text-[28px] md:text-[48px] leading-[1.18] tracking-[-0.01em] text-foreground/85 font-light">
                {project.title} is a placeholder case study. Real copy
                describing the project — context, collaborators, scope —
                lives here. The project visuals below stack full-bleed on
                the page.
              </p>
            </div>

            <CaseStudyImages srcs={blocks} alt={project.title} />
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
