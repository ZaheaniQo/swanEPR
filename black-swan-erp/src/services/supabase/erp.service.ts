
import { 
  CostCenter, Warehouse, InventoryStock, LandedCost, 
  AssetCategory, Asset, AssetDepreciationSchedule, 
  BillOfMaterials, BOMItem, WorkOrder, 
  SalaryStructure, LeaveRecord, PayrollRun, Payslip, JournalStatus 
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

const getContext = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  const tenantId = (user as any).app_metadata?.tenant_id || user.id;
  return { tenantId, userId: user.id };
};

export const erpService = {
  
  // --- COST CENTERS ---
  async getCostCenters() {
    return dbCore.getList<CostCenter>(TBL.COST_CENTERS);
  },
  async createCostCenter(item: Partial<CostCenter>) {
    const { tenantId } = await getContext();
    return dbCore.create<CostCenter>(TBL.COST_CENTERS, { ...item, tenant_id: tenantId });
  },

  // --- WAREHOUSES & STOCK ---
  async getWarehouses() {
    return dbCore.getList<Warehouse>(TBL.WAREHOUSES);
  },
  async getInventoryStock(warehouseId?: string) {
    const { tenantId } = await getContext();

    let query = supabase
      .from(TBL.INVENTORY_STOCK)
      .select('id, product_id, warehouse_id, quantity, reorder_level, location_bin, updated_at, product:products(name, sku, base_unit, type, avg_cost), warehouse:warehouses(name)')
      .eq('tenant_id', tenantId);
      
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
    const { tenantId } = await getContext();
    return dbCore.create<Asset>(TBL.ASSETS, { ...asset, tenant_id: tenantId });
  },
  async getDepreciationSchedule(assetId: string) {
    return dbCore.getList<AssetDepreciationSchedule>(TBL.ASSET_SCHEDULES, q => q.eq('asset_id', assetId));
  },

  // --- MANUFACTURING ---
  async getBOMs() {
    return dbCore.getList<BillOfMaterials>(TBL.BOM);
  },
  async createBOM(bom: Partial<BillOfMaterials>, items: Partial<BOMItem>[]) {
    const { tenantId } = await getContext();
    // 1. Create BOM Header (Map to snake_case)
    const dbBom = {
        name: bom.name,
        product_id: bom.productId,
        version: bom.version,
      is_active: bom.isActive,
      output_quantity: bom.outputQuantity,
      tenant_id: tenantId
    };
    const newBom = await dbCore.create<BillOfMaterials>(TBL.BOM, dbBom as any);
    
    // 2. Create BOM Items
    if (items.length > 0) {
        const itemsWithId = items.map(i => ({ 
            bom_id: newBom.id, 
            component_product_id: i.componentProductId,
            quantity: i.quantity,
        wastage_percent: i.wastagePercent,
        tenant_id: tenantId
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
    const { tenantId } = await getContext();
    const dbWo = {
        number: wo.number,
        bom_id: wo.bomId,
        product_id: wo.productId,
        quantity_planned: wo.quantityPlanned,
        due_date: wo.dueDate,
        status: wo.status,
        warehouse_id: wo.warehouseId,
      notes: wo.notes,
      tenant_id: tenantId
    };
    return dbCore.create<WorkOrder>(TBL.WORK_ORDERS, dbWo as any);
  },
  async adjustStock(stockId: string, quantity: number, type: 'IN' | 'OUT', reason?: string) {
      // 1. Get Stock Record
      const { tenantId, userId } = await getContext();
      const { data: stock } = await supabase
        .from(TBL.INVENTORY_STOCK)
        .select('id, quantity, product_id, warehouse_id, reorder_level, location_bin')
        .eq('id', stockId)
        .eq('tenant_id', tenantId)
        .single();
      if (!stock) throw new Error('Stock record not found');

      // 2. Calculate New Quantity
      const delta = type === 'IN' ? quantity : -quantity;
      const newQty = Number(stock.quantity) + delta;
      
      if (newQty < 0) throw new Error('Insufficient stock');

      // 3. Update Stock
      await dbCore.update(TBL.INVENTORY_STOCK, stockId, { quantity: newQty });

      // 4. Record Movement
      // We need product cost for valuation
      const { data: product } = await supabase.from('products').select('avg_cost').eq('id', stock.product_id).eq('tenant_id', tenantId).single();
      const unitCost = product?.avg_cost || 0;
        

      await supabase.from('inventory_movements').insert({
          product_id: stock.product_id,
          warehouse_id: stock.warehouse_id,
          type: type === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT',
          quantity: quantity,
          unit_cost: unitCost,
          notes: reason,
          user_id: userId,
          tenant_id: tenantId
      });
  },

  async adjustStockByProduct(productId: string, warehouseId: string, quantity: number, type: 'IN' | 'OUT', reason?: string) {
      const { tenantId } = await getContext();
      // 1. Find Stock Record
      let { data: stock } = await supabase
          .from(TBL.INVENTORY_STOCK)
          .select('id, quantity, product_id, warehouse_id, reorder_level, location_bin')
          .eq('product_id', productId)
          .eq('warehouse_id', warehouseId)
        .eq('tenant_id', tenantId)
          .single();
      
      // 2. Create if not exists (only for IN)
      if (!stock) {
          if (type === 'OUT') throw new Error('Stock record not found for this product in selected warehouse');
          
            const { data: newStock, error } = await supabase.from(TBL.INVENTORY_STOCK).insert({
              product_id: productId,
              warehouse_id: warehouseId,
              quantity: 0,
              reorder_level: 0,
          tenant_id: tenantId
            }).select('id, quantity, product_id, warehouse_id, reorder_level, location_bin').single();
          
          if (error) throw error;
          stock = newStock;
      }

      // 3. Call standard adjust
      return this.adjustStock(stock.id, quantity, type, reason);
  },

  async updateWorkOrderStatus(id: string, status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') {
      const { tenantId } = await getContext();
      // 1. Update Status
      const { data: wo, error } = await supabase
        .from(TBL.WORK_ORDERS)
        .update({ status })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id, bom_id, product_id, warehouse_id, quantity_produced, status, number, tenant_id, product:products(avg_cost, name)') // Fetch cost for accounting
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
                      .select('id')
                      .eq('product_id', item.componentProductId)
                      .eq('warehouse_id', wo.warehouse_id)
                        .eq('tenant_id', tenantId)
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
              .select('id')
              .eq('product_id', wo.product_id)
              .eq('warehouse_id', wo.warehouse_id)
                .eq('tenant_id', tenantId)
              .single();
          
          if (fgStock) {
              await this.adjustStock(fgStock.id, wo.quantity_produced, 'IN', `WO Production - ${wo.number}`);
          } else {
              // Create new stock record if it doesn't exist
              const { data: newStock } = await supabase.from(TBL.INVENTORY_STOCK).insert({
                  product_id: wo.product_id,
                  warehouse_id: wo.warehouse_id,
                quantity: 0, // Will be adjusted below
                reorder_level: 0,
                tenant_id: tenantId
              }).select('id').single();
              
              if (newStock) {
                  await this.adjustStock(newStock.id, wo.quantity_produced, 'IN', `WO Production - ${wo.number}`);
              }
          }

          // C. Post to Accounting
            const productInfo = Array.isArray((wo as any).product)
              ? (wo as any).product[0]
              : (wo as any).product;

            const cost = productInfo?.avg_cost || 0;
            const totalValue = cost * wo.quantity_produced; 
          
            if (totalValue > 0) {
             await accountingService.postWorkOrderCompletion({
               ...wo,
               productName: productInfo?.name
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
    const { tenantId } = await getContext();
    if (structure.id) {
      return dbCore.update<SalaryStructure>(TBL.SALARY_STRUCTURES, structure.id, structure);
    }
    return dbCore.create<SalaryStructure>(TBL.SALARY_STRUCTURES, { ...structure, tenant_id: tenantId });
  },
  async getPayrollRuns() {
    const { tenantId } = await getContext();
    const { data, error } = await supabase
      .from(TBL.PAYROLL_RUNS)
      .select(`id, month, year, status, total_amount, processed_at, payslips (net_salary, status)`)
      .eq('tenant_id', tenantId)
      .order('year', { ascending: false })
      .order('month', { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      month: row.month,
      year: row.year,
      status: row.status,
      totalAmount: Number(row.total_amount || (row.payslips || []).reduce((s: number, p: any) => s + Number(p.net_salary || 0), 0)),
      processedAt: row.processed_at
    })) as PayrollRun[];
  },
  async createPayrollRun(month: number, year: number) {
    const { tenantId, userId } = await getContext();

    const { payslips, totalAmount } = await this.previewPayrollRun(month, year);

    const { data: run, error: runErr } = await supabase.from(TBL.PAYROLL_RUNS).insert({
      month,
      year,
      status: 'PROCESSED',
      total_amount: totalAmount,
      processed_at: new Date().toISOString(),
      tenant_id: tenantId,
      created_by: userId
    }).select('id, month, year, status, total_amount, processed_at').single();
    if (runErr) throw runErr;

    if (payslips.length) {
      const { error: psErr } = await supabase.from(TBL.PAYSLIPS).insert(
        payslips.map(p => ({ ...p, payroll_run_id: run.id }))
      );
      if (psErr) throw psErr;
    }

    return {
      id: run.id,
      month: run.month,
      year: run.year,
      status: run.status,
      totalAmount,
      processedAt: run.processed_at
    } as PayrollRun;
  },

  async previewPayrollRun(month: number, year: number) {
    const { tenantId } = await getContext();
    const { data: employees, error: empErr } = await supabase
      .from('employees')
      .select(`id, first_name, last_name, iban, salary_structures(id, basic_salary, housing_allowance, transport_allowance, other_allowances, gosi_deduction_percent, effective_date)`) 
      .eq('tenant_id', tenantId);
    if (empErr) throw empErr;

    const payslips: any[] = [];

    employees?.forEach((emp: any) => {
      const latest = (emp.salary_structures || []).sort((a: any, b: any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
      const basic = Number(latest?.basic_salary || 0);
      const housing = Number(latest?.housing_allowance || 0);
      const transport = Number(latest?.transport_allowance || 0);
      const other = Number(latest?.other_allowances || 0);
      const gross = basic + housing + transport + other;
      const gosiPercent = Number(latest?.gosi_deduction_percent ?? 0);
      const gosi = gross * (gosiPercent / 100);
      const deductions = gosi;
      const net = gross - deductions;

      payslips.push({
        employee_id: emp.id,
        basic_salary: basic,
        total_allowances: housing + transport + other,
        total_deductions: deductions,
        net_salary: net,
        status: 'PENDING',
        tenant_id: tenantId,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim()
      });
    });

    const totalAmount = payslips.reduce((s, p) => s + Number(p.net_salary || 0), 0);
    return { payslips, totalAmount };
  },

  async getPayslips(payrollRunId: string): Promise<Payslip[]> {
    const { tenantId } = await getContext();
    const { data, error } = await supabase
      .from(TBL.PAYSLIPS)
      .select(`id, payroll_run_id, employee_id, basic_salary, total_allowances, total_deductions, net_salary, status, employee:employees(first_name, last_name, department)`)
      .eq('payroll_run_id', payrollRunId)
      .eq('tenant_id', tenantId);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      payrollRunId: row.payroll_run_id,
      employeeId: row.employee_id,
      basicSalary: Number(row.basic_salary || 0),
      totalAllowances: Number(row.total_allowances || 0),
      totalDeductions: Number(row.total_deductions || 0),
      netSalary: Number(row.net_salary || 0),
      status: row.status,
      employeeName: `${row.employee?.first_name || ''} ${row.employee?.last_name || ''}`.trim()
    })) as Payslip[];
  },

  async markPayrollRunPaid(runId: string): Promise<void> {
    const { tenantId, userId } = await getContext();
    const now = new Date().toISOString();
    await supabase.from(TBL.PAYROLL_RUNS).update({ status: 'PAID', processed_at: now, processed_by: userId }).eq('id', runId).eq('tenant_id', tenantId);
    await supabase.from(TBL.PAYSLIPS).update({ status: 'PAID', processed_by: userId }).eq('payroll_run_id', runId).eq('tenant_id', tenantId);

    // Post accounting entry (debit 5100 Salaries Expense, credit 1001 Cash/Bank)
    try {
      const runs = await this.getPayrollRuns();
      const run = runs.find(r => r.id === runId);
      if (!run) return;

      const accExpense = await accountingService.getAccountByCode('5100');
      const accCash = await accountingService.getAccountByCode('1002') || await accountingService.getAccountByCode('1001');
      if (!accExpense || !accCash) return;

      await accountingService.createJournalEntry({
        date: new Date().toISOString(),
        description: `Payroll ${run.month}/${run.year}`,
        reference: `PAYROLL-${run.month}-${run.year}`,
        status: JournalStatus.POSTED,
        lines: [
          { accountId: accExpense.id, debit: run.totalAmount, credit: 0, description: 'Payroll expense' },
          { accountId: accCash.id, debit: 0, credit: run.totalAmount, description: 'Payroll payment' }
        ]
      });
    } catch (err) {
      console.warn('Failed to post payroll JE', err);
    }
  }
};
