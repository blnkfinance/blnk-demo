function buildCloudTransactionsFilterUrl(
  origin: string,
  filterEntries: Record<string, string>
): string {
  const base = origin.replace(/\/$/, "");
  const filters = new URLSearchParams(filterEntries);
  return `${base}/cloud/transactions?filters=${encodeURIComponent(filters.toString())}&page=1`;
}

export function buildCloudTransactionsByQueuedParentUrl(
  origin: string,
  transactionId: string
): string {
  return buildCloudTransactionsFilterUrl(origin, {
    "metadata.QUEUED_PARENT_TRANSACTION_eq": transactionId,
  });
}

export function buildCloudTransactionsByRepaymentIdUrl(
  origin: string,
  repaymentId: string
): string {
  return buildCloudTransactionsFilterUrl(origin, {
    "metadata.loan_repayment_id_eq": repaymentId,
  });
}

export function buildCloudTransactionsByBalanceIdUrl(
  origin: string,
  balanceId: string
): string {
  return buildCloudTransactionsFilterUrl(origin, {
    balance_id_eq: balanceId,
  });
}

export function buildCloudTransactionsByDestinationUrl(
  origin: string,
  balanceId: string
): string {
  return buildCloudTransactionsFilterUrl(origin, {
    destination_eq: balanceId,
  });
}

export function buildCloudTransactionsBySourceUrl(
  origin: string,
  balanceId: string
): string {
  return buildCloudTransactionsFilterUrl(origin, {
    source_eq: balanceId,
  });
}

export function buildCloudIdentityDetailsUrl(
  origin: string,
  identityId: string
): string {
  const base = origin.replace(/\/$/, "");
  const params = new URLSearchParams({ id: identityId });
  return `${base}/cloud/identities/details?${params.toString()}`;
}

export function navigateToCloud(url: string): void {
  const target = window.top ?? window.parent;
  if (target) {
    target.location.href = url;
  }
}
