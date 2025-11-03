import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-outline/40 bg-surface px-4 py-6 text-center text-xs text-on-surface/70">
      <p>
        © {new Date().getFullYear()} IHARC — Integrated Homelessness and Addictions Response Centre.
      </p>
      <p className="mt-1 text-on-surface/60">
        Inclusive, accessible, community-first data platform.
      </p>
      <nav
        aria-label="Footer navigation"
        className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold"
      >
        <Link
          href="/support"
          className="rounded-full px-3 py-1 text-primary underline-offset-4 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Contact support
        </Link>
      </nav>
    </footer>
  );
}
