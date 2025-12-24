import { z } from 'zod';
import type { OnboardingPrefill } from './types';

const emptyOkEmail = z
  .string()
  .trim()
  .email('Provide a valid email or leave blank')
  .or(z.literal(''))
  .optional();

export const basicInfoSchema = z.object({
  person_id: z.string().optional(),
  chosen_name: z.string().trim().min(1, 'Preferred name is required'),
  legal_name: z.string().trim().optional(),
  pronouns: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  contact_email: emptyOkEmail,
  contact_phone: z.string().trim().optional(),
  preferred_contact_method: z.string().trim().min(1),
  contact_window: z.string().trim().optional(),
  dob_month: z.string().trim().optional(),
  dob_year: z.string().trim().optional(),
  safe_call: z.boolean(),
  safe_text: z.boolean(),
  safe_voicemail: z.boolean(),
});

export const consentSchema = z.object({
  person_id: z.string().trim().min(1, 'Person is required'),
  consent_service_agreement: z.boolean(),
  consent_privacy: z.boolean(),
});

export const sharingSchema = z.object({
  person_id: z.string().trim().min(1, 'Person is required'),
  consent_scope: z.enum(['all_orgs', 'selected_orgs', 'none']),
  org_allowed_ids: z.array(z.string()).optional(),
  consent_confirm: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.consent_scope === 'selected_orgs' && (!data.org_allowed_ids || data.org_allowed_ids.length === 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Select at least one organization.',
      path: ['org_allowed_ids'],
    });
  }
});

export const linkSchema = z.object({
  person_id: z.string().trim().min(1, 'Person is required'),
});

export type BasicInfoFormValues = z.infer<typeof basicInfoSchema>;
export type ConsentFormValues = z.infer<typeof consentSchema>;
export type SharingFormValues = z.infer<typeof sharingSchema>;
export type LinkFormValues = z.infer<typeof linkSchema>;

export function buildBasicInfoDefaults(prefill: OnboardingPrefill, personId: number | null): BasicInfoFormValues {
  return {
    person_id: personId ? String(personId) : '',
    chosen_name: prefill.chosenName ?? '',
    legal_name: prefill.legalName ?? '',
    pronouns: prefill.pronouns ?? '',
    postal_code: prefill.postalCode ?? '',
    contact_email: prefill.email ?? '',
    contact_phone: prefill.phone ?? '',
    preferred_contact_method: prefill.preferredContactMethod ?? 'email',
    contact_window: prefill.contactWindow ?? '',
    dob_month: prefill.dobMonth ? String(prefill.dobMonth) : '',
    dob_year: prefill.dobYear ? String(prefill.dobYear) : '',
    safe_call: prefill.safeCall,
    safe_text: prefill.safeText,
    safe_voicemail: prefill.safeVoicemail,
  };
}
