'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

type ConstraintRow = {
  tag: string;
  id?: string;
  className?: string;
  width: number;
  left: number;
  right: number;
  maxWidth: string;
  marginLeft: string;
  marginRight: string;
  display: string;
  position: string;
};

function formatNodeLabel(node: Element) {
  const tag = node.tagName.toLowerCase();
  const id = node.getAttribute('id') || '';
  const className = node.getAttribute('class') || '';
  const suffix = [id ? `#${id}` : null, className ? `.${className.split(/\s+/).slice(0, 4).join('.')}` : null]
    .filter(Boolean)
    .join('');
  return `${tag}${suffix}`;
}

function collectConstraints(target: Element | null): ConstraintRow[] {
  if (!target) return [];

  const rows: ConstraintRow[] = [];
  let node: Element | null = target;
  let depth = 0;

  while (node && depth < 24) {
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);

    rows.push({
      tag: formatNodeLabel(node),
      id: node.getAttribute('id') || undefined,
      className: node.getAttribute('class') || undefined,
      width: Math.round(rect.width),
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      maxWidth: style.maxWidth,
      marginLeft: style.marginLeft,
      marginRight: style.marginRight,
      display: style.display,
      position: style.position,
    });

    node = node.parentElement;
    depth += 1;
  }

  return rows;
}

type SubtreeRow = ConstraintRow & {
  depth: number;
  ratioToMain: number;
};

function collectSubtreeConstraints(main: Element | null): SubtreeRow[] {
  if (!main) return [];
  const mainRect = main.getBoundingClientRect();
  const mainWidth = Math.max(1, Math.round(mainRect.width));

  const rows: SubtreeRow[] = [];
  const maxNodes = 250;
  const stack: Array<{ node: Element; depth: number }> = [{ node: main, depth: 0 }];

  while (stack.length && rows.length < maxNodes) {
    const { node, depth } = stack.pop()!;
    const rect = node.getBoundingClientRect();
    const style = window.getComputedStyle(node);
    const width = Math.round(rect.width);

    rows.push({
      tag: formatNodeLabel(node),
      id: node.getAttribute('id') || undefined,
      className: node.getAttribute('class') || undefined,
      width,
      left: Math.round(rect.left),
      right: Math.round(rect.right),
      maxWidth: style.maxWidth,
      marginLeft: style.marginLeft,
      marginRight: style.marginRight,
      display: style.display,
      position: style.position,
      depth,
      ratioToMain: Math.round((width / mainWidth) * 100) / 100,
    });

    const children = Array.from(node.children) as Element[];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      stack.push({ node: children[i], depth: depth + 1 });
    }
  }

  return rows;
}

function isAutoMargin(row: Pick<ConstraintRow, 'marginLeft' | 'marginRight'>) {
  return row.marginLeft === 'auto' || row.marginRight === 'auto';
}

function isNonNoneMaxWidth(row: Pick<ConstraintRow, 'maxWidth'>) {
  return row.maxWidth !== 'none';
}

function isShrinkWrapDisplay(row: Pick<ConstraintRow, 'display'>) {
  return row.display.startsWith('inline') || row.display === 'table';
}

export function LayoutDebugOverlay() {
  const params = useSearchParams();
  const pathname = usePathname() ?? '/';
  const enabled = params.get('layoutDebug') === '1';
  const [rows, setRows] = useState<ConstraintRow[]>([]);
  const [subtreeRows, setSubtreeRows] = useState<SubtreeRow[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const update = () => {
      const main = document.querySelector('#main-content');
      const next = collectConstraints(main);
      setRows(next);
      setSubtreeRows(collectSubtreeConstraints(main));
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [enabled, pathname]);

  const suspects = useMemo(() => {
    const chainSuspects = rows
      .map((row, index) => {
        const parent = index + 1 < rows.length ? rows[index + 1] : null;
        const parentWidth = parent?.width ?? row.width;
        const shrunk = parent ? parentWidth - row.width > 64 : false;
        const reason = [
          isNonNoneMaxWidth(row) ? `max:${row.maxWidth}` : null,
          isAutoMargin(row) ? 'm:auto' : null,
          isShrinkWrapDisplay(row) ? `display:${row.display}` : null,
          shrunk ? `shrunk:${parentWidth}->${row.width}` : null,
        ]
          .filter(Boolean)
          .join(' ');
        return { row, reason };
      })
      .filter((item) => item.reason.length > 0)
      .slice(0, 8);

    const main = subtreeRows[0];
    const mainWidth = main?.width ?? 0;
    const subtreeSuspects = subtreeRows
      .filter((row) => row.depth > 0)
      .filter((row) => {
        if (isNonNoneMaxWidth(row)) return true;
        if (isAutoMargin(row)) return true;
        if (isShrinkWrapDisplay(row)) return true;
        if (mainWidth > 0 && row.width > 0 && mainWidth - row.width > 96 && row.ratioToMain < 0.9) return true;
        return false;
      })
      .sort((a, b) => {
        const aScore =
          (isNonNoneMaxWidth(a) ? 3 : 0) + (isAutoMargin(a) ? 2 : 0) + (isShrinkWrapDisplay(a) ? 1 : 0);
        const bScore =
          (isNonNoneMaxWidth(b) ? 3 : 0) + (isAutoMargin(b) ? 2 : 0) + (isShrinkWrapDisplay(b) ? 1 : 0);
        if (aScore !== bScore) return bScore - aScore;
        return a.ratioToMain - b.ratioToMain;
      })
      .slice(0, 8);

    return { chainSuspects, subtreeSuspects };
  }, [rows, subtreeRows]);

  if (!enabled) return null;

  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth;
  const mainWidth = rows[0]?.width ?? 0;
  const mainLeft = rows[0]?.left ?? 0;

  return (
    <div className="fixed bottom-4 left-4 z-[9999] w-[min(520px,calc(100vw-2rem))] rounded-xl border border-border/60 bg-background/95 p-3 text-xs shadow-lg backdrop-blur">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">Layout debug</p>
          <p className="truncate text-muted-foreground">{pathname}</p>
        </div>
        <a
          href={pathname}
          className="rounded-md border border-border/60 bg-muted px-2 py-1 font-medium text-foreground hover:bg-muted/70"
          aria-label="Close layout debug overlay"
        >
          Close
        </a>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-muted-foreground">
          Target: <span className="font-medium text-foreground">#main-content</span>
        </p>
        <p className="text-muted-foreground">
          Viewport: <span className="font-medium text-foreground">{viewportWidth}px</span> · Main:{' '}
          <span className="font-medium text-foreground">{mainWidth}px</span> · Left:{' '}
          <span className="font-medium text-foreground">{mainLeft}px</span>
        </p>

        {suspects.chainSuspects.length || suspects.subtreeSuspects.length ? (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-2 text-warning">
            <p className="font-semibold">Potential constraints</p>
            {suspects.chainSuspects.length ? (
              <div className="mt-2">
                <p className="font-medium">Ancestor chain</p>
                <ul className="mt-1 space-y-1">
                  {suspects.chainSuspects.map(({ row, reason }) => (
                    <li key={`${row.tag}-${reason}`}>
                      <span className="font-medium">{row.tag}</span> — w:{row.width}px left:{row.left}px ({reason})
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {suspects.subtreeSuspects.length ? (
              <div className="mt-3">
                <p className="font-medium">Inside #main-content</p>
                <ul className="mt-1 space-y-1">
                  {suspects.subtreeSuspects.map((row) => (
                    <li key={`${row.tag}-${row.depth}`}>
                      <span className="font-medium">{row.tag}</span> — w:{row.width}px ({Math.round(row.ratioToMain * 100)}% of main) max:
                      {row.maxWidth} ml:{row.marginLeft} mr:{row.marginRight} display:{row.display}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">No obvious max-width or auto-margin constraints detected.</p>
        )}

        <details className="rounded-lg border border-border/60 bg-muted/20 p-2">
          <summary className="cursor-pointer select-none font-medium text-foreground">Ancestor chain</summary>
          <div className="mt-2 max-h-64 space-y-1 overflow-auto pr-1 text-muted-foreground">
            {rows.map((row) => (
              <div key={row.tag} className="flex flex-wrap gap-x-2 gap-y-1">
                <span className="font-medium text-foreground">{row.tag}</span>
                <span>w:{row.width}px</span>
                <span>left:{row.left}px</span>
                <span>max:{row.maxWidth}</span>
                <span>ml:{row.marginLeft}</span>
                <span>mr:{row.marginRight}</span>
                <span>{row.display}</span>
                <span>{row.position}</span>
              </div>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
