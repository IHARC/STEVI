export type ContactChoice = 'email' | 'phone' | 'both' | 'none';

export type ClientIntakeFormValues = {
  next: string;
  contact_choice: ContactChoice;
  contact_email: string;
  contact_phone: string;
  password: string;
  password_confirm: string;
  chosen_name: string;
  legal_name: string;
  pronouns: string;
  safe_call: boolean;
  safe_text: boolean;
  safe_voicemail: boolean;
  contact_window: string;
  dob_month: string;
  dob_year: string;
  postal_code: string;
  indigenous_identity: string;
  disability: string;
  gender_identity: string;
  consent_privacy: boolean;
  consent_contact: boolean;
  consent_terms: boolean;
  additional_context: string;
};
