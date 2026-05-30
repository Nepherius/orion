// React hook for browsing and searching Entropia Universe items
import { useState, useEffect } from 'react';
import { EQUIPMENT_ASSET_PATHS, loadAssetJson } from '../services/assetDataLoader';

/**
 * Represents an item from the Entropia Universe item database
 */
export interface EntropyItem {
  Id: number;
  Name: string;
  Properties: {
    Type: string;
    Weight?: number;
    Economy?: {
      Value?: number;
    };
  };
  Links?: {
    $Url?: string;
  };
}

/**
 * Loads and filters the item database for use in item browsers
 */
export function useItemBrowser() {
  const [items, setItems] = useState<EntropyItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<EntropyItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load items on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        const data = await loadAssetJson<EntropyItem[]>(EQUIPMENT_ASSET_PATHS.items);
        setItems(data);
        setError(null);
      } catch (err) {
        console.error('Error loading items:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, []);

  // Filter items based on search query
  useEffect(() => {
    const query = searchQuery.toLowerCase();
    if (!query) {
      setFilteredItems(items);
    } else {
      setFilteredItems(
        items.filter(
          (item) =>
            item.Name.toLowerCase().includes(query) ||
            item.Properties?.Type?.toLowerCase().includes(query)
        )
      );
    }
  }, [items, searchQuery]);

  const getTTValue = (item: EntropyItem): number => {
    return item.Properties?.Economy?.Value ?? 0;
  };

  const getCategory = (item: EntropyItem): 'loot' | 'weapon' | 'armor' | 'tool' | 'other' => {
    const type = item.Properties?.Type?.toLowerCase() ?? '';
    if (type.includes('weapon')) return 'weapon';
    if (type.includes('armor') || type.includes('suit')) return 'armor';
    if (type.includes('tool')) return 'tool';
    if (type.includes('material') || type.includes('residue') || type.includes('ore'))
      return 'loot';
    return 'other';
  };

  return {
    items: filteredItems,
    allItems: items,
    searchQuery,
    setSearchQuery,
    loading,
    error,
    getTTValue,
    getCategory,
  };
}
