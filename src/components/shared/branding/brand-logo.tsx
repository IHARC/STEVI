'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ResolvedBrandingAssets } from '@/lib/marketing/branding';

type BrandLogoProps = {
  branding: ResolvedBrandingAssets;
  variant?: 'light' | 'dark';
  className?: string;
  sizes?: string;
  priority?: boolean;
  alt?: string;
};

const DEFAULT_SIZES = '(min-width: 1024px) 200px, (min-width: 640px) 180px, 150px';

export function BrandLogo({
  branding,
  variant = 'light',
  className,
  sizes = DEFAULT_SIZES,
  priority = false,
  alt = 'IHARC',
}: BrandLogoProps) {
  const src = variant === 'dark' ? branding.logoDarkUrl : branding.logoLightUrl;

  return (
    <Image
      src={src}
      alt={alt}
      width={240}
      height={50}
      quality={100}
      sizes={sizes}
      priority={priority}
      className={cn(
        'h-8 w-auto sm:h-9 lg:h-10',
        variant === 'dark' ? 'hidden dark:block' : 'dark:hidden',
        className,
      )}
    />
  );
}
