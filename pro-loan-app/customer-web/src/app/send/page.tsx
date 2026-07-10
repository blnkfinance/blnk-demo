import { api } from "@/lib/api";
import { SendForm } from "./SendForm";

type WalletBalanceEntry = {
  currency: string;
  balance_cents: number;
};

type CustomerWithBalance = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  wallet_balances?: WalletBalanceEntry[];
  wallet_balance: number | null;
};

async function getCustomer() {
  try {
    return await api.get<CustomerWithBalance>("/customers/me");
  } catch {
    return null;
  }
}

export default async function SendPage() {
  const customer = await getCustomer();
  const ngnWallet = customer?.wallet_balances?.find((w) => w.currency === "NGN");
  const balance = ngnWallet?.balance_cents ?? customer?.wallet_balance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Send Money</h1>
        <p className="mt-1 text-sm text-muted">
          Transfer to another ProBank user or send externally to @world. Fees are
          shown as a single charge before you confirm.
        </p>
      </div>

      <SendForm balance={balance} currency="NGN" />
    </div>
  );
}
