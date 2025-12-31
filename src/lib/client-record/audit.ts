export function withClientRecordAuditMeta(meta: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ...meta,
    environment: process.env.NODE_ENV ?? 'unknown',
    is_test: process.env.NODE_ENV !== 'production',
  };
}
