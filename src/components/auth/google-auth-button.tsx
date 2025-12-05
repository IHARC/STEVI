'use client';

import { useState } from 'react';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

type GoogleAuthButtonProps = {
  nextPath: string;
  intent: 'login' | 'register';
};

function getLabel(intent: GoogleAuthButtonProps['intent']) {
  return intent === 'login' ? 'Continue with Google' : 'Sign up with Google';
}

export function GoogleAuthButton({ nextPath, intent }: GoogleAuthButtonProps) {
  const supabase = createSupabaseClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setIsLoading(true);
    setError(null);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
      if (!origin) {
        throw new Error('Unable to determine sign-in redirect.');
      }

      const callbackUrl = new URL('/auth/callback', origin);
      if (nextPath) {
        callbackUrl.searchParams.set('next', nextPath);
      }
      callbackUrl.searchParams.set('flow', intent);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: callbackUrl.toString(),
          queryParams: { prompt: 'select_account' },
        },
      });

      if (oauthError) {
        throw oauthError;
      }

      if (data?.url) {
        window.location.assign(data.url);
      }
      // Supabase will redirect on success; no further action required.
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'We could not connect to Google right now.');
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        onClick={handleClick}
        disabled={isLoading}
        className="w-full justify-center"
        aria-busy={isLoading}
      >
        <GoogleGlyph />
        {isLoading ? 'Connecting...' : getLabel(intent)}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" className="h-4 w-4">
      <path
        d="M17.64 9.2045c0-.6395-.0573-1.2523-.1636-1.8364H9v3.4727h4.8436c-.2091 1.125-.8436 2.0796-1.7973 2.7195v2.2582h2.9086c1.7023-1.5677 2.6855-3.8805 2.6855-6.614z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8069 5.9564-2.1819l-2.9086-2.2582c-.8068.54-1.8381.859-3.0478.859-2.3447 0-4.3285-1.5846-5.0368-3.7105H.956513v2.3314C2.43865 15.9824 5.48122 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9632 10.7084c-.18-.54-.2827-1.1182-.2827-1.7084 0-.5901.1027-1.1682.2827-1.7083V4.9603H.956513C.34731 6.1746 0 7.5445 0 9s.34731 2.8254.956513 4.0397L3.9632 10.7084z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58364c1.3214 0 2.5077.45455 3.4405 1.34546l2.5814-2.58136C13.4636.896046 11.4264 0 9 0 5.48122 0 2.43865 2.01761.956513 4.96031L3.9632 7.29159C4.67149 5.16559 6.65536 3.58364 9 3.58364z"
        fill="#EA4335"
      />
    </svg>
  );
}
