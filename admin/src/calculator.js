export const currencies = ['CAD', 'USD', 'EUR', 'CNY', 'JPY'];

// A rate always means CAD per one unit of the named currency.
export function convert(amount, from, to, rates) {
  if (!Number.isFinite(amount) || amount < 0)
    throw new Error('Enter a valid non-negative amount.');
  if (![rates[from], rates[to]].every((rate) => Number.isFinite(rate) && rate > 0)) {
    throw new Error('Every selected currency needs a rate greater than zero.');
  }
  return (amount * rates[from]) / rates[to];
}

export function calculate({
  weight,
  yieldPercent,
  purchasePrice,
  purchaseCurrency,
  costs,
  rates,
  sellingPrice,
}) {
  if (!Number.isFinite(weight) || weight <= 0)
    throw new Error('Shipment weight must be greater than zero.');
  if (!Number.isFinite(yieldPercent) || yieldPercent <= 0 || yieldPercent > 100) {
    throw new Error('Saleable yield must be greater than zero and at most 100%.');
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice < 0)
    throw new Error('Enter a valid selling price.');
  const purchase = convert(weight * purchasePrice, purchaseCurrency, 'CAD', rates);
  const breakdown = costs.map((cost) => ({
    ...cost,
    total: convert(cost.amount, cost.currency, 'CAD', rates),
  }));
  const total = purchase + breakdown.reduce((sum, cost) => sum + cost.total, 0);
  const saleableWeight = (weight * yieldPercent) / 100;
  const revenue = saleableWeight * sellingPrice;
  if (![total, revenue, saleableWeight].every(Number.isFinite))
    throw new Error('Values are too large to calculate.');
  return {
    purchase,
    breakdown,
    total,
    saleableWeight,
    costPerKg: total / saleableWeight,
    revenue,
    profit: revenue - total,
    margin: revenue > 0 ? ((revenue - total) / revenue) * 100 : null,
  };
}
