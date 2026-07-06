"use client";

import CopyInput from "@/components/blnk-ui/copy-input";
import FormattedDate from "@/components/blnk-ui/formatted-date";
import { InfoField, InfoSection } from "@/components/blnk-ui/info-section";
import {
  AMORTIZATION_LABELS,
  DAY_COUNT_LABELS,
  formatRate,
  GRACE_PERIOD_LABELS,
  PAYMENT_FREQUENCY_LABELS,
} from "@/lib/products/labels";
import type { LoanProduct } from "@/lib/products/types";

type ProductDetailViewProps = {
  product: LoanProduct;
};

export function ProductDetailView({ product }: ProductDetailViewProps) {
  const graceValue =
    product.grace_period_type === "none"
      ? GRACE_PERIOD_LABELS.none
      : `${GRACE_PERIOD_LABELS[product.grace_period_type]}${product.grace_period_days != null ? ` · ${product.grace_period_days} days` : ""}`;

  const interestTypeLabel =
    product.interest_type.charAt(0).toUpperCase() + product.interest_type.slice(1);

  return (
    <section className="space-y-10">
      <InfoSection title="Terms">
        <InfoField label="Interest type">{interestTypeLabel}</InfoField>
        <InfoField label="Annual rate">
          {formatRate(product.annual_rate_bps, product.interest_type)}
        </InfoField>
        <InfoField label="Day count">
          {DAY_COUNT_LABELS[product.day_count_convention]}
        </InfoField>
        <InfoField label="Frequency">
          {PAYMENT_FREQUENCY_LABELS[product.payment_frequency]}
        </InfoField>
        <InfoField label="Amortization type">
          {AMORTIZATION_LABELS[product.amortization_type]}
        </InfoField>
        <InfoField label="Grace period">{graceValue}</InfoField>
      </InfoSection>

      <InfoSection title="Record">
        <div className="col-span-2">
          <InfoField label="Product ID">
            <CopyInput
              value={product.loan_product_id}
              fieldName="loan_product_id"
              className="text-platform-button-text-color"
            />
          </InfoField>
        </div>
        <InfoField label="Created at">
          <FormattedDate value={product.created_at} />
        </InfoField>
        <InfoField label="Updated at">
          <FormattedDate value={product.updated_at} />
        </InfoField>
      </InfoSection>
    </section>
  );
}
