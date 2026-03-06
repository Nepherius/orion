export interface GroupedLootItem {
  name: string;
  quantity: number;
  value: number;
  markup: number;
  totalValue: number;
  markupGain: number;
  fixedGain: number;
}

export type LootSortBy = 'value' | 'qty' | 'name';
