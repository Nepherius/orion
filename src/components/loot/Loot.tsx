import { useState, useEffect, useMemo } from 'react';
import { useHuntStore } from '../../store';
import { usePageVisibility } from '../../hooks/usePageVisibility';
import { Info, AlertCircle } from 'lucide-react';
import { ActiveSessionSidebar } from '../layout/ActiveSessionSidebar';
import { LootBreakdownPanels } from './LootBreakdownPanels';
import { LootItemTable } from './LootItemTable';
import { LootItemOptionsModal } from './LootItemOptionsModal';
import type { GroupedLootItem, LootSortBy } from './lootTypes';
import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from '../../services/assetDataLoader';
import { Panel } from '../common/Panel';

interface LootProps {
  sessionId?: string | null;
  showSidebar?: boolean;
}

interface ItemData {
  Id: number;
  Name: string;
  Properties: {
    Type: string;
  };
}

const normalizeItemName = (name: string): string =>
  name
    .replace(/\s*\((m|f)\)$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export function Loot({ sessionId = null, showSidebar = true }: LootProps) {
  const isPageVisible = usePageVisibility();
  const [itemTypeCache, setItemTypeCache] = useState<Map<string, string>>(new Map());
  const [loadedItems, setLoadedItems] = useState<ItemData[] | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [itemMarkup, setItemMarkup] = useState<number>(100);
  const [itemFixedValue, setItemFixedValue] = useState<number>(0);
  const activeSession = useHuntStore(
    (state) => state.sessions.find((s) => s.id === state.activeSessionId) || null
  );
  const targetSession = useHuntStore((state) =>
    sessionId ? state.sessions.find((s) => s.id === sessionId) || null : null
  );
  const removeLootByName = useHuntStore((state) => state.removeLootByName);
  const updateLootByName = useHuntStore((state) => state.updateLootByName);
  const ignoreList = useHuntStore((state) => state.settings.ignoreListItems || []);
  const addToIgnoreList = useHuntStore((state) => state.addToIgnoreList);
  const removeFromIgnoreList = useHuntStore((state) => state.removeFromIgnoreList);
  const addItemTemplate = useHuntStore((state) => state.addItemTemplate);
  const itemDatabase = useHuntStore((state) => state.itemDatabase);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<LootSortBy>('value');

  // Lazy-load item data and cache lookups
  const getItemType = useMemo(() => {
    return async (itemName: string): Promise<string | undefined> => {
      const normalizedName = normalizeItemName(itemName);

      // Return from cache if already looked up
      if (itemTypeCache.has(itemName)) {
        return itemTypeCache.get(itemName);
      }

      try {
        // Load items.json only once
        if (!loadedItems) {
          const items = await loadAssetJson<ItemData[]>(EQUIPMENT_ASSET_PATHS.items);
          setLoadedItems(items);

          // Find and cache this item
          const found = items.find((item) => normalizeItemName(item.Name) === normalizedName);
          if (found) {
            const type = found.Properties?.Type;
            setItemTypeCache((prev) => new Map(prev).set(itemName, type));
            return type;
          }
        } else {
          // Items already loaded, search in loaded data
          const found = loadedItems.find((item) => normalizeItemName(item.Name) === normalizedName);
          if (found) {
            const type = found.Properties?.Type;
            setItemTypeCache((prev) => new Map(prev).set(itemName, type));
            return type;
          }
        }
      } catch (err) {
        console.error('Failed to lookup item type:', err);
      }
      return undefined;
    };
  }, [itemTypeCache, loadedItems]);

  // Helper to map Entropia Type to ItemTemplate category
  const mapTypeToCategory = (
    entropyType: string | undefined
  ): 'loot' | 'weapon' | 'armor' | 'tool' | 'other' => {
    if (!entropyType) return 'loot';
    const type = entropyType.toLowerCase();
    if (type.includes('weapon')) return 'weapon';
    if (type.includes('armor') || type.includes('clothing')) return 'armor';
    if (type.includes('tool')) return 'tool';
    return 'loot';
  };

  const session = sessionId ? targetSession : activeSession;

  // Preload item types for only the items in this session (lazy, memory efficient)
  // This runs before the early return, so it works for all cases
  useEffect(() => {
    if (!session || session.loot.length === 0 || !isPageVisible) {
      return;
    }

    const preloadItemTypes = async () => {
      const uniqueItemNames = new Set(session.loot.map((item) => item.name));
      for (const itemName of uniqueItemNames) {
        if (!itemTypeCache.has(itemName)) {
          await getItemType(itemName);
        }
      }
    };

    if (loadedItems === null) {
      preloadItemTypes();
    }
  }, [session, itemTypeCache, loadedItems, getItemType, isPageVisible]);

  if (!isPageVisible) {
    return (
      <Panel contentClassName="py-4 text-center text-muted">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-60" />
        <p>Loot is paused while the app is in the background.</p>
      </Panel>
    );
  }

  if (!session) {
    return (
      <Panel contentClassName="py-4 text-center text-muted">
        <Info className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>
          {sessionId
            ? 'Session not found.'
            : 'No active session. Start or resume a session to view loot.'}
        </p>
      </Panel>
    );
  }

  // Group loot items by name and sum quantities
  const lootMap = new Map<string, GroupedLootItem>();
  session.loot.forEach((item) => {
    const baseValue = item.value * item.quantity;
    const fixedGain = item.fixedValue && item.fixedValue > 0 ? item.fixedValue * item.quantity : 0;
    const markupGain = fixedGain > 0 ? 0 : item.totalValue - baseValue;

    const existing = lootMap.get(item.name);
    if (existing) {
      existing.quantity += item.quantity;
      existing.value += baseValue;
      existing.totalValue += item.totalValue;
      existing.markupGain += markupGain;
      existing.fixedGain += fixedGain;
    } else {
      lootMap.set(item.name, {
        name: item.name,
        quantity: item.quantity,
        value: baseValue,
        markup: item.markup,
        totalValue: item.totalValue,
        markupGain,
        fixedGain,
      });
    }
  });

  const groupedLoot = Array.from(lootMap.values());

  // Filter and sort
  const filteredLoot = groupedLoot.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) && !ignoreList.includes(item.name)
  );

  filteredLoot.sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.totalValue - a.totalValue;
      case 'qty':
        return b.quantity - a.quantity;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  // Calculate stats
  const totalAdjustedValue = filteredLoot.reduce((sum, item) => sum + item.totalValue, 0);
  const totalTTValue = filteredLoot.reduce((sum, item) => sum + item.value, 0);
  const totalMarkup = filteredLoot.reduce((sum, item) => sum + item.markupGain, 0);
  const totalFixedValue = filteredLoot.reduce((sum, item) => sum + item.fixedGain, 0);
  const avgMarkup =
    filteredLoot.length > 0
      ? filteredLoot.reduce((sum, item) => sum + item.markup, 0) / filteredLoot.length
      : 100;
  const uniqueItems = filteredLoot.length;
  const pedPerItem = uniqueItems > 0 ? totalAdjustedValue / uniqueItems : 0;

  // Top items
  const topItems = [...filteredLoot].sort((a, b) => b.totalValue - a.totalValue).slice(0, 5);

  const handleSelectItem = (item: GroupedLootItem) => {
    const existingTemplate = itemDatabase.find(
      (template) => normalizeItemName(template.name) === normalizeItemName(item.name)
    );
    const sessionFixedValuePerItem =
      item.fixedGain > 0 && item.quantity > 0 ? item.fixedGain / item.quantity : 0;

    setSelectedItem(item.name);
    setItemMarkup(existingTemplate?.defaultMarkup ?? item.markup ?? 100);
    setItemFixedValue(existingTemplate?.defaultFixedValue ?? sessionFixedValuePerItem);
  };

  const handleSaveCustomRules = () => {
    if (!selectedItem) {
      return;
    }

    updateLootByName(session.id, selectedItem, {
      markup: itemMarkup,
      fixedValue: itemFixedValue > 0 ? itemFixedValue : 0,
    });

    addItemTemplate({
      name: selectedItem,
      category: mapTypeToCategory(itemTypeCache.get(selectedItem)),
      defaultTTValue: 0,
      defaultMarkup: itemMarkup,
      defaultFixedValue: itemFixedValue > 0 ? itemFixedValue : undefined,
      description: `Set from loot page - Type: ${itemTypeCache.get(selectedItem) || 'Unknown'}`,
    });
    setSelectedItem(null);
  };

  const handleToggleIgnore = () => {
    if (!selectedItem) {
      return;
    }

    if (ignoreList.includes(selectedItem)) {
      removeFromIgnoreList(selectedItem);
    } else {
      addToIgnoreList(selectedItem);
    }
    setSelectedItem(null);
  };

  const mainColumnSpanClass = showSidebar ? 'col-span-9' : 'col-span-12';

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Main Content */}
      <div className={`${mainColumnSpanClass} space-y-6`}>
        <LootBreakdownPanels
          totalAdjustedValue={totalAdjustedValue}
          totalTTValue={totalTTValue}
          totalMarkup={totalMarkup}
          totalFixedValue={totalFixedValue}
          topItems={topItems}
          uniqueItems={uniqueItems}
          avgMarkup={avgMarkup}
          pedPerItem={pedPerItem}
        />

        <LootItemTable
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sortBy={sortBy}
          onSortByChange={setSortBy}
          filteredLoot={filteredLoot}
          totalAdjustedValue={totalAdjustedValue}
          itemTypeCache={itemTypeCache}
          onSelectItem={handleSelectItem}
          onDeleteItem={(itemName) => {
            removeLootByName(session.id, itemName);
          }}
        />
      </div>

      {/* Active Session Sidebar */}
      {showSidebar && (
        <div className="col-span-3">
          <ActiveSessionSidebar />
        </div>
      )}

      <LootItemOptionsModal
        selectedItem={selectedItem}
        itemMarkup={itemMarkup}
        itemFixedValue={itemFixedValue}
        isIgnored={selectedItem ? ignoreList.includes(selectedItem) : false}
        onMarkupChange={setItemMarkup}
        onFixedValueChange={setItemFixedValue}
        onSaveCustomRules={handleSaveCustomRules}
        onToggleIgnore={handleToggleIgnore}
        onClose={() => setSelectedItem(null)}
      />
    </div>
  );
}
