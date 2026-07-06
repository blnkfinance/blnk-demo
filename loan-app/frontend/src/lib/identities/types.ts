export type CustomerIdentity = {
  identity_id: string;
  first_name: string | null;
  last_name: string | null;
  email_address: string | null;
  display_name: string;
};

export type SearchIdentitiesResponse = {
  identities: CustomerIdentity[];
};

export type LoanEligibilityResponse = {
  eligible: boolean;
  message?: string;
};
