
import { 
  CostCenter, Warehouse, InventoryStock, LandedCost, 
  AssetCategory, Asset, AssetDepreciationSchedule, 
  BillOfMaterials, BOMItem, WorkOrder, 
  SalaryStructure, LeaveRecord, PayrollRun, Payslip 
} from '../../types';
import * as dbCore from './core';
import { supabase } from '../supabaseClient';
import { accountingService } from './accounting.service';

const TBL = {
  COST_CENTERS: 'cost_centers',
  WAREHOUSES: 'warehouses',
  INVENTORY_STOCK: 'inventory_stock',
  LANDED_COSTS: 'landed_costs',
  ASSET_CATEGORIES: 'asset_categories',
  ASSETS: 'assets',
  ASSET_SCHEDULES: 'asset_depreciation_schedules',
  BOM: 'bill_of_materials',
  BOM_ITEMS: 'bom_items',
  WORK_ORDERS: 'work_orders',
  SALARY_STRUCTURES: 'salary_structures',
  LEAVES: 'leaves',
  PAYROLL_RUNS: 'payroll_runs',
  PAYSLIPS: 'payslips'
};

export const erpService = {
  
  // --- COST CENTERS ---
  async getCostCenters() {
    return dbCore.getList<CostCenter>(TBL.COST_CENTERS);
  },
  async createCostCenter(item: Partial<CostCenter>) {
    return dbCore.create<CostCenter>(TBL.COST_CENTERS, item);
  },

  // --- WAREHOUSES & STOCK ---
  async getWarehouses() {
    return dbCore.getList<Warehouse>(TBL.WAREHOUSES);
  },
  async getInventoryStock(warehouseId?: string) {
    let query = supabase
      .from(TBL.INVENTORY_STOCK)
      .select('*, product:products(name, sku, base_unit, type, avg_cost), warehouse:warehouses(name)');
      
    if (warehouseId) {
      query = query.eq('warehouse_id', warehouseId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    return data.map((item: any) => ({
        ...item,
        productName: item.product?.name,
        productCode: item.product?.sku,
        unit: item.product?.base_unit,
        type: item.product?.type,
        cost: item.product?.avg_cost,
        warehouseName: item.warehouse?.name
    }));
  },
  
  // --- FIXED ASSETS ---
  async getAssetCategories() {
    return dbCore.getList<AssetCategory>(TBL.ASSET_CATEGORIES);
  },
  async getAssets() {
    return dbCore.getList<Asset>(TBL.ASSETS);
  },
  async createAsset(asset: Partial<Asset>) {
    return dbCore.create<Asset>(TBL.ASSETS, asset);
  },
  async getDepreciationSchedule(assetId: string) {
    return dbCore.getList<AssetDepreciationSchedule>(TBL.ASSET_SCHEDULES, q => q.eq('asset_id', assetId));
  },

  // --- MANUFACTURING ---
  async getBOMs() {
    return dbCore.getList<BillOfMaterials>(TBL.BOM);
  },
  async createBOM(bom: Partial<BillOfMaterials>, items: Partial<BOMItem>[]) {
    // 1. Create BOM Header (Map to snake_case)
    const dbBom = {
        name: bom.name,
        product_id: bom.productId,
        version: bom.version,
        is_active: bom.isActive,
        output_quantity: bom.outputQuantity
    };
    const newBom = await dbCore.create<BillOfMaterials>(TBL.BOM, dbBom as any);
    
    // 2. Create BOM Items
    if (items.length > 0) {
        const itemsWithId = items.map(i => ({ 
            bom_id: newBom.id, 
            component_product_id: i.componentProductId,
            quantity: i.quantity,
            wastage_percent: i.wastagePercent
        }));
        const { error } = await supabase.from(TBL.BOM_ITEMS).insert(itemsWithId);
        if (error) throw error;
    }
    return newBom;
  },
  async getBOMItems(bomId: string) {
    return dbCore.getList<BOMItem>(TBL.BOM_ITEMS, q => q.eq('bom_id', bomId));
  },
  async getWorkOrders() {
    return dbCore.getList<WorkOrder>(TBL.WORK_ORDERS);
  },
  async createWorkOrder(wo: Partial<WorkOrder>) {
    const dbWo = {
        number: wo.number,
        bom_id: wo.bomId,
        product_id: wo.productId,
        quantity_planned: wo.quantityPlanned,
        due_date: wo.dueDate,
        status: wo.status,
        warehouse_id: wo.warehouseId,
        notes: wo.notes
    };
    return dbCore.create<WorkOrder>(TBL.WORK_ORDERS, dbWo as any);
  },
  async adjustStock(stockId: string, quantity: number, type: 'IN' | 'OUT', reason?: string) {
      // 1. Get Stock Record
      const { data: stock } = await supabase.from(TBL.INVENTORY_STOCK).select('*').eq('id', stockId).single();
      if (!stock) throw new Error('Stock record not found');

      // 2. Calculate New Quantity
      const delta = type === 'IN' ? quantity : -quantity;
      const newQty = Number(stock.quantity) + delta;
      
      if (newQty < 0) throw new Error('Insufficient stock');

      // 3. Update Stock
      await dbCore.update(TBL.INVENTORY_STOCK, stockId, { quantity: newQty });

      // 4. Record Movement
      // We need product cost for valuation
      const { data: product } = await supabase.from('products').select('avg_cost').eq('id', stock.product_id).single();
      const unitCost = product?.avg_cost || 0;

      await supabase.from('inventory_movements').insert({
          product_id: stock.product_id,
          warehouse_id: stock.warehouse_id,
          type: type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: quantity,
          unit_cost: unitCost,
          notes: reason,
          user_id: (await supabase.auth.getUser()).data.user?.id
      });
  },

  async adjustStockByProduct(productId: string, warehouseId: string, quantity: number, type: 'IN' | 'OUT', reason?: string) {
      // 1. Find Stock Record
      let { data: stock } = await supabase
          .from(TBL.INVENTORY_STOCK)
          .select('*')
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId)
          .single();
      
      // 2. Create if not exists (only for IN)
      if (!stock) {
          if (type === 'OUT') throw new Error('Stock record not found for this product in selected warehouse');
          
          const { data: newStock, error } = await supabase.from(TBL.INVENTORY_STOCK).insert({
              product_id: productId,
              warehouse_id: warehouseId,
              quantity: 0,
              reorder_level: 0
          }).select().single();
          
          if (error) throw error;
          stock = newStock;
      }

      // 3. Call standard adjust
      return this.adjustStock(stock.id, quantity, type, reason);
  },

  async updateWorkOrderStatus(id: string, status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
      // 1. Update Status
      const { data: wo, error } = await supabase
        .from(TBL.WORK_ORDERS)
        .update({ status })
        .eq('id', id)
        .select('*, product:products(avg_cost, name)') // Fetch cost for accounting
        .single();
      
      if (error) throw error;

      // 2. If Completed, Handle Inventory & Accounting
      if (status === 'COMPLETED' && wo) {
          // A. Consume Raw Materials
          if (wo.bom_id) {
              const bomItems = await this.getBOMItems(wo.bom_id);
              for (const item of bomItems) {
                  // Find stock for this component in the WO warehouse
                  // Note: In a real app, we might need to pick from multiple batches or locations
                  // Here we assume one stock record per product per warehouse for simplicity
                  const { data: stock } = await supabase
                      .from(TBL.INVENTORY_STOCK)
                      .select('*')
                      .eq('product_id', item.componentProductId)
                      .eq('warehouse_id', wo.warehouse_id)
                      .single();
                  
                  if (stock) {
                      const qtyConsumed = item.quantity * wo.quantity_produced;
                      await this.adjustStock(stock.id, qtyConsumed, 'OUT', `WO Consumption - ${wo.number}`);
                  } else {
                      console.warn(`Stock not found for component ${item.componentProductId} in warehouse ${wo.warehouse_id}`);
                      // In strict mode, we should throw error here
                  }
              }
          }

          // B. Add Finished Goods
          // Find or Create Stock Record for Finished Good
          const { data: fgStock } = await supabase
              .from(TBL.INVENTORY_STOCK)
              .select('*')
              .eq('product_id', wo.product_id)
              .eq('warehouse_id', wo.warehouse_id)
              .single();
          
          if (fgStock) {
              await this.adjustStock(fgStock.id, wo.quantity_produced, 'IN', `WO Production - ${wo.number}`);
          } else {
              // Create new stock record if it doesn't exist
              const { data: newStock } = await supabase.from(TBL.INVENTORY_STOCK).insert({
                  product_id: wo.product_id,
                  warehouse_id: wo.warehouse_id,
                  quantity: 0, // Will be adjusted below
                  reorder_level: 0
              }).select().single();
              
              if (newStock) {
                  await this.adjustStock(newStock.id, wo.quantity_produced, 'IN', `WO Production - ${wo.number}`);
              }
          }

          // C. Post to Accounting
          const cost = wo.product?.avg_cost || 0;
          const totalValue = cost * wo.quantity_produced; 
          
          if (totalValue > 0) {
             await accountingService.postWorkOrderCompletion({
                 ...wo,
                 productName: wo.product?.name
             }, totalValue);
          }
      }
      return wo;
  },

  // --- HR & PAYROLL ---
  async getSalaryStructure(employeeId: string) {
    const list = await dbCore.getList<SalaryStructure>(TBL.SALARY_STRUCTURES, q => q.eq('employee_id', employeeId));
    return list[0] || null;
  },
  async saveSalaryStructure(structure: Partial<SalaryStructure>) {
    if (structure.id) {
      return dbCore.update<SalaryStructure>(TBL.SALARY_STRUCTURES, structure.id, structure);
    }
    return dbCore.create<SalaryStructure>(TBL.SALARY_STRUCTURES, structure);
  },
  async getPayrollRuns() {
    return dbCore.getList<PayrollRun>(TBL.PAYROLL_RUNS);
  },
  async createPayrollRun(month: number, year: number) {
    // Logic to calculate payroll would go here or in a Supabase Edge Function
    // For now, just create the run record
    return dbCore.create<PayrollRun>(TBL.PAYROLL_RUNS, { month, year, status: 'DRAFT' });
  }
};
