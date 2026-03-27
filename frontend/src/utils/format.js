/**
 * Formats a number as a currency string with NGN symbol and k/M suffixes.
 * e.g., 5000 -> ₦5k, 5000000 -> ₦5M
 */
export const formatCurrency = (n) => {
  if (n === null || n === undefined) return '₦0';
  const val = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  
  if (val >= 1000000) {
    return `${sign}₦${(val / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
  }
  if (val >= 1000) {
    return `${sign}₦${(val / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
  }
  return `${sign}₦${val.toLocaleString()}`;
};

/**
 * Formats a number with commas for full display.
 */
export const formatFullCurrency = (n) => {
    if (n === null || n === undefined) return '₦0';
    return `₦${n.toLocaleString()}`;
};
