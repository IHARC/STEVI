export default function HomePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 py-24 text-center"
    >
      <span className="rounded-full border border-outline bg-surface px-4 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        STEVI preview
      </span>
      <h1 className="text-3xl font-semibold text-on-surface md:text-4xl">
        Client portal scaffolding is ready
      </h1>
      <p className="max-w-2xl text-base text-muted-foreground md:text-lg">
        We’ll migrate the IHARC portal experience into this standalone app. The marketing site will stay focused on
        awareness while STEVI supports appointment requests, plan tracking, petitions, and resource sharing for
        neighbours and outreach teams.
      </p>
    </main>
  );
}
