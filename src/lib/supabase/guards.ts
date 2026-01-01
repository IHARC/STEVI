type SupabaseError = { message: string };
type SupabaseResult = { error: SupabaseError | null };

export function assertRpcOk(result: SupabaseResult, context?: string): void {
  if (!result.error) return;
  if (context) {
    const error = new Error(`${context}: ${result.error.message}`);
    (error as { cause?: unknown }).cause = result.error;
    throw error;
  }
  throw result.error;
}
