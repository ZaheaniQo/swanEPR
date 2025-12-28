import { useCallback } from 'react';

// Placeholder hook to centralize inventory mutations and enforce single entry point.
// Extend with queries once inventory domain is refactored.
export const useInventory = () => {
  const ensureMovementsOnly = useCallback(() => {
    throw new Error('Inventory domain not yet refactored. All stock changes must flow through inventory_movements.');
  }, []);

  return { ensureMovementsOnly };
};
