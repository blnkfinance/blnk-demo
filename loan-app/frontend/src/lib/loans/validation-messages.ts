export const LOAN_VALIDATION = {
  loan_product_id: "Choose a loan product.",
  blnk_identity_id_required: "Choose a customer.",
  blnk_identity_id_ineligible:
    "This customer is not qualified to apply for a loan.",
  blnk_identity_id_eligible: "This customer is eligible for a loan.",
  blnk_identity_id_verify:
    "Select a customer from search results to verify eligibility.",
  principal: "Enter a loan amount greater than zero.",
  origination_fee: "Enter a non-negative origination fee.",
  origination_fee_too_high: "Origination fee must be less than the loan amount.",
  term_periods: "Enter a term length of at least one period.",
  first_payment_date: "Enter a valid first payment date.",
} as const;
