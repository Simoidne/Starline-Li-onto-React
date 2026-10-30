import { calculate, convert } from './calculator';

const shipment = {
  weight: 100,
  yieldPercent: 80,
  purchasePrice: 10,
  purchaseCurrency: 'USD',
  costs: [{ label: 'Freight', amount: 100, currency: 'CAD' }],
  rates: { CAD: 1, USD: 1.5, EUR: 2 },
  sellingPrice: 25,
};
test('converts cross currencies using CAD per currency unit', () => {
  expect(convert(100, 'USD', 'EUR', shipment.rates)).toBe(75);
});
test('includes purchase and freight and divides by saleable weight', () => {
  expect(calculate(shipment)).toMatchObject({
    total: 1600,
    saleableWeight: 80,
    costPerKg: 20,
    revenue: 2000,
    profit: 400,
    margin: 20,
  });
});
test('zero revenue has no margin and retains the loss', () => {
  expect(calculate({ ...shipment, sellingPrice: 0 })).toMatchObject({
    margin: null,
    profit: -1600,
  });
});
test('rejects invalid weights, yields, costs and exchange rates', () => {
  for (const weight of [0, -1, NaN])
    expect(() => calculate({ ...shipment, weight })).toThrow();
  for (const yieldPercent of [0, 101, NaN])
    expect(() => calculate({ ...shipment, yieldPercent })).toThrow();
  expect(() => convert(100, 'USD', 'CAD', { CAD: 1, USD: 0 })).toThrow();
  expect(() => convert(-1, 'USD', 'CAD', shipment.rates)).toThrow();
});
