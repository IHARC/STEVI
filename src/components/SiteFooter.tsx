import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-border/40 bg-background px-4 py-6 text-center text-xs text-foreground/70">
      <p>
        © {new Date().getFullYear()} IHARC — Integrated Homelessness and Addictions Response Centre.
      </p>
      <p className="mt-1 text-foreground/60">
        Inclusive, accessible, community-first data platform.
      </p>
      <nav
        aria-label="Footer navigation"
        className="mt-3 flex items-center justify-center gap-3 text-xs font-medium"
      >
        <Link
          href="/support"
          className="rounded-full px-4 py-1 text-primary underline-offset-4 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Contact support
        </Link>
      </nav>
    </footer>
  );
}
