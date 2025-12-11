export type PolicyContent = {
  slug: string;
  title: string;
  shortSummary: string;
  bodyHtml: string;
};

export type OnboardingPrefill = {
  chosenName: string;
  legalName: string | null;
  pronouns: string | null;
  email: string | null;
  phone: string | null;
  preferredContactMethod: string | null;
  contactWindow: string | null;
  postalCode: string | null;
  dobMonth: number | null;
  dobYear: number | null;
  safeCall: boolean;
  safeText: boolean;
  safeVoicemail: boolean;
  dataSharingConsent: boolean | null;
};
