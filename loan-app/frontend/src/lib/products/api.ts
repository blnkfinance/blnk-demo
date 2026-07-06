import {
  apiMutation,
  apiRequest,
  appendToken,
} from "../api-client";
import type {
  CreateLoanProductInput,
  LoanProduct,
  ProductListFilters,
  ProductListResponse,
  UpdateLoanProductInput,
} from "./types";

function buildListQuery(filters: ProductListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.interest_type) params.set("interest_type", filters.interest_type);
  if (filters.limit != null) params.set("limit", String(filters.limit));
  if (filters.offset != null) params.set("offset", String(filters.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function listProducts(
  token: string,
  filters: ProductListFilters = {}
) {
  const query = buildListQuery(filters);
  const url = `/products${query}${query ? "&" : "?"}token=${encodeURIComponent(token)}`;

  return apiRequest<ProductListResponse>({
    path: url,
    fallbackError: "Failed to load products",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      Array.isArray((body as ProductListResponse).products),
  });
}

export async function getProduct(token: string, loanProductId: string) {
  const result = await apiRequest<{ product: LoanProduct }>({
    path: appendToken(`/products/${encodeURIComponent(loanProductId)}`, token),
    fallbackError: "Failed to load product",
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { product?: LoanProduct }).product != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, product: result.data.product };
}

export async function createProduct(
  token: string,
  input: CreateLoanProductInput
) {
  const result = await apiMutation<{ product: LoanProduct }>({
    path: appendToken("/products", token),
    fallbackError: "Failed to create product",
    init: {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { product?: LoanProduct }).product != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, product: result.data.product };
}

export async function updateProduct(
  token: string,
  loanProductId: string,
  input: UpdateLoanProductInput
) {
  const result = await apiMutation<{ product: LoanProduct }>({
    path: appendToken(`/products/${encodeURIComponent(loanProductId)}`, token),
    fallbackError: "Failed to update product",
    init: {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { product?: LoanProduct }).product != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, product: result.data.product };
}

export async function archiveProduct(token: string, loanProductId: string) {
  const result = await apiMutation<{ product: LoanProduct }>({
    path: appendToken(
      `/products/${encodeURIComponent(loanProductId)}/archive`,
      token
    ),
    fallbackError: "Failed to archive product",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { product?: LoanProduct }).product != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, product: result.data.product };
}

export async function unarchiveProduct(token: string, loanProductId: string) {
  const result = await apiMutation<{ product: LoanProduct }>({
    path: appendToken(
      `/products/${encodeURIComponent(loanProductId)}/unarchive`,
      token
    ),
    fallbackError: "Failed to unarchive product",
    init: { method: "POST" },
    validate: (body) =>
      body != null &&
      typeof body === "object" &&
      (body as { product?: LoanProduct }).product != null,
  });

  if (!result.ok) return result;
  return { ok: true as const, product: result.data.product };
}
