import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCloudIdentityDetailsUrl,
  buildCloudTransactionsByBalanceIdUrl,
  buildCloudTransactionsByDestinationUrl,
  buildCloudTransactionsBySourceUrl,
  buildCloudTransactionsByQueuedParentUrl,
  buildCloudTransactionsByRepaymentIdUrl,
} from "./blnk-cloud-links";

describe("buildCloudTransactionsByQueuedParentUrl", () => {
  it("builds a filtered transactions URL on the Cloud origin", () => {
    const url = buildCloudTransactionsByQueuedParentUrl(
      "https://core.omnigroup.tech",
      "txn_abc123"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=metadata.QUEUED_PARENT_TRANSACTION_eq%3Dtxn_abc123&page=1"
    );
  });

  it("strips a trailing slash from the origin", () => {
    const url = buildCloudTransactionsByQueuedParentUrl(
      "https://core.omnigroup.tech/",
      "txn_abc123"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=metadata.QUEUED_PARENT_TRANSACTION_eq%3Dtxn_abc123&page=1"
    );
  });
});

describe("buildCloudTransactionsByRepaymentIdUrl", () => {
  it("builds a filtered transactions URL by loan_repayment_id metadata", () => {
    const url = buildCloudTransactionsByRepaymentIdUrl(
      "https://core.omnigroup.tech",
      "rep_abc123"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=metadata.loan_repayment_id_eq%3Drep_abc123&page=1"
    );
  });
});

describe("buildCloudTransactionsByBalanceIdUrl", () => {
  it("builds a filtered transactions URL by balance_id", () => {
    const url = buildCloudTransactionsByBalanceIdUrl(
      "https://core.omnigroup.tech",
      "bln_receivable"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=balance_id_eq%3Dbln_receivable&page=1"
    );
  });
});

describe("buildCloudTransactionsByDestinationUrl", () => {
  it("builds a filtered transactions URL by destination balance", () => {
    const url = buildCloudTransactionsByDestinationUrl(
      "https://core.omnigroup.tech",
      "bln_receivable"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=destination_eq%3Dbln_receivable&page=1"
    );
  });
});

describe("buildCloudTransactionsBySourceUrl", () => {
  it("builds a filtered transactions URL by source balance", () => {
    const url = buildCloudTransactionsBySourceUrl(
      "https://core.omnigroup.tech",
      "bln_accrued_interest"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/transactions?filters=source_eq%3Dbln_accrued_interest&page=1"
    );
  });
});

describe("buildCloudIdentityDetailsUrl", () => {
  it("builds an identity details URL on the Cloud origin", () => {
    const url = buildCloudIdentityDetailsUrl(
      "https://core.omnigroup.tech",
      "idt_abc123"
    );

    assert.equal(
      url,
      "https://core.omnigroup.tech/cloud/identities/details?id=idt_abc123"
    );
  });
});
