import { apiRequest, appendToken } from "../api-client";
import type {
  LoanEligibilityResponse,
  SearchIdentitiesResponse,
} from "./types";

export async function searchIdentities(
  token: string,
  query: string,
  limit = 10
) {
  const params = new URLSearchParams();
  params.set("q", query);
  params.set("limit", String(limit));
  params.set("token", token);

  return apiRequest<SearchIdentitiesResponse>({
    path: `/identities/search?${params.toString()}`,
    fallbackError: "Failed to search customers",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      Array.isArray((body as SearchIdentitiesResponse).identities),
  });
}

export async function checkIdentityLoanEligibility(
  token: string,
  identityId: string
) {
  return apiRequest<LoanEligibilityResponse>({
    path: appendToken(
      `/identities/${encodeURIComponent(identityId)}/loan-eligibility`,
      token
    ),
    fallbackError: "Failed to check customer eligibility",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      typeof (body as LoanEligibilityResponse).eligible === "boolean",
  });
}
