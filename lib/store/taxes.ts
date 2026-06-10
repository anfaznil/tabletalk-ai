export interface TaxConfig {
  food_beverage_tax_percent: number;
  sales_tax_percent: number;
}

const DEFAULT_TAXES: TaxConfig = {
  food_beverage_tax_percent: 6,
  sales_tax_percent: 5.3,
};

const globalStore = globalThis as unknown as { taxes: TaxConfig };

if (!globalStore.taxes) {
  globalStore.taxes = { ...DEFAULT_TAXES };
}

export function getTaxes(): TaxConfig {
  return globalStore.taxes;
}

export function updateTaxes(updates: Partial<TaxConfig>): TaxConfig {
  globalStore.taxes = {
    food_beverage_tax_percent:
      updates.food_beverage_tax_percent ??
      globalStore.taxes.food_beverage_tax_percent,
    sales_tax_percent:
      updates.sales_tax_percent ?? globalStore.taxes.sales_tax_percent,
  };
  return globalStore.taxes;
}
