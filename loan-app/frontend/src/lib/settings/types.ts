export type LoanLedgerKey =
  | "loans_receivable"
  | "accrued_interest"
  | "deferred_fee";

export type LoanLedger = {
  ledger_key: LoanLedgerKey;
  name: string;
  blnk_ledger_id: string;
};

export type LoanLedgersResponse = {
  ledgers: LoanLedger[];
};

export type LoanBookType = "a_book" | "b_book" | "justo";

export type LoanEligibilitySettings = {
  allowed_books: LoanBookType[];
};

export type BrandingSettings = {
  primary_color: string;
};

export const LOAN_BOOK_OPTIONS: {
  value: LoanBookType;
  label: string;
}[] = [
  { value: "a_book", label: "A-Book Accounts" },
  { value: "b_book", label: "B-Book Accounts" },
  { value: "justo", label: "Justo Wallets" },
];

export type SettingsSectionId =
  | "ledger-configuration"
  | "loan-eligibility"
  | "branding";

export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
}[] = [
  { id: "ledger-configuration", label: "Ledger configuration" },
  { id: "loan-eligibility", label: "Loan eligibility" },
  { id: "branding", label: "Branding" },
];
