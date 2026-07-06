import CountryFlag from "@/components/blnk-ui/currency-flag";
import { CURRENCY_CODE } from "@/lib/currency";

type CurrencyCellProps = {
  currency?: string;
};

export default function CurrencyCell({
  currency = CURRENCY_CODE,
}: CurrencyCellProps) {
  return (
    <div className="flex items-center space-x-1.5">
      <CountryFlag code={currency} type="currency" />
      <span className="truncate">{currency}</span>
    </div>
  );
}
