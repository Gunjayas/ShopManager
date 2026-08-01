// Defines profit margin as profit divided by selling revenue for every sales view and report.
export function calculateProfitMarginPercent(profit: number, sellingPrice: number) {
  if (sellingPrice === 0) return 0;
  return (profit / sellingPrice) * 100;
}