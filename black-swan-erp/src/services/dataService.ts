import { getTenantIdFromSession } from '../lib/supabase';
import { approvalsRepository } from '../repositories/approvalsRepository';
import { disbursementsRepository } from '../repositories/disbursementsRepository';
import {
    AccessRequest,
    ApprovalRequest,
    ApprovalType,
    CapitalEventType,
    CompanySettings,
    Contract,
    ContractParty,
    ContractStatus,
    Customer,
    DeliveryNote,
    Disbursement,
    Employee,
    Expense,
    Invoice,
    InvoiceStatus,
    InvoiceType,
    InventoryItem,
    InventoryMovement,
    InventoryMovementType,
    InventoryTransactionType,
    JournalEntry,
    JournalStatus,
    LedgerEntry,
    LeaveRecord,
    EquityTransactionType,
    PaymentAmountType,
    PaymentStatus,
    PaymentTerm,
    PaymentTrigger,
    Product,
    Project,
    ProjectStageStatus,
    Quotation,
    Receipt,
    Role,
    Supplier,
    SupplierType,
    TaxInvoice,
    TaxInvoiceItem,
} from '../types';
import { TenantError } from '../utils/tenantGuard';
import { accountingService } from './supabase/accounting.service';
import * as dbCore from './supabase/core';
import { supabase } from './supabaseClient';

// Table Constants (Supabase uses snake_case usually, assuming table names)
const TBL = {
  CONTRACTS: 'contracts',
  CONTRACT_ITEMS: 'contract_items',
  CONTRACT_MILESTONES: 'contract_milestones',
  PROJECTS: 'projects',
  PROJECT_STAGES: 'project_stages',
  EMPLOYEES: 'employees',
  INVENTORY: 'inventory_stock',
  INVENTORY_MOVEMENTS: 'inventory_movements',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  DISBURSEMENTS: 'disbursements',
  APPROVALS: 'approvals',
  LEDGER: 'journal_entries',
  JOURNALS: 'journal_entries',
  JOURNAL_LINES: 'journal_lines',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  RECEIPTS: 'receipts',
  PRODUCTS: 'products',
  PRODUCT_SIZES: 'product_sizes',
  QUOTATIONS: 'quotations',
  QUOTATION_ITEMS: 'quotation_items',
  ORDERS: 'orders',
  ORDER_ITEMS: 'order_items',
  SETTINGS: 'settings',
  ACCOUNTS: 'coa_accounts'
};

type PartnerShareRow = {
    partner_id: string;
    profile_id: string;
    partner_name: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    joined_at: string | null;
    exited_at: string | null;
    shares: number;
    tenant_id: string;
};

type CapTableRow = {
    partnerId: string;
    profileId: string;
    partnerName: string;
    shares: number;
    ownershipPct: number;
    currentValue: number;
    status: 'ACTIVE' | 'INACTIVE';
    joinedAt: string | null;
    exitedAt: string | null;
};

type CapTableSummary = {
    netProfit: number;
    valuation: number;
    totalShares: number;
    pricePerShare: number;
    currency: string;
};

type CapTablePayload = {
    rows: CapTableRow[];
    summary: CapTableSummary;
    canManage: boolean;
    restrictedToProfileId?: string | null;
};

type CapitalEventInput = {
    eventType: CapitalEventType;
    amount: number;
    valuation: number;
    notes?: string;
};

type EquityTransactionInput = {
    transactionType: EquityTransactionType;
    fromPartnerId?: string;
    toPartnerId?: string;
    shares: number;
    pricePerShare: number;
    valuation: number;
};

type EquityPreviewResult = {
    rows: CapTableRow[];
    summary: CapTableSummary;
};

type PartnerAuditEvent = {
    eventTime: string;
    eventType: 'EQUITY' | 'CAPITAL' | 'APPROVAL' | 'AUDIT';
    description: string;
    referenceType: string;
    referenceId: string | null;
    performedBy: string | null;
    approvalStatus: string | null;
    partnerId: string | null;
};

type SupabaseUserLite = {
    id: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    roles?: string[];
};

// Helper to map DB rows (snake_case) to Product (camelCase)
const mapProduct = (row: any): Product => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  qualityLevel: row.quality_level || row.qualityLevel,
  skuPrefix: row.sku_prefix || row.skuPrefix,
  sku: row.sku,
  baseUnit: row.base_unit || row.baseUnit,
  avgCost: row.avg_cost || row.avgCost,
  sizes: (row.sizes || []).map((s: any) => ({
    id: s.id,
    size: s.size,
    cost: s.cost,
    price: s.price
  })),
  notes: row.notes ?? row.description ?? undefined,
  price: row.sales_price ?? row.price,
  image: row.image_url ?? row.image,
  rating: row.rating,
  availability: row.availability
});

const mapContractRow = (row: any): Contract => {
  const partyB = row.party_b || row.partyB || {};
  const items = (row.items || row.contract_items || []).map((i: any) => ({
    id: i.id,
    productName: i.product_name || i.productName || '',
    quantity: Number(i.quantity || 0),
    unitPrice: Number(i.unit_price || i.unitPrice || 0),
    productId: i.product_id || i.productId,
    sizeId: i.size_id || i.sizeId
  }));
  const milestones = (row.milestones || row.contract_milestones || []).map((m: any) => {
    const percentage = Number(m.percentage ?? m.value ?? 0);
    const amount = Number(m.amount ?? 0);
    return {
      id: m.id,
      contractId: m.contract_id || m.contractId || row.id,
      name: m.title || m.name || '',
      amountType: percentage ? PaymentAmountType.PERCENTAGE : PaymentAmountType.FIXED,
      value: percentage,
      amount,
      dueDate: m.due_date || m.dueDate,
      trigger: PaymentTrigger.CUSTOM,
      status: (m.status as PaymentStatus) || PaymentStatus.PENDING,
      notes: m.notes || undefined,
      paidAt: m.paid_at || m.paidAt
    } as PaymentTerm;
  });
  const paymentTerms = milestones.length > 0 ? milestones : (row.payment_terms || row.paymentTerms || []);

  return {
    id: row.id,
    contractNumber: row.contract_number || row.contractNumber || '',
    clientId: row.client_id || row.clientId || '',
    clientName: row.client_name || row.clientName || partyB.legalName || partyB.representativeName || '',
    title: row.title || '',
    totalValue: Number(row.total_value || row.totalValue || 0),
    status: row.status as ContractStatus,
    startDate: row.start_date || row.startDate || '',
    deliveryDate: row.delivery_date || row.deliveryDate || '',
    items,
    partyA: row.party_a || row.partyA,
    partyB: row.party_b || row.partyB,
    paymentTerms,
    currency: row.currency || 'SAR',
    payment1Status: (row.payment1Status as PaymentStatus) || (paymentTerms[0]?.status as PaymentStatus) || PaymentStatus.PENDING,
    payment2Status: (row.payment2Status as PaymentStatus) || (paymentTerms[1]?.status as PaymentStatus) || PaymentStatus.PENDING,
    createdAt: row.created_at || row.createdAt || '',
    ownerId: row.created_by || row.ownerId || '',
    notes: row.notes,
    clientSignature: row.client_signature || row.clientSignature,
    ceoSignature: row.ceo_signature || row.ceoSignature
  };
};

const mapQuotationRow = (row: any): Quotation => {
  const details = row.customer_details || row.customerDetails || {};
  const items = (row.items || row.quotation_items || []).map((i: any) => {
    const quantity = Number(i.quantity || 0);
    const unitPrice = Number(i.unit_price || i.unitPrice || 0);
    return {
      id: i.id,
      description: i.description || '',
      quantity,
      unitPrice,
      total: Number(i.total || i.amount || quantity * unitPrice),
      productId: i.product_id || i.productId,
      sizeId: i.size_id || i.sizeId
    };
  });

  return {
    id: row.id,
    quotationNumber: row.quotation_number || row.quotationNumber || '',
    customerId: row.customer_id || row.customerId,
    customerName: details.name || row.customer_name || row.customerName || '',
    customerPhone: details.phone || row.customer_phone || row.customerPhone,
    customerEmail: details.email || row.customer_email || row.customerEmail,
    customerCompany: details.company || row.customer_company || row.customerCompany,
    customerAddress: details.address || row.customer_address || row.customerAddress,
    customerVat: details.vatNumber || row.customer_vat || row.customerVat,
    date: row.date || '',
    expiryDate: row.expiry_date || row.expiryDate || '',
    items,
    subtotal: Number(row.subtotal || row.subtotal_amount || row.subtotalAmount || 0),
    vatAmount: Number(row.vat_amount || row.vatAmount || 0),
    totalAmount: Number(row.total_amount || row.totalAmount || 0),
    status: row.status as any,
    notes: row.notes
  };
};

const mapProjectRow = (row: any): Project => ({
  id: row.id,
  contractId: row.contract_id || row.contractId || '',
  contractNumber: row.contract_number || row.contractNumber || '',
  name: row.name || '',
  status: row.status,
  progress: Number(row.progress || 0),
  stages: (row.stages || row.project_stages || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    assignedTo: s.assigned_to || s.assignedTo,
    startDate: s.start_date || s.startDate,
    endDate: s.end_date || s.endDate,
    notes: s.notes
  }))
});

const mapTaxInvoiceRow = (row: any): TaxInvoice => {
  const buyer = row.buyer || row.customer || {};
  const seller = row.seller || {
    legalName: 'Black Swan Co.',
    vatNumber: '300000000000003',
    address: 'Riyadh, SA',
    country: 'SA',
    crNumber: '1010000000',
    logoUrl: ''
  };
  const items = (row.items || row.invoice_items || []).map((i: any) => {
    const quantity = Number(i.quantity || 0);
    const unitPrice = Number(i.unit_price || i.unitPrice || 0);
    const netAmount = Number(i.net_amount || i.netAmount || quantity * unitPrice);
    const vatRate = Number(i.vat_rate || i.vatRate || 0.15);
    const vatAmount = Number(i.vat_amount || i.vatAmount || netAmount * vatRate);
    const totalAmount = Number(i.total_amount || i.totalAmount || netAmount + vatAmount);
    return {
      description: i.description || '',
      quantity,
      unitPrice,
      netAmount,
      vatRate,
      vatAmount,
      totalAmount
    };
  });

  return {
    id: row.id,
    invoiceNumber: row.invoice_number || row.invoiceNumber || '',
    type: row.type,
    issueDate: row.issue_date || row.issueDate || '',
    dueDate: row.due_date || row.dueDate,
    seller,
    buyer: {
      name: buyer.name || buyer.legalName || buyer.company_name || buyer.companyName || '',
      vatNumber: buyer.vat_number || buyer.vatNumber,
      address: buyer.address
    },
    items,
    subtotal: Number(row.subtotal || row.subtotalAmount || 0),
    vatAmount: Number(row.vat_amount || row.vatAmount || 0),
    totalAmount: Number(row.total_amount || row.totalAmount || 0),
    currency: row.currency || 'SAR',
    status: row.status,
    zatcaUuid: row.zatca_uuid || row.zatcaUuid,
    qrCodeData: row.qr_code || row.qrCodeData,
    createdBy: row.created_by || 'system',
    updatedAt: row.updated_at || row.updatedAt
  } as TaxInvoice;
};

class DataService {

  /**
   * Resolves the current execution context (User & Tenant).
   * Prevents repeated auth calls in loops.
   */
  private async _getContext() {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session;
      const user = session?.user as SupabaseUserLite | undefined;
        if (!user) throw new TenantError('No active session');

        const tenantId = await getTenantIdFromSession();
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_roles')
          .select('role:roles(name)')
          .eq('user_id', user.id)
          .eq('tenant_id', tenantId);
        if (rolesError) throw rolesError;

        const roles = (rolesData || [])
          .map((row: any) => row.role?.name)
          .filter(Boolean) as string[];

        return { userId: user.id, tenantId, user: { ...user, roles } };
  }

  private _extractRoles(user: SupabaseUserLite | null | undefined): string[] {
      const roles = (user?.roles || []).map((r) => String(r));
      return Array.from(new Set(roles));
  }

  private _isCeo(user: SupabaseUserLite | null | undefined): boolean {
      const roles = this._extractRoles(user);
      return roles.includes(Role.CEO) || roles.includes(Role.SUPER_ADMIN);
  }

  private _isPartner(user: SupabaseUserLite | null | undefined): boolean {
      const roles = this._extractRoles(user);
      return roles.includes(Role.PARTNER);
  }

  private _assertCeo(user: SupabaseUserLite | null | undefined) {
      if (!this._isCeo(user)) {
          throw new TenantError('Only CEO can perform this action');
      }
  }

  private async _getPartnerIdForUser(userId: string, tenantId: string): Promise<string | null> {
      const { data, error } = await supabase
        .from('partners')
        .select('id')
        .eq('profile_id', userId)
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return data?.id || null;
  }

  // --- EMPLOYEES ---
  async getEmployees(): Promise<Employee[]> {
    const { tenantId } = await this._getContext();
    
    const { data, error } = await supabase
      .from(TBL.EMPLOYEES)
      .select(`*, salary_structures(*)`)
      .eq('tenant_id', tenantId); // Enforce Multi-tenancy

    if (error) throw error;
    
    return (data || []).map((row: any) => {
        const latestSalary = (row.salary_structures || []).sort((a:any, b:any) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
        
        return {
            id: row.id,
            name: `${row.first_name} ${row.last_name}`.trim(),
            role: row.position,
            systemRole: row.system_role,
            department: row.department,
            status: row.status,
            joinDate: row.join_date,
            basicSalary: latestSalary?.basic_salary || row.salary || 0,
            housingAllowance: latestSalary?.housing_allowance || 0,
            transportAllowance: latestSalary?.transport_allowance || 0,
            otherAllowances: latestSalary?.other_allowances || 0,
            annualLeaveBalance: 21,
            nationality: row.nationality || '',
            nationalId: row.national_id,
            email: row.email,
            phone: row.phone,
            iban: row.iban,
            contractDurationDays: row.contract_duration_days,
            iqamaExpiry: row.iqama_expiry,
            passportExpiry: row.passport_expiry,
            adminNotes: row.admin_notes,
            avatarUrl: row.avatar_url,
            disabled: row.disabled
        };
    });
  }
  
  async addEmployee(emp: Employee): Promise<void> {
    const { tenantId } = await this._getContext();
    const nameParts = emp.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';

    const employeePayload = {
        first_name: firstName,
        last_name: lastName,
        email: emp.email,
        phone: emp.phone,
        position: emp.role,
        department: emp.department,
        salary: emp.basicSalary,
        join_date: emp.joinDate,
        status: emp.status,
        iban: emp.iban,
        national_id: emp.nationalId,
        contract_type: emp.contractType,
        system_role: emp.systemRole,
        contract_duration_days: emp.contractDurationDays,
        iqama_expiry: emp.iqamaExpiry,
        passport_expiry: emp.passportExpiry,
        nationality: emp.nationality,
        admin_notes: emp.adminNotes,
        avatar_url: emp.avatarUrl,
        disabled: emp.disabled
    };

    const salaryPayload = {
        basic_salary: emp.basicSalary || 0,
        housing_allowance: emp.housingAllowance || 0,
        transport_allowance: emp.transportAllowance || 0,
        other_allowances: emp.otherAllowances || 0,
        effective_date: emp.joinDate || new Date().toISOString()
    };

    const { error } = await supabase.rpc('create_employee', {
      p_employee: employeePayload,
      p_salary: salaryPayload,
      p_tenant_id: tenantId
    });

    if (error) throw error;
  }

  async updateEmployee(id: string, emp: Partial<Employee>): Promise<void> {
    // Updates are less critical for transactional integrity than creates, 
    // but ideally should also be RPCs if complex. Keeping simple for now as per prompt focus on "Writes" (Inserts usually).
    // However, we must enforce tenant_id check implicitly via RLS.
    
    const { tenantId } = await this._getContext();
    const dbUpdates: any = {};
    if (emp.name) {
        const parts = emp.name.split(' ');
        dbUpdates.first_name = parts[0];
        dbUpdates.last_name = parts.slice(1).join(' ');
    }
    if (emp.email) dbUpdates.email = emp.email;
    if (emp.phone) dbUpdates.phone = emp.phone;
    if (emp.role) dbUpdates.position = emp.role;
    if (emp.department) dbUpdates.department = emp.department;
    if (emp.basicSalary !== undefined) dbUpdates.salary = emp.basicSalary;
    if (emp.joinDate) dbUpdates.join_date = emp.joinDate;
    if (emp.status) dbUpdates.status = emp.status;
    if (emp.iban) dbUpdates.iban = emp.iban;
    if (emp.nationalId) dbUpdates.national_id = emp.nationalId;
    if (emp.nationality !== undefined) dbUpdates.nationality = emp.nationality;
    if (emp.systemRole) dbUpdates.system_role = emp.systemRole;
    if (emp.contractDurationDays !== undefined) dbUpdates.contract_duration_days = emp.contractDurationDays;
    if (emp.iqamaExpiry !== undefined) dbUpdates.iqama_expiry = emp.iqamaExpiry;
    if (emp.passportExpiry !== undefined) dbUpdates.passport_expiry = emp.passportExpiry;
    if (emp.adminNotes !== undefined) dbUpdates.admin_notes = emp.adminNotes;
    if (emp.avatarUrl !== undefined) dbUpdates.avatar_url = emp.avatarUrl;
    if (emp.disabled !== undefined) dbUpdates.disabled = emp.disabled;

    if (Object.keys(dbUpdates).length > 0) {
        await supabase.from(TBL.EMPLOYEES).update(dbUpdates).eq('id', id).eq('tenant_id', tenantId);
    }

    // Salary updates logic remains similar but should ideally be an RPC if we want history tracking
    // For now, we assume direct update is acceptable for simple fields
  }

    async addSalaryStructure(employeeId: string, salary: {
        basicSalary: number;
        housingAllowance?: number;
        transportAllowance?: number;
        otherAllowances?: number;
        gosiDeductionPercent?: number;
        effectiveDate?: string;
    }): Promise<void> {
        const { tenantId } = await this._getContext();
        const payload = {
                employee_id: employeeId,
                basic_salary: salary.basicSalary,
                housing_allowance: salary.housingAllowance ?? 0,
                transport_allowance: salary.transportAllowance ?? 0,
                other_allowances: salary.otherAllowances ?? 0,
                gosi_deduction_percent: salary.gosiDeductionPercent ?? 0,
                effective_date: salary.effectiveDate || new Date().toISOString(),
                tenant_id: tenantId
        };

        await supabase.from('salary_structures').insert(payload);
    }

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const { tenantId } = await this._getContext();
    const { data: emp, error } = await supabase
      .from(TBL.EMPLOYEES)
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single();
      
    if (error || !emp) return undefined;

    const { data: salary } = await supabase
      .from('salary_structures')
      .select('*')
      .eq('employee_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return {
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`.trim(),
        role: emp.position,
        systemRole: emp.system_role,
        department: emp.department,
        status: emp.status,
        joinDate: emp.join_date,
        basicSalary: salary?.basic_salary || emp.salary || 0,
        housingAllowance: salary?.housing_allowance || 0,
        transportAllowance: salary?.transport_allowance || 0,
        otherAllowances: salary?.other_allowances || 0,
        annualLeaveBalance: 21,
        nationality: emp.nationality || '',
        nationalId: emp.national_id,
        email: emp.email,
        phone: emp.phone,
        iban: emp.iban,
        contractDurationDays: emp.contract_duration_days,
        iqamaExpiry: emp.iqama_expiry,
        passportExpiry: emp.passport_expiry,
        adminNotes: emp.admin_notes,
        avatarUrl: emp.avatar_url,
        disabled: emp.disabled
    };
  }

  // --- PRODUCTS ---
  async getProducts(): Promise<Product[]> {
    const { tenantId } = await this._getContext();
    const { data, error } = await supabase
        .from(TBL.PRODUCTS)
        .select(`*, sizes:${TBL.PRODUCT_SIZES}(*)`)
        .eq('tenant_id', tenantId);
    
    if (error) throw error;
    return (data || []).map(mapProduct);
  }

  async addProduct(product: Product): Promise<void> {
    const { tenantId } = await this._getContext();
    const { sizes, ...prodData } = product;

    if (!prodData.name) throw new Error('Product name is required');
    if (!sizes || sizes.length === 0) throw new Error('At least one size is required');
    if (sizes.some((s) => !s.size || s.cost == null || s.price == null)) {
      throw new Error('Invalid size values');
    }
    
    const productPayload = {
        sku: prodData.sku,
        name: prodData.name,
        description: prodData.description ?? prodData.notes,
        category: prodData.category,
        base_unit: prodData.baseUnit,
        sales_price: prodData.price,
        standard_cost: prodData.avgCost,
        avg_cost: prodData.avgCost,
        image_url: prodData.image,
        quality_level: prodData.qualityLevel,
        sku_prefix: prodData.skuPrefix
    };

    const sizesPayload = (sizes || []).map(s => ({
        size: s.size,
        cost: s.cost,
        price: s.price
    }));

    const { error } = await supabase.rpc('create_product', {
      p_product: productPayload,
      p_sizes: sizesPayload,
      p_tenant_id: tenantId
    });
    
    if (error) throw error;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
    const { tenantId } = await this._getContext();
    const { sizes, ...prodData } = updates;

    if (prodData.name === '') throw new Error('Product name is required');
    if (Array.isArray(sizes)) {
      if (sizes.length === 0) throw new Error('At least one size is required');
      if (sizes.some((s) => !s.size || s.cost == null || s.price == null)) {
        throw new Error('Invalid size values');
      }
    }

    const productPayload = {
      sku: prodData.sku,
      name: prodData.name,
      description: prodData.description ?? prodData.notes,
      category: prodData.category,
      base_unit: prodData.baseUnit,
      sales_price: prodData.price,
      standard_cost: prodData.avgCost,
      avg_cost: prodData.avgCost,
      image_url: prodData.image,
      quality_level: prodData.qualityLevel,
      sku_prefix: prodData.skuPrefix,
    };

    const cleanedProduct = Object.fromEntries(
      Object.entries(productPayload).filter(([, value]) => value !== undefined)
    );

    const sizesPayload = Array.isArray(sizes)
      ? sizes.map((s) => ({
          size: s.size,
          cost: s.cost,
          price: s.price,
        }))
      : null;

    const { error } = await supabase.rpc('update_product_with_sizes', {
      p_product_id: id,
      p_product: cleanedProduct,
      p_sizes: sizesPayload,
      p_tenant_id: tenantId,
    });

    if (error) throw error;
  }

  async deleteProduct(id: string): Promise<void> {
    const { tenantId } = await this._getContext();
    await supabase.from(TBL.PRODUCTS).delete().eq('id', id).eq('tenant_id', tenantId);
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const { tenantId } = await this._getContext();
    const { data, error } = await supabase
        .from(TBL.PRODUCTS)
        .select(`*, sizes:${TBL.PRODUCT_SIZES}(*)`)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
    if (error) return undefined;
    return mapProduct(data);
  }

  // --- CONTRACTS ---
  async getContracts(pageSize = 20, lastId?: string): Promise<dbCore.PaginatedResult<Contract>> {
    const { tenantId } = await this._getContext();
    // Using dbCore but injecting tenant filter if possible, or raw query
    // Since dbCore is a wrapper, we might need to modify it or use raw query here for strict tenant enforcement
    let query = supabase
      .from(TBL.CONTRACTS)
      .select(`*, items:${TBL.CONTRACT_ITEMS}(*), milestones:${TBL.CONTRACT_MILESTONES}(*)`)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(pageSize);

    if (lastId) query = query.lt('id', lastId);
    
        const { data, error } = await query;
        if (error) throw error;

        const rows: any[] = Array.isArray(data) ? data : [];

        return {
            items: rows.map(mapContractRow),
            hasMore: rows.length === pageSize,
            lastId: rows.length > 0 ? rows[rows.length - 1].id : undefined
        };
  }

  async addContract(contract: Contract): Promise<Contract> {
    const { items, paymentTerms, partyA, partyB, ...rest } = contract;
    await this._getContext();
    
    const contractPayload = {
        contract_number: contract.contractNumber,
        title: contract.title,
        client_id: contract.clientId,
        status: contract.status,
        total_value: contract.totalValue,
        start_date: contract.startDate,
        delivery_date: contract.deliveryDate,
        notes: contract.notes,
        created_by: userId, // Use resolved user ID
        party_a: partyA,
        party_b: partyB,
        currency: contract.currency
    };

    const itemsPayload = (items || []).map(i => ({
        product_name: i.productName,
        quantity: i.quantity,
        unit_price: i.unitPrice
    }));

    const milestonesPayload = (paymentTerms || []).map(m => ({
        title: m.name,
        amount: m.amount,
        percentage: m.value,
        due_date: m.dueDate,
        status: m.status,
        paid_at: m.paidAt
    }));

    const { data, error } = await supabase.rpc('create_contract', {
      p_contract: contractPayload,
      p_items: itemsPayload,
      p_milestones: milestonesPayload,
      p_tenant_id: tenantId
    });

    if (error) throw error;

    if (contract.partyB) {
        await this.autoCreateOrUpdateCustomerFromContract(contract.partyB);
    }

    return { ...contract, id: (data as any).id };
  }

  async updateContractStatus(id: string, status: ContractStatus): Promise<void> {
    const { tenantId } = await this._getContext();
    await supabase.from(TBL.CONTRACTS).update({ status }).eq('id', id).eq('tenant_id', tenantId);
    if (status === ContractStatus.IN_PRODUCTION) {
        await this.ensureProjectExists(id);
    }
  }

  async markContractSignedByClient(id: string, signatureData: string): Promise<void> {
    const { tenantId } = await this._getContext();
    await supabase.from(TBL.CONTRACTS).update({ 
        client_signature: signatureData, 
        status: ContractStatus.SIGNED_CLIENT 
    }).eq('id', id).eq('tenant_id', tenantId);
    
    // Create Approval via RPC or direct insert (Approvals are simple)
    // ...
  }

  // --- PAYMENTS ---
  async payMilestone(milestoneId: string, contractId: string, amount: number, method: string): Promise<void> {
      await this._getContext();
      const contract = await this.getContractById(contractId); // Helper needed
      if (!contract) return;

      const receiptNumber = `RCPT-${Date.now().toString().substr(-6)}`;
      
      const { error } = await supabase.rpc('pay_milestone', {
        p_milestone_id: milestoneId,
        p_contract_id: contractId,
        p_amount: amount,
        p_method: method,
        p_user_id: userId,
        p_receipt_number: receiptNumber,
        p_contract_title: contract.title,
        p_client_name: contract.clientName,
        p_notes: `Payment for milestone`,
        p_tenant_id: tenantId
      });

      if (error) throw error;
  }

  private async getContractById(id: string): Promise<Contract | null> {
      const { tenantId } = await this._getContext();
      const { data } = await supabase.from(TBL.CONTRACTS)
        .select(`*, items:${TBL.CONTRACT_ITEMS}(*), milestones:${TBL.CONTRACT_MILESTONES}(*)`).eq('id', id).eq('tenant_id', tenantId).single();
      return data ? mapContractRow(data) : null;
  }

  // --- PROJECTS ---
  async getProjects(): Promise<Project[]> {
    const { tenantId } = await this._getContext();
    const { data } = await supabase
        .from(TBL.PROJECTS)
        .select(`*, stages:${TBL.PROJECT_STAGES}(*)`)
        .eq('tenant_id', tenantId);
    
    return (data || []).map(mapProjectRow);
  }

  private async ensureProjectExists(contractId: string) {
    // Logic remains similar, but ensure tenant_id is respected
    // ...
  }

  async updateStageStatus(projectId: string, stageId: string, status: ProjectStageStatus): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase.from(TBL.PROJECT_STAGES).update({ status }).eq('id', stageId).eq('tenant_id', tenantId);
      // ... progress calculation logic ...
  }

  // --- INVENTORY ---
  async getInventory(): Promise<InventoryItem[]> {
    const { tenantId } = await this._getContext();
    const { data, error } = await supabase
        .from(TBL.INVENTORY)
        .select(`*, product:${TBL.PRODUCTS}(name, sku, base_unit, standard_cost)`)
        .eq('tenant_id', tenantId);
    
    if (error) throw error;
    
    return (data || []).map((row: any) => ({
        id: row.id,
        code: row.product?.sku || '',
        name: row.product?.name || 'Unknown',
        type: 'Product',
        quantity: row.quantity,
        unit: row.product?.base_unit || 'pcs',
        reorderLevel: row.reorder_level,
        cost: row.product?.standard_cost || 0
    }));
  }

  async updateInventory(stockId: string, quantity: number, type: InventoryTransactionType): Promise<void> {
        await this._getContext();
    
    // We need product_id and warehouse_id. 
    // The RPC takes product_id and warehouse_id. 
    // We must fetch them from stockId first.
    const { data: stock } = await supabase.from(TBL.INVENTORY).select('product_id, warehouse_id').eq('id', stockId).single();
    if (!stock) return;

    const moveType = type === 'IN' ? InventoryMovementType.RECEIPT : InventoryMovementType.ISSUE;
    const qty = type === 'IN' ? quantity : -quantity; // RPC handles sign? No, RPC takes absolute qty and type?
    // Let's check RPC: "UPDATE ... SET quantity = quantity + p_quantity". So we need to pass signed quantity.
    // Wait, RPC definition: "p_quantity numeric". "SET quantity = quantity + p_quantity".
    // So if ISSUE, pass negative.
    
    const { error } = await supabase.rpc('process_inventory_movement', {
        p_product_id: stock.product_id,
        p_warehouse_id: stock.warehouse_id,
        p_type: moveType,
        p_quantity: type === 'IN' ? quantity : -quantity,
        p_user_id: userId,
        p_tenant_id: tenantId
    });
    
    if (error) throw error;
  }

  // --- QUOTATIONS ---
  async getQuotations(): Promise<Quotation[]> {
    const { tenantId } = await this._getContext();
    const { data, error } = await supabase
        .from(TBL.QUOTATIONS)
        .select(`*, items:${TBL.QUOTATION_ITEMS}(*)`)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []).map(mapQuotationRow);
  }

  async getQuotationById(id: string): Promise<Quotation | null> {
    const { tenantId } = await this._getContext();
    const { data, error } = await supabase
        .from(TBL.QUOTATIONS)
        .select(`*, items:${TBL.QUOTATION_ITEMS}(*)`)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
    
    if (error) return null;
    return data ? mapQuotationRow(data) : null;
  }

  async addQuotation(quotation: Quotation): Promise<void> {
    const { tenantId } = await this._getContext();
    const { items, ...qData } = quotation;
    
    const quotationPayload = {
        quotation_number: quotation.quotationNumber,
        customer_id: quotation.customerId,
        date: quotation.date,
        expiry_date: quotation.expiryDate,
        status: quotation.status,
        subtotal: quotation.subtotal,
        vat_amount: quotation.vatAmount,
        total_amount: quotation.totalAmount,
        notes: quotation.notes,
        customer_details: {
            name: quotation.customerName,
            company: quotation.customerCompany,
            email: quotation.customerEmail,
            phone: quotation.customerPhone,
            address: quotation.customerAddress,
            vatNumber: quotation.customerVat
        }
    };

    const itemsPayload = (items || []).map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        vat_rate: 0.15
    }));

    const { error } = await supabase.rpc('create_quotation', {
        p_quotation: quotationPayload,
        p_items: itemsPayload,
        p_tenant_id: tenantId
    });
    
    if (error) throw error;
    
    await this.autoCreateOrUpdateCustomerFromQuotation(quotation);
  }

  async convertQuotationToInvoice(quotationId: string): Promise<TaxInvoice | null> {
      const q = await this.getQuotationById(quotationId);
      if (!q) return null;

      const invoiceData: Partial<TaxInvoice> & { customerId?: string } = {
          invoiceNumber: `INV-${q.quotationNumber.replace('Q-', '')}`,
          issueDate: new Date().toISOString(),
          status: InvoiceStatus.DRAFT,
          customerId: (q as any).customerId || (q as any).customer_id,
          items: q.items?.map(i => ({
              description: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              netAmount: i.quantity * i.unitPrice,
              vatRate: 0.15,
              vatAmount: (i.quantity * i.unitPrice) * 0.15,
              totalAmount: (i.quantity * i.unitPrice) * 1.15
          })),
          subtotal: (q as any).subtotal || (q.totalAmount / 1.15),
          vatAmount: (q as any).vatAmount || (q.totalAmount - (q.totalAmount / 1.15)),
          totalAmount: q.totalAmount,
          currency: 'SAR'
      };

      const newInv = await this.createTaxInvoice(invoiceData);
      await supabase.from(TBL.QUOTATIONS).update({ status: 'CONVERTED' }).eq('id', quotationId);

      return newInv;
  }

  // --- DISBURSEMENTS & APPROVALS ---
  async getDisbursements(pageSize = 50, lastId?: string): Promise<dbCore.PaginatedResult<Disbursement>> {
      try {
          const { tenantId } = await this._getContext();
          const rows = await disbursementsRepository.list({ tenantId, pageSize, lastId });
          const items = (rows || []).map((row) => ({
              id: row.id,
              date: row.date,
              category: row.category || 'General',
              amount: Number(row.amount) || 0,
              paymentMethod: (row.payment_method as any) || 'Cash',
              description: row.description || '',
              attachmentUrl: row.attachment_url || undefined,
              approvalStatus: (row.status as any) || 'PENDING',
              approvedBy: row.approved_by || undefined,
              approvedAt: undefined,
              createdBy: undefined,
              contractId: (row as any).contract_id,
              projectId: (row as any).project_id,
              supplierId: (row as any).supplier_id,
              supplierName: (row as any).supplier?.name || undefined,
              contractTitle: (row as any).contract?.title || undefined,
              projectName: (row as any).project?.name || undefined
          } as Disbursement));
          return {
              items,
              hasMore: (rows?.length || 0) === pageSize,
              lastId: items.length > 0 ? items[items.length - 1].id : null
          };
      } catch (err) {
          console.error('getDisbursements', err);
          return { items: [], hasMore: false, lastId: null };
      }
  }

  async addDisbursement(disbursement: Partial<Disbursement>): Promise<void> {
      await this._getContext();
      const amount = disbursement.amount ?? 0;
      const payload = {
          description: disbursement.description || disbursement.category || '',
          amount,
          date: disbursement.date || new Date().toISOString(),
          category: disbursement.category || 'General',
          payment_method: disbursement.paymentMethod || 'Cash',
          status: 'PENDING',
          approved_by: null,
          attachment_url: disbursement.attachmentUrl || null,
          supplier_id: disbursement.supplierId || null,
          contract_id: disbursement.contractId || null,
          project_id: disbursement.projectId || null,
          tenant_id: tenantId
      } as any;

      const inserted = await disbursementsRepository.insert(payload);
      
      await this.createApprovalRequest({
          type: ApprovalType.EXPENSE,
          title: `Expense: ${disbursement.category}`,
          description: `${disbursement.description} (${disbursement.amount})`,
          requesterName: 'System',
          requesterId: userId,
          date: new Date().toISOString(),
          status: 'PENDING',
          relatedEntityId: inserted.id,
          amount,
          priority: 'MEDIUM'
      } as any);
  }

  async approveDisbursement(id: string): Promise<void> {
      const { userId } = await this._getContext();
      await disbursementsRepository.update(id, { status: 'APPROVED', approved_by: userId });
      // Post to Accounting via RPC? Or keep service call?
      // Ideally RPC, but for now keeping service call as it might be complex
      const d = await disbursementsRepository.getById(id);
      if (d) {
          // accountingService.postExpense(d); // Assuming this exists
      }
  }

  async getApprovalRequests(): Promise<ApprovalRequest[]> {
      try {
          const { tenantId } = await this._getContext();
          const rows = await approvalsRepository.list(tenantId);
          return (rows || []).map((row) => {
              const payload = (row.payload as any) || {};
              return {
                  id: row.id,
                  type: (payload.type as ApprovalType) || (row.type as ApprovalType) || (row.target_type as ApprovalType) || ApprovalType.PAYMENT,
                  title: payload.title || row.title || payload.subject || row.target_type || 'Request',
                  description: payload.description || row.description || row.decision_note || '',
                  requesterId: row.requester_id || '',
                  requesterName: row.requester_name || payload.requesterName || '',
                  date: row.created_at,
                  status: (row.status as any) || 'PENDING',
                  relatedEntityId: row.target_id || row.related_entity_id || payload.relatedEntityId,
                  amount: payload.amount ?? row.amount ?? undefined,
                  priority: (payload.priority as any) || (row.priority as any) || 'MEDIUM',
                  approverId: row.decision_by || undefined,
                  approvedAt: row.decision_at || undefined,
                  targetType: row.target_type || undefined,
                  targetId: row.target_id || undefined,
                  decisionBy: row.decision_by || undefined,
                  decisionAt: row.decision_at || undefined,
                  decisionNote: row.decision_note || undefined,
                  payload
              } as ApprovalRequest;
          });
      } catch (err) {
          console.error('getApprovalRequests', err);
          return [];
      }
  }

  async createApprovalRequest(req: ApprovalRequest): Promise<void> {
      const { userId, user, tenantId } = await this._getContext();
      const requesterName = req.requesterName || (user?.user_metadata as any)?.full_name || user?.email || 'System';
      const requesterId = userId || null; // FK requires auth.users id; avoid passing non-auth IDs like employee_id

      const payload = {
          type: req.type,
          title: req.title,
          description: req.description,
          requester_id: requesterId,
          requester_name: requesterName,
          target_type: req.targetType || req.type,
          target_id: req.targetId || req.relatedEntityId || null,
          status: req.status || 'PENDING',
          related_entity_id: req.relatedEntityId || req.targetId || null,
          amount: req.amount || null,
          priority: req.priority || 'MEDIUM',
          decision_by: null,
          decision_at: null,
          decision_note: null,
          tenant_id: tenantId,
          payload: {
              title: req.title,
              description: req.description,
              amount: req.amount,
              priority: req.priority,
              type: req.type,
              relatedEntityId: req.relatedEntityId || req.targetId || null,
              targetType: req.targetType || req.type,
              targetId: req.targetId || req.relatedEntityId || null,
              requesterName,
              requesterId: req.requesterId || null
          }
      };

      await approvalsRepository.insert(payload, tenantId);
  }

  async processApproval(id: string, action: 'APPROVE' | 'REJECT'): Promise<void> {
      await this._getContext();
      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

      await approvalsRepository.update(id, {
          status,
          decision_by: userId,
          decision_at: new Date().toISOString(),
          decision_note: action
      }, tenantId);
      
      if (action === 'APPROVE') {
          const req = await approvalsRepository.getById(id, tenantId);
          if (req) {
              const payload = (req.payload as any) || {};
              const targetId = req.target_id || payload.relatedEntityId;
              const targetType = (payload.type as ApprovalType) || (req.target_type as ApprovalType);
              if (targetType === ApprovalType.EXPENSE && targetId) {
                  await this.approveDisbursement(targetId);
              } else if (targetType === ApprovalType.INVOICE && targetId) {
                  await this.approveInvoice(targetId);
              }
          }
      }
  }

  // --- ACCOUNTING ---
  async getLedgerEntries(): Promise<dbCore.PaginatedResult<JournalEntry>> {
      const items = await accountingService.getJournalEntries();
      return { 
          items, 
          hasMore: false,
          lastId: items.length > 0 ? items[items.length - 1].id : null
      };
  }

  async createJournalEntry(entry: Partial<JournalEntry>): Promise<void> {
      const { lines, ...jeData } = entry;
      await this._getContext();
      
      const entryPayload = {
          entry_number: jeData.entryNumber || `JE-${Date.now()}`,
          date: jeData.date,
          reference: jeData.reference,
          description: jeData.description,
          status: jeData.status || 'DRAFT'
      };

      const linesPayload = (lines || []).map(l => ({
          account_id: l.accountId, // Or account_code if we change frontend
          cost_center_id: l.costCenterId,
          description: l.description,
          debit: l.debit,
          credit: l.credit
      }));

      const { error } = await supabase.rpc('create_journal_entry_secure', {
          p_entry: entryPayload,
          p_lines: linesPayload
      });
      
      if (error) throw error;
  }

  // --- ZATCA INVOICES ---
  async getTaxInvoices(pageSize = 20, lastId?: string): Promise<dbCore.PaginatedResult<TaxInvoice>> {
    const { tenantId } = await this._getContext();
    let query = supabase
      .from(TBL.INVOICES)
      .select(`*, customer:customers(*)`)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(pageSize);
    
    if (lastId) {
        query = query.lt('id', lastId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const rows = data || [];
    const items = rows.map((row: any) => mapTaxInvoiceRow(row));
    
    return { 
        items: items as TaxInvoice[], 
        hasMore: rows.length === pageSize, 
        lastId: items.length > 0 ? items[items.length - 1].id : undefined 
    };
  }

  async getTaxInvoiceById(id: string): Promise<TaxInvoice | null> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase
        .from(TBL.INVOICES)
        .select(`*, items:${TBL.INVOICE_ITEMS}(*), customer:customers(*)`)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();
      
      if (error) return null;
      return data ? mapTaxInvoiceRow(data) : null;
  }

  async createTaxInvoice(invoiceInput: Partial<TaxInvoice> & { customerId?: string }): Promise<TaxInvoice> {
    const { tenantId } = await this._getContext();
    const { items, ...invData } = invoiceInput;
    
    const invoicePayload = {
        invoice_number: invData.invoiceNumber || `INV-${Date.now()}`,
        type: invData.type,
        customer_id: (invData as any).customerId,
        issue_date: new Date().toISOString(),
        due_date: invData.dueDate,
        status: InvoiceStatus.DRAFT,
        subtotal: invData.subtotal,
        vat_amount: invData.vatAmount,
        total_amount: invData.totalAmount
    };

    const itemsPayload = (items || []).map(i => ({
        description: i.description,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        vat_rate: i.vatRate || 0.15
    }));

    const { data, error } = await supabase.rpc('create_invoice', {
        p_invoice: invoicePayload,
        p_items: itemsPayload,
        p_tenant_id: tenantId
    });
    
    if (error) throw error;
    
    return { ...invoiceInput, id: (data as any).id } as TaxInvoice;
  }

  async approveInvoice(id: string): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase.from(TBL.INVOICES).update({ status: InvoiceStatus.APPROVED }).eq('id', id).eq('tenant_id', tenantId);
  }

  async postInvoice(id: string): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase.from(TBL.INVOICES).update({ status: InvoiceStatus.POSTED }).eq('id', id).eq('tenant_id', tenantId);
      // Trigger accounting post via RPC or service
  }

  async submitToZatca(id: string): Promise<void> {
      await this.approveInvoice(id); 
  }

  // --- PARTIES ---
  async getCustomers(): Promise<Customer[]> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase.from(TBL.CUSTOMERS).select('*').eq('tenant_id', tenantId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          company: row.company_name,
          email: row.email,
          phone: row.phone,
          vatNumber: row.vat_number,
          address: row.address,
          notes: row.notes
      }));
  }

  async getCustomerById(id: string): Promise<Customer|undefined> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase.from(TBL.CUSTOMERS).select('*').eq('id', id).eq('tenant_id', tenantId).single();
      if (error) return undefined;
      return {
          id: data.id,
          name: data.name,
          company: data.company_name,
          email: data.email,
          phone: data.phone,
          vatNumber: data.vat_number,
          address: data.address,
          notes: data.notes
      };
  }

  async addCustomer(c: Customer): Promise<void> {
      const { tenantId } = await this._getContext();
      const dbCust = {
          name: c.name,
          company_name: c.company,
          email: c.email,
          phone: c.phone,
          vat_number: c.vatNumber,
          address: c.address,
          notes: c.notes,
          tenant_id: tenantId
      };
      await supabase.from(TBL.CUSTOMERS).insert(dbCust);
  }

  async updateCustomer(id: string, c: Partial<Customer>): Promise<void> {
      const { tenantId } = await this._getContext();
      const dbUpdates: any = {};
      if (c.name !== undefined) dbUpdates.name = c.name;
      if (c.company !== undefined) dbUpdates.company_name = c.company;
      if (c.email !== undefined) dbUpdates.email = c.email;
      if (c.phone !== undefined) dbUpdates.phone = c.phone;
      if (c.vatNumber !== undefined) dbUpdates.vat_number = c.vatNumber;
      if (c.address !== undefined) dbUpdates.address = c.address;
      if (c.notes !== undefined) dbUpdates.notes = c.notes;
      
      if (Object.keys(dbUpdates).length > 0) {
          await supabase.from(TBL.CUSTOMERS).update(dbUpdates).eq('id', id).eq('tenant_id', tenantId);
      }
  }

  async deleteCustomer(id: string): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase.from(TBL.CUSTOMERS).delete().eq('id', id).eq('tenant_id', tenantId);
  }

  async getSuppliers(): Promise<Supplier[]> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase.from(TBL.SUPPLIERS).select('*').eq('tenant_id', tenantId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
          id: row.id,
          name: row.name,
          contactPerson: row.contact_person,
          email: row.email,
          phone: row.phone,
          vatNumber: row.vat_number,
          address: row.address,
          type: row.type,
          notes: row.notes
      }));
  }

  async getSupplierById(id: string): Promise<Supplier|undefined> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase.from(TBL.SUPPLIERS).select('*').eq('id', id).eq('tenant_id', tenantId).single();
      if (error) return undefined;
      return {
          id: data.id,
          name: data.name,
          contactPerson: data.contact_person,
          email: data.email,
          phone: data.phone,
          vatNumber: data.vat_number,
          address: data.address,
          type: data.type,
          notes: data.notes
      };
  }

  async addSupplier(s: Supplier): Promise<void> {
      const { tenantId } = await this._getContext();
      const dbSupp = {
          name: s.name,
          contact_person: s.contactPerson,
          email: s.email,
          phone: s.phone,
          vat_number: s.vatNumber,
          address: s.address,
          type: s.type,
          notes: s.notes,
          cr_number: s.crNumber,
          tenant_id: tenantId
      };
      await supabase.from(TBL.SUPPLIERS).insert(dbSupp);
  }

  async updateSupplier(id: string, s: Partial<Supplier>): Promise<void> {
      const { tenantId } = await this._getContext();
      const dbUpdates: any = {};
      if (s.name !== undefined) dbUpdates.name = s.name;
      if (s.contactPerson !== undefined) dbUpdates.contact_person = s.contactPerson;
      if (s.email !== undefined) dbUpdates.email = s.email;
      if (s.phone !== undefined) dbUpdates.phone = s.phone;
      if (s.vatNumber !== undefined) dbUpdates.vat_number = s.vatNumber;
      if (s.address !== undefined) dbUpdates.address = s.address;
      if (s.type !== undefined) dbUpdates.type = s.type;
      if (s.notes !== undefined) dbUpdates.notes = s.notes;

      if (Object.keys(dbUpdates).length > 0) {
          await supabase.from(TBL.SUPPLIERS).update(dbUpdates).eq('id', id).eq('tenant_id', tenantId);
      }
  }

  async deleteSupplier(id: string): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase.from(TBL.SUPPLIERS).delete().eq('id', id).eq('tenant_id', tenantId);
  }

  // --- SETTINGS ---
  async getCompanySettings(): Promise<CompanySettings> {
      const { tenantId } = await this._getContext();
      const { data } = await supabase.from(TBL.SETTINGS).select('*').eq('tenant_id', tenantId).limit(1).single();
      if (!data) return { legalName: 'New Company', vatNumber: '', crNumber: '', address: '', country: 'SA', logoUrl: '' };
      
      return {
          legalName: data.legal_name,
          vatNumber: data.vat_number,
          crNumber: data.cr_number,
          address: data.address,
          country: 'SA',
          logoUrl: data.logo_url,
          phone: data.phone,
          email: data.email,
          website: data.website,
          bankName: data.bank_name,
          iban: data.iban
      };
  }

  async updateCompanySettings(settings: CompanySettings): Promise<void> {
      const { tenantId } = await this._getContext();
      const { data: existing } = await supabase.from(TBL.SETTINGS).select('id').eq('tenant_id', tenantId).limit(1).single();
      
      const dbSettings = {
          legal_name: settings.legalName,
          vat_number: settings.vatNumber,
          cr_number: settings.crNumber,
          address: settings.address,
          logo_url: settings.logoUrl,
          phone: settings.phone,
          email: settings.email,
          website: settings.website,
          bank_name: settings.bankName,
          iban: settings.iban,
          country: settings.country
      };

      if (existing) {
          await supabase.from(TBL.SETTINGS).update(dbSettings).eq('id', existing.id);
      } else {
          await supabase.from(TBL.SETTINGS).insert({ ...dbSettings, tenant_id: tenantId });
      }
  }

  // --- HELPERS ---
  async autoCreateOrUpdateCustomerFromContract(partyB: ContractParty): Promise<void> {
      if (!partyB.email) return;
      const { data } = await supabase.from(TBL.CUSTOMERS).select('*').eq('email', partyB.email);
      if (!data || data.length === 0) {
          await this.addCustomer({
              id: '', 
              name: partyB.representativeName || partyB.legalName,
              company: partyB.legalName,
              email: partyB.email,
              phone: partyB.phone || '',
              address: partyB.address,
              vatNumber: partyB.vatNumber
          } as Customer);
      }
  }
  
  async autoCreateOrUpdateCustomerFromQuotation(q: Quotation): Promise<void> {
      // similar logic
  }

  // Legacy mappings
  async getReceipts(): Promise<Receipt[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
              .from(TBL.RECEIPTS)
              .select('id, receipt_number, contract_id, contract_title, milestone_id, customer_name, amount, date, payment_method, reference_number, notes, attachment_url')
              .eq('tenant_id', tenantId)
              .order('date', { ascending: false })
              .limit(200);

          if (error) {
              console.error('getReceipts', error);
              return [];
          }

          return (data || []).map((r: any) => ({
              id: r.id,
              receiptNumber: r.receipt_number || r.receiptNumber,
              contractId: r.contract_id || r.contractId || '',
              contractTitle: r.contract_title || r.contractTitle || '',
              milestoneId: r.milestone_id || r.milestoneId,
              customerName: r.customer_name || r.customerName || '',
              amount: Number(r.amount ?? r.total_amount) || 0,
              date: r.date,
              paymentMethod: (r.payment_method || r.paymentMethod || 'Cash') as Receipt['paymentMethod'],
              referenceNumber: r.reference_number || r.referenceNumber,
              notes: r.notes,
              attachmentUrl: r.attachment_url || r.attachmentUrl
          })) as Receipt[];
      } catch (err) {
          console.error('getReceipts', err);
          return [];
      }
  }

  async addReceipt(r: Receipt): Promise<void> {
      const { tenantId } = await this._getContext();
      const payload = {
          receipt_number: r.receiptNumber,
          contract_id: r.contractId || null,
          contract_title: r.contractTitle || null,
          milestone_id: r.milestoneId || null,
          customer_name: r.customerName,
          amount: r.amount,
          date: r.date || new Date().toISOString(),
          payment_method: r.paymentMethod,
          reference_number: r.referenceNumber || null,
          notes: r.notes || null,
          attachment_url: r.attachmentUrl || null,
          tenant_id: tenantId
      };

      const { error } = await supabase.from(TBL.RECEIPTS).insert(payload);
      if (error) throw error;
  }

  async getInvoices(): Promise<Invoice[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
              .from(TBL.INVOICES)
              .select('id, invoice_number, contract_id, contract_title, total_amount, issue_date, status')
              .eq('tenant_id', tenantId)
              .order('issue_date', { ascending: false })
              .limit(200);

          if (error) {
              console.error('getInvoices', error);
              return [];
          }

          const rows = data || [];
          return rows.map((row: any) => ({
              id: row.id,
              invoiceNumber: row.invoice_number,
              contractId: row.contract_id || '',
              contractTitle: row.contract_title || '',
              amount: Number(row.total_amount) || 0,
              dueDate: row.issue_date,
              status: row.status as any,
              type: 'First Payment'
          })) as Invoice[];
      } catch (err) {
          console.error('getInvoices', err);
          return [];
      }
  }

  async getExpenses(): Promise<Expense[]> {
      try {
          const { tenantId } = await this._getContext();
          const rows = await disbursementsRepository.list({ tenantId, pageSize: 200 });

          return (rows || []).map((d) => ({
              id: d.id,
              date: d.date,
              description: d.description || d.category || '',
              amount: Number(d.amount) || 0,
              category: (d.category as any) || undefined,
              department: (d as any).department || undefined
          })) as Expense[];
      } catch (err) {
          console.error('getExpenses', err);
          return [];
      }
  }

  async convertQuotationToContract(quotationId: string): Promise<Contract | null> {
      await this._getContext();
      const q = await this.getQuotationById(quotationId);
      if (!q) return null;

      const contract: Contract = {
          id: '',
          contractNumber: `CN-${Date.now().toString().slice(-6)}`,
          clientId: q.customerId || '',
          clientName: q.customerName,
          title: q.customerCompany ? `Quotation ${q.quotationNumber}` : q.quotationNumber,
          totalValue: q.totalAmount,
          status: ContractStatus.DRAFT,
          startDate: q.date,
          deliveryDate: q.expiryDate || q.date,
          items: (q.items || []).map((i) => ({
              id: '',
              productName: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice
          })),
          partyA: undefined,
          partyB: {
              legalName: q.customerCompany || q.customerName,
              representativeName: q.customerName,
              address: q.customerAddress,
              email: q.customerEmail,
              phone: q.customerPhone,
              vatNumber: q.customerVat
          },
          paymentTerms: [],
          currency: 'SAR',
          payment1Status: PaymentStatus.PENDING,
          payment2Status: PaymentStatus.PENDING,
          createdAt: new Date().toISOString(),
          ownerId: userId,
          notes: q.notes
      };

      const saved = await this.addContract(contract);
      await supabase
        .from(TBL.QUOTATIONS)
        .update({ status: 'CONVERTED' })
        .eq('id', quotationId)
        .eq('tenant_id', tenantId);
      return saved;
  }

  async getPendingAccessRequests(): Promise<AccessRequest[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
              .from('profiles')
              .select('id, email, full_name, status, role, created_at')
              .eq('tenant_id', tenantId)
              .eq('status', 'PENDING')
              .order('created_at', { ascending: false });
          if (error) throw error;
          return (data || []).map((row: any) => ({
              id: row.id,
              email: row.email,
              fullName: row.full_name,
              status: row.status,
              role: row.role,
              createdAt: row.created_at
          })) as AccessRequest[];
      } catch (err) {
          console.error('getPendingAccessRequests', err);
          return [];
      }
  }

  async activateUserProfile(_id: string, _role: Role): Promise<void> {
      await this._getContext();
      const { error: roleError } = await supabase.rpc('assign_user_role', {
        p_user_id: _id,
        p_role_name: _role,
        p_tenant_id: tenantId
      });
      if (roleError) throw roleError;

      await supabase
        .from('profiles')
        .update({
          status: 'ACTIVE',
          role: _role,
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', _id)
        .eq('tenant_id', tenantId);
  }

  async rejectUserProfile(_id: string): Promise<void> {
      await this._getContext();
      const { error: statusError } = await supabase.rpc('set_user_tenant_status', {
        p_user_id: _id,
        p_tenant_id: tenantId,
        p_status: 'REJECTED'
      });
      if (statusError) throw statusError;

      await supabase
        .from('profiles')
        .update({
          status: 'REJECTED',
          approved_by: userId,
          approved_at: new Date().toISOString()
        })
        .eq('id', _id)
        .eq('tenant_id', tenantId);
  }

  async getMyProfile(): Promise<Employee | null> {
      try {
          const { userId, user } = await this._getContext();
          const employees = await this.getEmployees();
          const byId = employees.find(e => e.id === userId);
          if (byId) return byId;
          const email = user?.email?.toLowerCase();
          if (!email) return null;
          return employees.find(e => (e.email || '').toLowerCase() === email) || null;
      } catch (err) {
          console.error('getMyProfile', err);
          return null;
      }
  }

  async getEmployeeLeaves(employeeId: string): Promise<LeaveRecord[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
            .from('leaves')
            .select('id, employee_id, type, start_date, end_date, status, reason')
            .eq('employee_id', employeeId)
            .eq('tenant_id', tenantId)
            .order('start_date', { ascending: false });
          if (error) throw error;
          return (data || []).map((row: any) => ({
              id: row.id,
              employeeId: row.employee_id,
              type: row.type,
              startDate: row.start_date,
              endDate: row.end_date,
              status: row.status,
              reason: row.reason || ''
          })) as LeaveRecord[];
      } catch (err) {
          console.error('getEmployeeLeaves', err);
          return [];
      }
  }

  async updateMyProfile(profile: Partial<Employee>): Promise<void> {
      const { tenantId, userId, user } = await this._getContext();
      const dbUpdates: any = {};
      if (profile.phone !== undefined) dbUpdates.phone = profile.phone;
      if (profile.email !== undefined) dbUpdates.email = profile.email;
      if (profile.iban !== undefined) dbUpdates.iban = profile.iban;
      if (profile.avatarUrl !== undefined) dbUpdates.avatar_url = profile.avatarUrl;
      if (profile.adminNotes !== undefined) dbUpdates.admin_notes = profile.adminNotes;

      if (Object.keys(dbUpdates).length === 0) return;

      const email = user?.email;
      let query = supabase.from(TBL.EMPLOYEES).update(dbUpdates);
      if (email) {
          query = query.eq('email', email);
      } else {
          query = query.eq('id', userId);
      }
      await query.eq('tenant_id', tenantId);
  }

  async uploadEmployeeFile(employeeId: string, file: any): Promise<string> {
      const { tenantId } = await this._getContext();
      const safeName = (file?.name || 'file').replace(/\s+/g, '_');
      const path = `${tenantId}/${employeeId}/${Date.now()}-${safeName}`;
      const { data, error } = await supabase.storage
        .from('employee-files')
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: url } = supabase.storage.from('employee-files').getPublicUrl(data.path);
      return url.publicUrl;
  }

  async requestLeaveApproval(payload: any): Promise<void> {
      const { tenantId } = await this._getContext();
      const start = payload?.from ? new Date(payload.from) : null;
      const end = payload?.to ? new Date(payload.to) : null;
      const duration = payload?.duration ?? (start && end ? Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1) : 1);
      const { data, error } = await supabase.from('leaves').insert({
          employee_id: payload?.employeeId,
          type: payload?.type || payload?.leaveType || 'Annual',
          start_date: payload?.from,
          end_date: payload?.to,
          days: duration,
          status: 'PENDING',
          reason: payload?.reason || '',
          tenant_id: tenantId
      }).select('id').single();
      if (error) throw error;
      await this.createApprovalRequest({
          type: ApprovalType.LEAVE,
          title: payload?.title || 'Leave Request',
          description: payload?.reason || '',
          requesterId: payload?.employeeId,
          requesterName: payload?.employeeName || 'Employee',
          date: new Date().toISOString(),
          status: 'PENDING',
          relatedEntityId: data?.id,
          amount: payload?.duration,
          priority: 'MEDIUM'
      } as any);
  }

  async requestGeneralApproval(payload: Partial<ApprovalRequest>): Promise<void> {
      const tempId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto) ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2);
      const request: ApprovalRequest = {
          id: payload.id || tempId,
          type: payload.type || ApprovalType.ACCESS,
          title: payload.title || 'General Approval',
          description: payload.description || '',
          requesterId: payload.requesterId || '',
          requesterName: payload.requesterName || 'System',
          date: payload.date || new Date().toISOString(),
          status: payload.status || 'PENDING',
          relatedEntityId: payload.relatedEntityId,
          amount: payload.amount,
          priority: payload.priority || 'MEDIUM',
          approverId: payload.approverId,
          approvedAt: payload.approvedAt,
          targetType: payload.targetType,
          targetId: payload.targetId,
          decisionBy: payload.decisionBy,
          decisionAt: payload.decisionAt,
          decisionNote: payload.decisionNote,
          payload: payload.payload
      };

      await this.createApprovalRequest(request);
  }

  async requestContractApproval(contractId: string, title: string, totalValue?: number): Promise<void> {
      await this.createApprovalRequest({
          type: ApprovalType.CONTRACT,
          title: title || 'Contract Approval',
          description: title,
          requesterId: '',
          requesterName: 'System',
          date: new Date().toISOString(),
          status: 'PENDING',
          relatedEntityId: contractId,
          amount: totalValue,
          priority: 'MEDIUM'
      } as any);
  }

  async requestHiringApproval(payload: any): Promise<void> {
      await this.createApprovalRequest({
          type: ApprovalType.HIRING,
          title: payload?.title || 'Hiring Request',
          description: payload?.notes || '',
          requesterId: payload?.requesterId,
          requesterName: payload?.requesterName || 'System',
          date: new Date().toISOString(),
          status: 'PENDING',
          relatedEntityId: payload?.id,
          amount: payload?.budget,
          priority: 'MEDIUM'
      } as any);
  }

  async getSalaryHistory(_employeeId: string): Promise<any[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
            .from('salary_structures')
            .select('*')
            .eq('employee_id', _employeeId)
            .eq('tenant_id', tenantId)
            .order('effective_date', { ascending: false });
          if (error) throw error;
          return data || [];
      } catch (err) {
          console.error('getSalaryHistory', err);
          return [];
      }
  }

  async listEmployeeFiles(_employeeId: string): Promise<any[]> {
      try {
          const { tenantId } = await this._getContext();
          const folder = `${tenantId}/${_employeeId}`;
          const { data, error } = await supabase.storage.from('employee-files').list(folder);
          if (error) throw error;
          return (data || []).map((f) => {
              const path = `${folder}/${f.name}`;
              const { data: url } = supabase.storage.from('employee-files').getPublicUrl(path);
              return { name: f.name, path, url: url.publicUrl };
          });
      } catch (err) {
          console.error('listEmployeeFiles', err);
          return [];
      }
  }

  async getEmployeeAudit(_employeeId: string): Promise<any[]> {
      try {
          const { tenantId } = await this._getContext();
          const { data, error } = await supabase
            .from('audit_logs')
            .select('id, table_name, record_id, operation, changed_by, changed_at, new_data, old_data')
            .eq('record_id', _employeeId)
            .eq('tenant_id', tenantId)
            .order('changed_at', { ascending: false });
          if (error) throw error;
          return data || [];
      } catch (err) {
          console.error('getEmployeeAudit', err);
          return [];
      }
  }

  async deleteEmployee(_id: string): Promise<void> {
      const { tenantId } = await this._getContext();
      await supabase
        .from(TBL.EMPLOYEES)
        .update({ status: 'Terminated', disabled: true })
        .eq('id', _id)
        .eq('tenant_id', tenantId);
  }

  async deleteEmployeeFile(_path: string): Promise<void> {
      const { error } = await supabase.storage.from('employee-files').remove([_path]);
      if (error) throw error;
  }

  async signUpAndRequestAccess(_payload: any): Promise<void> {
            const { fullName, email, password } = _payload || {};
      const metadata: Record<string, any> = { full_name: fullName };
      const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
      });
      if (error) throw error;
      if (data?.session?.user) {
          await this.createApprovalRequest({
              type: ApprovalType.ACCESS,
              title: 'Access Request',
              description: `Access request for ${email}`,
              requesterId: data.session.user.id,
              requesterName: fullName || email,
              date: new Date().toISOString(),
              status: 'PENDING',
              relatedEntityId: data.session.user.id,
              priority: 'MEDIUM'
          } as any);
      }
  }

  async signInWithPassword(email: string, password: string) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return data;
  }

  async updateUserPassword(newPassword: string) {
      const { error } = await supabase.auth.updateUser({
          password: newPassword,
          data: { password_changed: true }
      });
      if (error) throw error;
  }

  async getRoles(): Promise<Role[]> {
      return Object.values(Role);
  }

  async addLedgerEntry(e: any): Promise<void> {
      await this.createJournalEntry(e);
  }

  async processOrder(c: any, t: any): Promise<void> {
      const { tenantId, userId } = await this._getContext();
      const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
      const subtotal = (c || []).reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
      const vatAmount = subtotal * 0.15;
      const totalAmount = subtotal + vatAmount;

      const { data: order, error } = await supabase
        .from(TBL.ORDERS)
        .insert({
          order_number: orderNumber,
          type: t,
          customer_type: t === 'B2B' ? 'Business' : 'Consumer',
          subtotal,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          status: 'PENDING',
          created_by: userId,
          tenant_id: tenantId
        })
        .select('id')
        .single();
      if (error) throw error;

      const itemsPayload = (c || []).map((item: any) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.price,
        line_total: Number(item.price || 0) * Number(item.quantity || 0),
        tenant_id: tenantId
      }));
      if (itemsPayload.length > 0) {
        const { error: itemsError } = await supabase.from(TBL.ORDER_ITEMS).insert(itemsPayload);
        if (itemsError) throw itemsError;
      }
  }

  async generateDeliveryNote(id: string): Promise<DeliveryNote | null> { 
      try {
          const { tenantId } = await this._getContext();
          const { data: contract, error } = await supabase
            .from(TBL.CONTRACTS)
            .select('id, contract_number, title, party_b')
            .eq('id', id)
            .eq('tenant_id', tenantId)
            .single();
          if (error || !contract) return null;

          const { data: items } = await supabase
            .from(TBL.CONTRACT_ITEMS)
            .select('product_name, quantity')
            .eq('contract_id', id)
            .eq('tenant_id', tenantId);

          const partyB = (contract as any).party_b || {};
          return {
            id: `DN-${Date.now().toString().slice(-6)}`,
            contractId: contract.id,
            contractNumber: contract.contract_number,
            clientName: partyB.legalName || partyB.representativeName || '',
            deliveryDate: new Date().toISOString(),
            items: (items || []).map((i: any) => ({
              productName: i.product_name || '',
              quantity: Number(i.quantity || 0)
            }))
          } as DeliveryNote;
      } catch (err) {
          console.error('generateDeliveryNote', err);
          return null;
      }
  }

  // --- PARTNERS & CAPITAL MANAGEMENT ---
  private async getLatestApprovedValuation(tenantId: string): Promise<number> {
      const { data: approvals } = await supabase
        .from('approvals')
        .select('target_id')
        .eq('target_type', 'capital_event')
        .eq('status', 'APPROVED')
        .eq('tenant_id', tenantId)
        .order('decision_at', { ascending: false })
        .limit(50);

      const approvedIds = (approvals || [])
        .map((row) => row.target_id)
        .filter((id): id is string => Boolean(id));

      if (approvedIds.length === 0) return 0;

      const { data } = await supabase
        .from('capital_events')
        .select('valuation, created_at')
        .in('id', approvedIds)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(1);

      return Number(data?.[0]?.valuation || 0);
  }

  private _buildCapRows(partnerShares: PartnerShareRow[], totalShares: number, pricePerShare: number, restrictedProfileId?: string | null): CapTableRow[] {
      const filtered = restrictedProfileId
        ? partnerShares.filter((row) => row.profile_id === restrictedProfileId)
        : partnerShares;

      return filtered.map((row) => {
          const shares = Number(row.shares || 0);
          const ownershipPct = totalShares > 0 ? (shares / totalShares) * 100 : 0;
          return {
              partnerId: row.partner_id,
              profileId: row.profile_id,
              partnerName: row.partner_name || 'Partner',
              shares,
              ownershipPct,
              currentValue: shares * pricePerShare,
              status: row.status,
              joinedAt: row.joined_at,
              exitedAt: row.exited_at
          } as CapTableRow;
      });
  }

  async getPartnerShares(): Promise<PartnerShareRow[]> {
      const { tenantId, user } = await this._getContext();
      const { data, error } = await supabase
        .from<PartnerShareRow>('view_partner_shares')
        .select('*')
        .eq('tenant_id', tenantId);
      if (error) throw error;

      const rows = data || [];
      if (this._isCeo(user)) return rows;
      if (this._isPartner(user)) return rows.filter((row) => row.profile_id === user?.id);
      return rows;
  }

  async getTotalShares(): Promise<number> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase
        .from<{ total_shares: number }>('view_total_shares')
        .select('total_shares')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return Number(data?.total_shares || 0);
  }

  async getNetProfit(): Promise<{ netProfit: number; revenue: number; expenses: number }> {
      const { tenantId } = await this._getContext();
      const { data, error } = await supabase
        .from<{ net_profit: number; revenue: number; expenses: number }>('view_net_profit')
        .select('net_profit, revenue, expenses')
        .eq('tenant_id', tenantId)
        .maybeSingle();
      if (error) throw error;
      return {
          netProfit: Number(data?.net_profit || 0),
          revenue: Number(data?.revenue || 0),
          expenses: Number(data?.expenses || 0)
      };
  }

  async getCapTable(): Promise<CapTablePayload> {
      const { tenantId, user } = await this._getContext();
      const [shares, totalShares, net, valuation] = await Promise.all([
          this.getPartnerShares(),
          this.getTotalShares(),
          this.getNetProfit(),
          this.getLatestApprovedValuation(tenantId)
      ]);

      const pricePerShare = totalShares > 0 ? valuation / totalShares : 0;
      const restrictedProfileId = this._isCeo(user) ? null : user?.id;
      const rows = this._buildCapRows(shares, totalShares, pricePerShare, restrictedProfileId);

      return {
          rows,
          summary: {
              netProfit: net.netProfit,
              valuation,
              totalShares,
              pricePerShare,
              currency: 'SAR'
          },
          canManage: this._isCeo(user),
          restrictedToProfileId: restrictedProfileId
      };
  }

  async getPartnersDashboard(): Promise<CapTablePayload> {
      // Alias for external callers; keep getCapTable as the core implementation
      return this.getCapTable();
  }

  async getPartnerAuditTimeline(partnerId?: string): Promise<PartnerAuditEvent[]> {
      const { tenantId, user, userId } = await this._getContext();
      const isCeo = this._isCeo(user);
      let scopedPartnerId = partnerId;

      if (!isCeo) {
          scopedPartnerId = partnerId || (await this._getPartnerIdForUser(userId, tenantId)) || undefined;
      }

      let query = supabase
        .from('view_partner_audit_timeline')
        .select('event_time, event_type, description, reference_type, reference_id, performed_by, approval_status, partner_id')
        .eq('tenant_id', tenantId)
        .order('event_time', { ascending: false })
        .limit(200);

      if (scopedPartnerId) {
          query = query.eq('partner_id', scopedPartnerId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row) => ({
          eventTime: row.event_time,
          eventType: row.event_type,
          description: row.description,
          referenceType: row.reference_type,
          referenceId: row.reference_id,
          performedBy: row.performed_by,
          approvalStatus: row.approval_status,
          partnerId: row.partner_id
      }));
  }

  async generateCapTablePDF(capTable?: CapTablePayload): Promise<Blob> {
      const { user } = await this._getContext();
      this._assertCeo(user);

      const snapshot = capTable || (await this.getCapTable());
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();

      const formatCurrency = (value: number, currency = 'SAR') =>
          new Intl.NumberFormat('en-SA', { style: 'currency', currency }).format(value || 0);

      doc.setFontSize(14);
      doc.text('Cap Table Snapshot', 10, 12);
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toISOString()}`, 10, 18);
      doc.text(`Valuation: ${formatCurrency(snapshot.summary.valuation, snapshot.summary.currency)}`, 10, 26);
      doc.text(`Total Shares: ${snapshot.summary.totalShares.toLocaleString()}`, 10, 32);
      doc.text(`Price / Share: ${formatCurrency(snapshot.summary.pricePerShare, snapshot.summary.currency)}`, 10, 38);

      let y = 48;
      doc.setFontSize(11);
      doc.text('Partner', 10, y);
      doc.text('Shares', 70, y);
      doc.text('Ownership %', 110, y);
      doc.text('Value', 150, y);
      doc.setLineWidth(0.2);
      doc.line(10, y + 2, 200, y + 2);
      y += 8;

      snapshot.rows.forEach((row, index) => {
          if (y > 280) {
              doc.addPage();
              y = 20;
          }
          doc.setFontSize(10);
          doc.text(`${index + 1}. ${row.partnerName}`, 10, y);
          doc.text(row.shares.toLocaleString(), 70, y);
          doc.text(`${row.ownershipPct.toFixed(2)}%`, 110, y);
          doc.text(formatCurrency(row.currentValue, snapshot.summary.currency), 150, y);
          y += 8;
      });

      return doc.output('blob');
  }

  async requestApproval(payload: { targetType: 'equity_transaction' | 'capital_event'; targetId: string; amount?: number; title: string; description?: string; }): Promise<void> {
      const { userId, user } = await this._getContext();
      await this.createApprovalRequest({
          id: payload.targetId,
          type: ApprovalType.CAPITAL_ACTION,
          title: payload.title,
          description: payload.description || '',
          requesterId: userId,
          requesterName: (user?.user_metadata?.full_name as string) || user?.email || 'System',
          date: new Date().toISOString(),
          status: 'PENDING',
          relatedEntityId: payload.targetId,
          amount: payload.amount,
          priority: 'HIGH',
          targetType: payload.targetType,
          targetId: payload.targetId
      } as ApprovalRequest);
  }

  async createCapitalEvent(input: CapitalEventInput): Promise<void> {
      const { tenantId, userId, user } = await this._getContext();
      this._assertCeo(user);

      const { data, error } = await supabase
        .from('capital_events')
        .insert({
            event_type: input.eventType,
            amount: input.amount,
            valuation: input.valuation,
            notes: input.notes,
            created_by: userId,
            tenant_id: tenantId
        })
        .select('id')
        .single();

      if (error) throw error;
      const createdId = data?.id as string;

      await this.requestApproval({
          targetType: 'capital_event',
          targetId: createdId,
          amount: input.amount,
          title: input.eventType === 'INCREASE' ? 'Capital Increase' : 'Capital Decrease',
          description: input.notes || ''
      });
  }

  async createEquityTransaction(input: EquityTransactionInput): Promise<void> {
      const { tenantId, userId, user } = await this._getContext();
      this._assertCeo(user);

      const { data, error } = await supabase
        .from('equity_transactions')
        .insert({
            transaction_type: input.transactionType,
            from_partner_id: input.fromPartnerId || null,
            to_partner_id: input.toPartnerId || null,
            shares: input.shares,
            price_per_share: input.pricePerShare,
            valuation: input.valuation,
            created_by: userId,
            tenant_id: tenantId
        })
        .select('id')
        .single();

      if (error) throw error;
      const createdId = data?.id as string;

      await this.requestApproval({
          targetType: 'equity_transaction',
          targetId: createdId,
          amount: input.shares * input.pricePerShare,
          title: `Equity ${input.transactionType}`,
          description: 'Equity change pending approval'
      });
  }

  previewEquityImpact(base: CapTablePayload, draft: EquityTransactionInput): EquityPreviewResult {
      const rowsMap = new Map<string, CapTableRow>(
          base.rows.map((row) => [row.partnerId, { ...row }])
      );

      let totalShares = base.summary.totalShares;

      if (draft.transactionType === 'ISSUE') {
          totalShares += draft.shares;
          if (draft.toPartnerId) {
              const existing = rowsMap.get(draft.toPartnerId);
              rowsMap.set(draft.toPartnerId, {
                  ...(existing || {
                      partnerId: draft.toPartnerId,
                      profileId: draft.toPartnerId,
                      partnerName: 'New Partner',
                      status: 'ACTIVE' as const,
                      joinedAt: null,
                      exitedAt: null,
                      shares: 0,
                      ownershipPct: 0,
                      currentValue: 0
                  }),
                  shares: (existing?.shares || 0) + draft.shares
              });
          }
      } else if (draft.transactionType === 'TRANSFER') {
          if (draft.fromPartnerId) {
              const sender = rowsMap.get(draft.fromPartnerId);
              if (sender) sender.shares = Math.max(0, sender.shares - draft.shares);
          }
          if (draft.toPartnerId) {
              const receiver = rowsMap.get(draft.toPartnerId);
              rowsMap.set(draft.toPartnerId, {
                  ...(receiver || {
                      partnerId: draft.toPartnerId,
                      profileId: draft.toPartnerId,
                      partnerName: 'New Partner',
                      status: 'ACTIVE' as const,
                      joinedAt: null,
                      exitedAt: null,
                      shares: 0,
                      ownershipPct: 0,
                      currentValue: 0
                  }),
                  shares: (receiver?.shares || 0) + draft.shares
              });
          }
      } else if (draft.transactionType === 'BUYBACK') {
          totalShares = Math.max(0, totalShares - draft.shares);
          if (draft.fromPartnerId) {
              const seller = rowsMap.get(draft.fromPartnerId);
              if (seller) seller.shares = Math.max(0, seller.shares - draft.shares);
          }
      }

      const valuation = draft.valuation;
      const pricePerShare = totalShares > 0 ? valuation / totalShares : 0;
      const rows = Array.from(rowsMap.values()).map((row) => ({
          ...row,
          ownershipPct: totalShares > 0 ? (row.shares / totalShares) * 100 : 0,
          currentValue: row.shares * pricePerShare
      }));

      return {
          rows,
          summary: {
              ...base.summary,
              valuation,
              totalShares,
              pricePerShare
          }
      };
  }

  async addPartner(profileId: string, joinedAt?: string): Promise<void> {
      const { tenantId, user } = await this._getContext();
      this._assertCeo(user);
      const payload = {
          profile_id: profileId,
          joined_at: joinedAt || new Date().toISOString().slice(0, 10),
          status: 'ACTIVE',
          tenant_id: tenantId
      };

      const { error } = await supabase
        .from('partners')
        .upsert(payload, { onConflict: 'profile_id,tenant_id' });
      if (error) throw error;
  }

  async updatePartnerStatus(partnerId: string, status: 'ACTIVE' | 'INACTIVE', exitedAt?: string | null): Promise<void> {
      const { tenantId, user } = await this._getContext();
      this._assertCeo(user);
      const updates: Record<string, unknown> = {
          status,
          exited_at: exitedAt || null
      };
      const { error } = await supabase
        .from('partners')
        .update(updates)
        .eq('id', partnerId)
        .eq('tenant_id', tenantId);
      if (error) throw error;
  }

  async getBreakEvenAnalysis() {
      const { netProfit } = await this.getNetProfit();
      return { fixedCosts: 0, variableCosts: 0, revenue: netProfit, breakEvenRevenue: 0, netProfit };
  }

    async getDashboardData() {
            const { tenantId } = await this._getContext();

            const [receiptsRes, disbRes, invoiceRes, approvals, contractsRes] = await Promise.all([
                    supabase
                        .from(TBL.RECEIPTS)
                        .select('id, amount, date, customer_name')
                        .eq('tenant_id', tenantId)
                        .order('date', { ascending: false })
                        .limit(60),
                    supabase
                        .from(TBL.DISBURSEMENTS)
                        .select('id, amount, date, category, status')
                        .eq('tenant_id', tenantId)
                        .order('date', { ascending: false })
                        .limit(60),
                    supabase
                        .from(TBL.INVOICES)
                        .select('id, invoice_number, total_amount, issue_date, status, customer_name')
                        .eq('tenant_id', tenantId)
                        .order('issue_date', { ascending: false })
                        .limit(60),
                    approvalsRepository.list(tenantId),
                    supabase
                        .from(TBL.CONTRACTS)
                        .select('id')
                        .eq('tenant_id', tenantId)
            ]);

            const receipts = receiptsRes.data || [];
            const disbursements = disbRes.data || [];
            const invoices = invoiceRes.data || [];
            const contracts = contractsRes.data || [];

            const totalReceipts = receipts.reduce((sum: number, r: any) => sum + Number(r.amount || 0), 0);
            const totalDisbursements = disbursements.reduce((sum: number, d: any) => sum + Number(d.amount || 0), 0);

            const groupByMonth = (rows: any[]) => {
                    const map: Record<string, { inflow: number; outflow: number }> = {};
                    rows.forEach((r) => {
                            const key = (r.date || '').slice(0, 7) || 'غير محدد';
                            if (!map[key]) map[key] = { inflow: 0, outflow: 0 };
                            map[key].inflow += Number(r.amount || 0);
                    });
                    disbursements.forEach((d: any) => {
                            const key = (d.date || '').slice(0, 7) || 'غير محدد';
                            if (!map[key]) map[key] = { inflow: 0, outflow: 0 };
                            map[key].outflow += Number(d.amount || 0);
                    });
                    return Object.entries(map)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([month, vals]) => ({ month, inflow: vals.inflow, outflow: vals.outflow }));
            };

            const invoicesByStatus = invoices.reduce((acc: Record<string, number>, inv: any) => {
                    const status = inv.status || 'UNKNOWN';
                    acc[status] = (acc[status] || 0) + 1;
                    return acc;
            }, {} as Record<string, number>);

            return {
                    totals: {
                            receipts: totalReceipts,
                            disbursements: totalDisbursements,
                            netCash: totalReceipts - totalDisbursements,
                            contracts: contracts.length,
                            invoices: invoices.length,
                            pendingApprovals: approvals.filter((a) => (a.status as any) === 'PENDING').length
                    },
                    charts: {
                            cashFlow: groupByMonth(receipts),
                            invoicesByStatus
                    },
                    recent: {
                            receipts: receipts.slice(0, 5),
                            disbursements: disbursements.slice(0, 5),
                            approvals: approvals.slice(0, 5)
                    }
            };
    }
}

export const dataService = new DataService();









