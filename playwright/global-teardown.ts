import { cleanupResourcePages, resolveCrudEnv } from './utils/e2e-supabase';

export default async function globalTeardown() {
  const envResult = resolveCrudEnv();
  if (!envResult.ready) {
    return;
  }

  try {
    await cleanupResourcePages(envResult.env);
  } catch (error) {
    console.error(String(error));
    throw error;
  }
}
