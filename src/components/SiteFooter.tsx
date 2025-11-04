import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="border-t border-outline/40 bg-surface px-space-md py-space-lg text-center text-label-sm text-on-surface/70">
      <p>
        © {new Date().getFullYear()} IHARC — Integrated Homelessness and Addictions Response Centre.
      </p>
      <p className="mt-space-2xs text-on-surface/60">
        Inclusive, accessible, community-first data platform.
      </p>
      <nav
        aria-label="Footer navigation"
        className="mt-space-sm flex items-center justify-center gap-space-sm text-label-sm font-medium"
      >
        <Link
          href="/support"
          className="rounded-full px-space-md py-space-2xs text-primary underline-offset-4 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          Contact support
        </Link>
      </nav>
    </footer>
  );
}
