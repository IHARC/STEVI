import { ConcernReportForm, CONCERN_REPORT_INITIAL_STATE, type ConcernReportState } from '@/app/register/_components/concern-report-form';
import { formatPortalCode, generatePortalCode, emptyToNull } from '@/lib/registration';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { normalizePhoneNumber } from '@/lib/phone';
import type { Json } from '@/types/supabase';

export const dynamic = 'force-dynamic';

export default function ConcernReportPage() {
  async function submitConcern(prevState: ConcernReportState, formData: FormData): Promise<ConcernReportState> {
    'use server';

    const category = emptyToNull(formData.get('category')) ?? 'other';
    const description = emptyToNull(formData.get('description')) ?? '';
    const location = emptyToNull(formData.get('location')) ?? '';
    const additionalDetails = emptyToNull(formData.get('additional_details'));
    const contactPreferenceRaw = emptyToNull(formData.get('contact_preference')) ?? 'anonymous';
    const contactPreference =
      contactPreferenceRaw === 'email' || contactPreferenceRaw === 'phone' ? contactPreferenceRaw : 'anonymous';
    const contactEmail = contactPreference === 'email' ? emptyToNull((formData.get('contact_email') as string | null)?.toLowerCase() ?? null) : null;
    const contactPhone =
      contactPreference === 'phone' ? normalizePhoneNumber(formData.get('contact_phone')) ?? null : null;

    if (!description || description.length < 10) {
      return { status: 'idle', error: 'Share a few details about what happened so we can respond appropriately.' };
    }

    if (!location) {
      return { status: 'idle', error: 'Let us know where this happened so we can direct the right outreach team.' };
    }

    if (contactPreference === 'email' && !contactEmail) {
      return { status: 'idle', error: 'Enter the email where we can send updates, or switch to the anonymous option.' };
    }

    if (contactPreference === 'phone' && !contactPhone) {
      return {
        status: 'idle',
        error: 'Enter a valid phone number for follow-up, or choose the anonymous option.',
      };
    }

    const supabase = await createSupabaseServerClient();
    const portal = supabase.schema('portal');

    const metadata: Json = {
      category,
      description,
      location,
      additional_details: additionalDetails,
      contact_preference: contactPreference,
    };

    let trackingCode: string | null = null;
    const attempts = 6;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const codeCandidate = generatePortalCode();
      const submission = {
        flow_type: 'concern_report' as const,
        status: 'submitted',
        portal_code: codeCandidate,
        chosen_name: contactPreference === 'anonymous' ? 'Anonymous reporter' : 'Concern reporter',
        contact_email: contactEmail,
        contact_phone: contactPhone,
        consent_data_sharing: true,
        consent_contact: contactPreference !== 'anonymous',
        consent_terms: true,
        metadata,
      };

      const { error } = await portal.from('registration_flows').insert(submission);

      if (!error) {
        trackingCode = codeCandidate;
        break;
      }

      if (error.code === '23505') {
        continue;
      }

      console.error('Unable to store concern report', error);
      return {
        status: 'idle',
        error: 'We could not submit your concern right now. Please try again or contact IHARC staff directly.',
      };
    }

    if (!trackingCode) {
      return {
        status: 'idle',
        error: 'We could not generate a tracking code. Try again or contact IHARC staff.',
      };
    }

    return {
      status: 'success',
      trackingCode: formatPortalCode(trackingCode),
      message: 'We logged your concern. A member of the IHARC team will review and follow up if you requested it.',
    };
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <ConcernReportForm action={submitConcern} initialState={CONCERN_REPORT_INITIAL_STATE} />
    </div>
  );
}
