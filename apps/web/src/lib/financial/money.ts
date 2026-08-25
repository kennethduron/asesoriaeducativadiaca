export const moneyPattern = /^\d{1,12}(?:\.\d{1,2})?$/;

export function normalizeMoney(value: string) {
  const trimmed = value.trim();
  if (!moneyPattern.test(trimmed)) throw new Error("INVALID_MONEY");
  const [whole, fraction = ""] = trimmed.split(".");
  return `${BigInt(whole)}.${fraction.padEnd(2, "0")}`;
}

export function moneyToCents(value: string) {
  const normalized = normalizeMoney(value);
  const [whole, fraction] = normalized.split(".");
  return BigInt(whole) * 100n + BigInt(fraction);
}

export function centsToMoney(value: bigint) {
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  return `${sign}${absolute / 100n}.${String(absolute % 100n).padStart(2, "0")}`;
}

export function formatMoney(value: string | number, currencyCode = "HNL") {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: 2,
  }).format(Number(value));
}

export type AllocationInput = { charge_id: string; amount: string };

export function canonicalizeAllocations(allocations: AllocationInput[]) {
  return allocations
    .filter((item) => moneyToCents(item.amount) > 0n)
    .map((item) => ({
      charge_id: item.charge_id,
      amount: normalizeMoney(item.amount),
    }))
    .sort((left, right) => left.charge_id.localeCompare(right.charge_id));
}

export function allocateOldest(
  paymentAmount: string,
  charges: { id: string; remaining_amount: string | number }[],
) {
  let available = moneyToCents(paymentAmount);
  return charges.map((charge) => {
    const remaining = moneyToCents(String(charge.remaining_amount));
    const applied = available > remaining ? remaining : available;
    available -= applied;
    return { charge_id: charge.id, amount: centsToMoney(applied) };
  });
}
