const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

// Gains and losses always carry an explicit sign - "$12.40" and "-$12.40"
// next to each other in a column are easy to misread at a glance.
export function formatSignedCurrency(value: number): string {
  const formatted = currency.format(Math.abs(value));
  // Sign the rounded number, not the raw one: a position down by a fraction of
  // a cent rounds to zero, and "-$0.00" reads as a broken cell, not as flat.
  if (Math.abs(value) < 0.005) return formatted;
  return value < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatSignedPercent(value: number): string {
  const formatted = Math.abs(value).toFixed(2);
  if (formatted === "0.00") return `${formatted}%`;
  return `${value < 0 ? "-" : "+"}${formatted}%`;
}

// Share counts are usually whole but can be fractional, so trailing zeros are
// trimmed rather than padded to a fixed width.
export function formatShares(value: number): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
}
