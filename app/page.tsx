// Home content is rendered by the persistent <MeshCarousel /> mounted in
// app/layout.tsx, so this route can stay empty. Keeping it as a real
// page means Next.js still emits the / route during static export.
export default function Home() {
  return null;
}
