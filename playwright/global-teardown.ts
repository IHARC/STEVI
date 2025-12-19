import {
  cleanupOrganizations,
  cleanupPolicies,
  cleanupResourcePages,
  resetClientOnboarding,
  resolveCrudEnv,
  resolveOnboardingResetEnv,
} from './utils/e2e-supabase';

export default async function globalTeardown() {
  const envResult = resolveCrudEnv();
  const onboardingEnvResult = resolveOnboardingResetEnv();

  if (!envResult.ready && !onboardingEnvResult.ready) {
    return;
  }

  const errors: string[] = [];
  if (envResult.ready) {
    const cleanupTasks = [cleanupResourcePages, cleanupPolicies, cleanupOrganizations];
    for (const cleanup of cleanupTasks) {
      try {
        await cleanup(envResult.env);
      } catch (error) {
        errors.push(String(error));
      }
    }
  } else {
    errors.push(envResult.reason);
  }

  if (onboardingEnvResult.ready) {
    try {
      await resetClientOnboarding(onboardingEnvResult.env);
    } catch (error) {
      errors.push(String(error));
    }
  } else {
    errors.push(onboardingEnvResult.reason);
  }

  if (errors.length > 0) {
    const message = errors.join('\n');
    console.error(message);
    throw new Error(message);
  }
}
