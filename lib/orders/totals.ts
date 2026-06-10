import { getTaxes } from "@/lib/store/taxes";

export interface OrderTotals {
  subtotal: number;
  tax_total: number;
  total: number;
}

export function calculateOrderTotals(subtotal: number): OrderTotals {
  const taxes = getTaxes();
  const foodBeverageTax =
    subtotal * (taxes.food_beverage_tax_percent / 100);
  const salesTax = subtotal * (taxes.sales_tax_percent / 100);
  const tax_total = roundMoney(foodBeverageTax + salesTax);
  const total = roundMoney(subtotal + tax_total);

  return { subtotal: roundMoney(subtotal), tax_total, total };
}

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}
