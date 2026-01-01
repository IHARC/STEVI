import { z } from 'zod';

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; fieldErrors?: Record<string, string> };
export type ActionState<T> = ActionResult<T> | { status: 'idle' };

export const actionOk = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const actionError = (error: string, fieldErrors?: Record<string, string>): ActionResult<never> => ({
  ok: false,
  error,
  fieldErrors,
});

export function formDataToObject(formData: FormData) {
  const output: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const [key, value] of formData.entries()) {
    const existing = output[key];
    if (existing === undefined) {
      output[key] = value;
      continue;
    }
    output[key] = Array.isArray(existing) ? [...existing, value] : [existing, value];
  }
  return output;
}

export function parseFormData<T>(
  formData: FormData,
  schema: z.ZodType<T>,
  options: { errorMessage?: string } = {},
): ActionResult<T> {
  const result = schema.safeParse(formDataToObject(formData));
  if (result.success) {
    return actionOk(result.data);
  }
  return actionError(options.errorMessage ?? 'Check the highlighted fields.', flattenZodErrors(result.error));
}

export function flattenZodErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.');
    if (!path) continue;
    if (!fieldErrors[path]) {
      fieldErrors[path] = issue.message;
    }
  }
  return fieldErrors;
}

const truthy = new Set(['true', '1', 'on', 'yes']);
const falsy = new Set(['false', '0', 'off', 'no', '']);

export const zodBoolean = () =>
  z.preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (truthy.has(normalized)) return true;
      if (falsy.has(normalized)) return false;
    }
    return value;
  }, z.boolean());

export const zodOptionalString = () =>
  z.preprocess((value) => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }, z.string().optional());

type RequiredStringOptions = {
  min?: number;
  minMessage?: string;
};

export const zodRequiredString = (message = 'This field is required.', options: RequiredStringOptions = {}) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return '';
      return value.trim();
    },
    z.string().min(options.min ?? 1, options.minMessage ?? message),
  );

export const zodOptionalNumber = () =>
  z.preprocess((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      return Number(trimmed);
    }
    return undefined;
  }, z.number().finite().optional());

type RequiredNumberOptions = {
  int?: boolean;
  positive?: boolean;
  nonnegative?: boolean;
  min?: number;
  max?: number;
};

export const zodRequiredNumber = (message = 'Enter a valid number.', options: RequiredNumberOptions = {}) => {
  let schema = z.number(message);
  if (options.int) schema = schema.int(message);
  if (options.positive) schema = schema.positive(message);
  if (options.nonnegative) schema = schema.nonnegative(message);
  if (typeof options.min === 'number') schema = schema.min(options.min, message);
  if (typeof options.max === 'number') schema = schema.max(options.max, message);

  return z.preprocess((value) => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') return Number(value.trim());
    return Number.NaN;
  }, schema);
};
