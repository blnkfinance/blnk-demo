"use client";

import type { ReactNode } from "react";
import CopyInput from "@/components/blnk-ui/copy-input";
import FormattedDate from "@/components/blnk-ui/formatted-date";
import { buildCloudIdentityDetailsUrl } from "@/lib/blnk-cloud-links";
import { formatRateBps, PAYMENT_FREQUENCY_LABELS } from "@/lib/loans/labels";
import type { CustomerIdentity, Loan } from "@/lib/loans/types";
import { usePortalSession } from "@/lib/portal-session";

type LoanDetailSidebarProps = {
  loan: Loan;
  customer?: CustomerIdentity | null;
  productName?: string;
  onProductClick: () => void;
};

function SidebarSection({
  title,
  children,
  divider = false,
}: {
  title: string;
  children: ReactNode;
  divider?: boolean;
}) {
  return (
    <section
      className={`space-y-4 ${divider ? "border-b border-platform-stroke pb-10" : ""}`}
    >
      <h2 className="font-pastiche text-lg font-semibold leading-[125%] tracking-[-0.18px] text-platform-primary-text">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function SidebarField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium leading-[14px] text-platform-primary-text">
        {label}
      </h3>
      <div className="text-sm font-normal leading-[150%] text-platform-nav-text">
        {children}
      </div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-platform-muted">—</span>;
}

export function LoanDetailSidebar({
  loan,
  customer,
  productName,
  onProductClick,
}: LoanDetailSidebarProps) {
  const { blnkCloudApiOrigin } = usePortalSession();

  return (
    <aside className="space-y-10">
      <SidebarSection title="Details" divider>
        <SidebarField label="Product">
          <button
            type="button"
            onClick={onProductClick}
            className="text-left text-sm font-normal text-platform-button-text-button underline-offset-2 hover:underline"
          >
            {productName ?? loan.loan_product_id}
          </button>
        </SidebarField>
        <SidebarField label="Contract rate">
          {formatRateBps(loan.annual_rate_bps)}
        </SidebarField>
        <SidebarField label="EIR rate">
          {formatRateBps(loan.effective_annual_rate_bps)}
        </SidebarField>
        <SidebarField label="Term period">{loan.term_periods}</SidebarField>
        <SidebarField label="Frequency">
          {PAYMENT_FREQUENCY_LABELS[loan.payment_frequency]}
        </SidebarField>
        <SidebarField label="First payment date">
          <FormattedDate value={loan.first_payment_date} />
        </SidebarField>
        {loan.disbursement_date ? (
          <SidebarField label="Disbursement date">
            <FormattedDate value={loan.disbursement_date} />
          </SidebarField>
        ) : null}
        <SidebarField label="Maturity date">
          <FormattedDate value={loan.maturity_date} />
        </SidebarField>
      </SidebarSection>

      <SidebarSection title="Customer" divider>
        <SidebarField label="Name">
          {customer?.display_name ? customer.display_name : <EmptyValue />}
        </SidebarField>
        <SidebarField label="Email">
          {customer?.email_address ? customer.email_address : <EmptyValue />}
        </SidebarField>
        <SidebarField label="Identity ID">
          {loan.blnk_identity_id ? (
            <CopyInput
              value={loan.blnk_identity_id}
              fieldName="blnk_identity_id"
              className="text-platform-button-text-color"
              href={buildCloudIdentityDetailsUrl(
                blnkCloudApiOrigin,
                loan.blnk_identity_id
              )}
            />
          ) : (
            <EmptyValue />
          )}
        </SidebarField>
      </SidebarSection>
    </aside>
  );
}
