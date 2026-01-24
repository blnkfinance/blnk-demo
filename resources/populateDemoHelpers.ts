import { faker } from "@faker-js/faker";

/**
 * Generate a random amount within an inclusive range.
 *
 * The populate demo uses integer amounts (paired with `precision: 100`) so the
 * dataset is easy to reason about while still producing realistic totals.
 */
export function generateRandomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random date within a time window.
 *
 * We spread effective dates across months so statements and charts look natural
 * (instead of everything landing on “today”).
 */
export function generateDate(
  options: {
    startDate?: Date | string | number;
    endDate?: Date | string | number;
    format?: "iso" | "timestamp" | "date";
  } = {}
): string | number | Date {
  const {
    startDate = new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000),
    endDate = new Date(),
    format = "iso",
  } = options;

  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error("Invalid date provided to generateDate");
  }
  if (start > end) {
    throw new Error("startDate must be before or equal to endDate");
  }

  const startTime = start.getTime();
  const endTime = end.getTime();
  const randomTime = Math.floor(Math.random() * (endTime - startTime + 1)) + startTime;
  const randomDate = new Date(randomTime);

  switch (format.toLowerCase()) {
    case "iso":
      return randomDate.toISOString();
    case "timestamp":
      return randomTime;
    case "date":
      return randomDate;
    default:
      return randomDate.toISOString();
  }
}

function generateRandomAlphanumeric(length: number = 30): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate an internal balance ID (`@...`) so we can simulate many balances
 * without onboarding identities/balances ahead of time.
 */
export function generateInternalBalanceId(): string {
  return `@${generateRandomAlphanumeric(30)}`;
}

export function generateMerchantName(): string {
  return faker.company.name();
}

export function generateLocation(): string {
  return faker.location.city();
}

export function generateTags(): string[] {
  const allTags = [
    "recurring",
    "one-time",
    "high-value",
    "low-value",
    "subscription",
    "payment",
    "refund",
    "fee",
    "bonus",
    "adjustment",
  ];

  const numTags = Math.floor(Math.random() * 3) + 1;
  const shuffled = [...allTags].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, numTags);
}

export function generatePriority(): "normal" | "high" | "urgent" {
  const rand = Math.random();
  if (rand < 0.1) return "urgent";
  if (rand < 0.3) return "high";
  return "normal";
}

/**
 * Generate metadata so populated transactions feel realistic and filterable.
 *
 * This is intentionally “demo-shaped” metadata (not a universal schema).
 */
export function generateTransactionMetadata(
  type: "Deposit" | "Withdrawal" | "Inter",
  channel?: string
): Record<string, any> {
  const metadata: Record<string, any> = {
    tags: generateTags(),
    priority: generatePriority(),
    source_app: "blnk-populate-demo",
  };

  if (type === "Deposit") {
    metadata.category = "deposit";
    metadata.channel =
      channel ||
      getRandomChannel(["bank_transfer", "card_payment", "wire_transfer", "ach", "mobile_payment"]);

    if (metadata.channel === "card_payment" || metadata.channel === "mobile_payment") {
      metadata.merchant = generateMerchantName();
      metadata.location = generateLocation();
      metadata.device = getRandomDevice(["mobile", "web", "api", "pos"]);
    }
  } else if (type === "Withdrawal") {
    metadata.category = "withdrawal";
    metadata.channel =
      channel ||
      getRandomChannel(["bank_transfer", "atm_withdrawal", "wire_transfer", "ach", "card_payment"]);

    if (metadata.channel === "card_payment" || metadata.channel === "atm_withdrawal") {
      metadata.merchant = generateMerchantName();
      metadata.location = generateLocation();
      metadata.device = getRandomDevice(["mobile", "web", "api", "atm"]);
    }
  } else {
    metadata.category = "transfer";
    metadata.internal = true;
    metadata.purpose = getRandomPurpose();
    metadata.device = getRandomDevice(["mobile", "web", "api"]);
  }

  return metadata;
}

export function generateTransactionDescription(
  type: "Deposit" | "Withdrawal" | "Inter",
  channel?: string,
  merchant?: string
): string {
  if (type === "Deposit") {
    if (merchant && (channel === "card_payment" || channel === "mobile_payment")) {
      return `Payment from ${merchant}`;
    }
    return `Deposit via ${channel || "bank transfer"}`;
  }

  if (type === "Withdrawal") {
    if (merchant && (channel === "card_payment" || channel === "atm_withdrawal")) {
      return `Payment to ${merchant}`;
    }
    return `Withdrawal via ${channel || "bank transfer"}`;
  }

  return "Internal account transfer";
}

function getRandomChannel(channels: string[]): string {
  const index = Math.floor(Math.random() * channels.length);
  return channels[index]!;
}

function getRandomDevice(devices: string[]): string {
  const index = Math.floor(Math.random() * devices.length);
  return devices[index]!;
}

function getRandomPurpose(): string {
  const purposes = ["account_funding", "balance_adjustment", "internal_transfer", "wallet_to_wallet"];
  const index = Math.floor(Math.random() * purposes.length);
  return purposes[index]!;
}

