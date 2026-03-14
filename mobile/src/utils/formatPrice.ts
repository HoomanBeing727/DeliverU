export function formatPrice(price: number): string {
  if (Number.isInteger(price)) {
    return `$${price}`;
  }
  const fixed2 = price.toFixed(2);
  if (fixed2.endsWith('0')) {
    return `$${price.toFixed(1)}`;
  }
  return `$${fixed2}`;
}

export function formatPriceHK(price: number): string {
  if (Number.isInteger(price)) {
    return `HK$${price}`;
  }
  const fixed2 = price.toFixed(2);
  if (fixed2.endsWith('0')) {
    return `HK$${price.toFixed(1)}`;
  }
  return `HK$${fixed2}`;
}
