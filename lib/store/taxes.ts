import { prisma } from "@/lib/db/prisma";
import { getRestaurantId } from "@/lib/store/tenant";

export interface TaxConfig {
  food_beverage_tax_percent: number;
  sales_tax_percent: number;
}

const DEFAULT_TAXES: TaxConfig = {
  food_beverage_tax_percent: 6,
  sales_tax_percent: 5.3,
};

export async function getTaxes(): Promise<TaxConfig> {
  const rid = await getRestaurantId();
  const row = await prisma.taxRate.findUnique({ where: { restaurant_id: rid } });
  if (!row) return { ...DEFAULT_TAXES };
  return {
    food_beverage_tax_percent: row.food_beverage_rate.toNumber() * 100,
    sales_tax_percent: row.sales_rate.toNumber() * 100,
  };
}

export async function updateTaxes(updates: Partial<TaxConfig>): Promise<TaxConfig> {
  const rid = await getRestaurantId();
  const current = await getTaxes();
  const next = {
    food_beverage_tax_percent:
      updates.food_beverage_tax_percent ?? current.food_beverage_tax_percent,
    sales_tax_percent: updates.sales_tax_percent ?? current.sales_tax_percent,
  };
  await prisma.taxRate.upsert({
    where: { restaurant_id: rid },
    create: {
      restaurant_id: rid,
      food_beverage_rate: next.food_beverage_tax_percent / 100,
      sales_rate: next.sales_tax_percent / 100,
    },
    update: {
      food_beverage_rate: next.food_beverage_tax_percent / 100,
      sales_rate: next.sales_tax_percent / 100,
    },
  });
  return next;
}
