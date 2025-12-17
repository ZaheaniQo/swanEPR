import { supabase } from '../services/supabaseClient';
import { InventoryMovementType } from '../types';

const TABLES = {
  inventory: 'inventory_stock',
  products: 'products',
};

export const inventoryRepository = {
  async fetchAll(tenantId: string) {
    const { data, error } = await supabase
      .from(TABLES.inventory)
      .select(
        `
          id, product_id, warehouse_id, quantity, reorder_level, tenant_id,
          product:${TABLES.products}(name, sku, base_unit, standard_cost)
        `,
      )
      .eq('tenant_id', tenantId);

    if (error) throw error;
    return data || [];
  },

  async fetchStockMeta(stockId: string, tenantId: string) {
    const { data, error } = await supabase
      .from(TABLES.inventory)
      .select('product_id, warehouse_id')
      .eq('id', stockId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },

  async processMovement(params: {
    productId: string;
    warehouseId: string;
    movementType: InventoryMovementType;
    quantity: number;
    userId: string;
    tenantId: string;
  }) {
    const { error } = await supabase.rpc('process_inventory_movement', {
      p_product_id: params.productId,
      p_warehouse_id: params.warehouseId,
      p_type: params.movementType,
      p_quantity: params.quantity,
      p_user_id: params.userId,
      p_tenant_id: params.tenantId,
    });

    if (error) throw error;
  },
};
