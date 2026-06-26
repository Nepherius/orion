import type { LootItem } from '../types';

export interface LootItemAccounting {
  ttValue: number;
  adjustedValue: number;
  markupGain: number;
  fixedGain: number;
}

export interface LootAccountingTotals {
  totalTtLoot: number;
  totalAdjustedLoot: number;
  totalMarkupGain: number;
  totalFixedGain: number;
}

export interface SessionAccountingTotals extends LootAccountingTotals {
  totalCost: number;
  ttReturns: number;
  adjustedReturns: number;
  ttProfit: number;
  adjustedProfit: number;
}

export function calculateLootItemAccounting(
  item: Pick<LootItem, 'quantity' | 'value' | 'totalValue' | 'fixedValue'>
): LootItemAccounting {
  const ttValue = item.value * item.quantity;
  const fixedGain = item.fixedValue && item.fixedValue > 0 ? item.fixedValue * item.quantity : 0;
  const markupGain = fixedGain > 0 ? 0 : item.totalValue - ttValue;

  return {
    ttValue,
    adjustedValue: item.totalValue,
    markupGain,
    fixedGain,
  };
}

export function calculateLootAccounting(
  loot: Array<Pick<LootItem, 'quantity' | 'value' | 'totalValue' | 'fixedValue'>>
): LootAccountingTotals {
  return loot.reduce<LootAccountingTotals>(
    (totals, item) => {
      const itemAccounting = calculateLootItemAccounting(item);
      totals.totalTtLoot += itemAccounting.ttValue;
      totals.totalAdjustedLoot += itemAccounting.adjustedValue;
      totals.totalMarkupGain += itemAccounting.markupGain;
      totals.totalFixedGain += itemAccounting.fixedGain;
      return totals;
    },
    {
      totalTtLoot: 0,
      totalAdjustedLoot: 0,
      totalMarkupGain: 0,
      totalFixedGain: 0,
    }
  );
}

export function calculateSessionAccounting(
  loot: Array<Pick<LootItem, 'quantity' | 'value' | 'totalValue' | 'fixedValue'>>,
  totalCost: number
): SessionAccountingTotals {
  const lootTotals = calculateLootAccounting(loot);

  return {
    ...lootTotals,
    totalCost,
    ttReturns: totalCost > 0 ? (lootTotals.totalTtLoot / totalCost) * 100 : 0,
    adjustedReturns: totalCost > 0 ? (lootTotals.totalAdjustedLoot / totalCost) * 100 : 0,
    ttProfit: lootTotals.totalTtLoot - totalCost,
    adjustedProfit: lootTotals.totalAdjustedLoot - totalCost,
  };
}
