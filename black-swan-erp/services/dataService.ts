
import { 
  Contract, ContractStatus, InventoryItem, Employee, Role, 
  Project, ProjectStageStatus, PaymentStatus, InventoryTransaction, 
  InventoryTransactionType, CartItem, LedgerEntry, Invoice, Expense, 
  ExpenseType, Order, PaymentTerm, PaymentAmountType, PaymentTrigger, 
  ContractParty, CompanySettings, TaxInvoice, TaxInvoiceItem, InvoiceType,
  ApprovalRequest, ApprovalType, DeliveryNote, Quotation, QuotationStatus, Receipt,
  Supplier, SupplierType, Customer, Product, QualityLevel, Disbursement
} from '../types';
import { MOCK_CONTRACTS, MOCK_INVENTORY, MOCK_EMPLOYEES, MOCK_PROJECTS, MOCK_SUPPLIERS, MOCK_CUSTOMERS } from '../constants';

class DataService {
  private contracts: Contract[] = [...MOCK_CONTRACTS];
  private inventory: InventoryItem[] = [...MOCK_INVENTORY];
  private employees: Employee[] = [...MOCK_EMPLOYEES];
  private projects: Project[] = [...MOCK_PROJECTS];
  private suppliers: Supplier[] = [...MOCK_SUPPLIERS];
  private customers: Customer[] = [...MOCK_CUSTOMERS];
  private disbursements: Disbursement[] = [
      {
          id: 'd1',
          date: '2023-10-20',
          category: 'Raw Materials',
          amount: 5000,
          paymentMethod: 'Bank Transfer',
          description: 'Cotton Fabric Batch 101',
          approvalStatus: 'APPROVED',
          supplierId: 's1',
          supplierName: 'Fabrics Co'
      },
      {
          id: 'd2',
          date: '2023-10-22',
          category: 'Utilities',
          amount: 1200,
          paymentMethod: 'Bank Transfer',
          description: 'Electricity Bill',
          approvalStatus: 'PENDING'
      }
  ];
  private products: Product[] = [
      {
          id: 'prod_1',
          name: 'Classic Doctor Lab Coat',
          category: 'Medical Uniforms',
          qualityLevel: QualityLevel.PREMIUM,
          skuPrefix: 'LC-PREM',
          sizes: [
              { id: 's1', size: 'S', cost: 45, price: 120 },
              { id: 's2', size: 'M', cost: 48, price: 120 },
              { id: 's3', size: 'L', cost: 50, price: 130 },
              { id: 's4', size: 'XL', cost: 55, price: 130 },
          ],
          notes: 'Anti-microbial fabric'
      },
      {
          id: 'prod_2',
          name: 'Basic Nurse Scrubs',
          category: 'Scrubs',
          qualityLevel: QualityLevel.STANDARD,
          skuPrefix: 'SCR-STD',
          sizes: [
              { id: 's1', size: 'XS', cost: 30, price: 85 },
              { id: 's2', size: 'S', cost: 32, price: 85 },
              { id: 's3', size: 'M', cost: 32, price: 85 },
              { id: 's4', size: 'L', cost: 35, price: 90 },
          ]
      }
  ];
  
  // Ledger - Simulating a DB table
  private ledger: LedgerEntry[] = [
    { id: 'l1', date: '2023-10-01', documentNumber: 'DOC-001', description: 'Opening Balance', type: 'DEBIT', amount: 50000, department: 'Admin' },
    { id: 'l2', date: '2023-10-05', documentNumber: 'INV-101-1', description: 'Contract #101 1st Payment', contractId: '101', type: 'DEBIT', amount: 25000, department: 'Sales' },
    { id: 'l3', date: '2023-10-07', documentNumber: 'EXP-001', description: 'Fabric Purchase', type: 'CREDIT', amount: 8000, department: 'Production' },
    { id: 'l4', date: '2023-10-15', documentNumber: 'EXP-002', description: 'Electricity Bill', type: 'CREDIT', amount: 1200, department: 'Admin' },
    { id: 'l5', date: '2023-10-25', documentNumber: 'PAY-OCT', description: 'Staff Salaries Oct', type: 'CREDIT', amount: 18000, department: 'HR' },
  ];

  private expenses: Expense[] = [
    { id: 'e1', date: '2023-10-15', description: 'Electricity Bill', amount: 1200, category: ExpenseType.OPERATIONAL, department: 'Factory' },
    { id: 'e2', date: '2023-10-01', description: 'Factory Rent', amount: 5000, category: ExpenseType.FIXED_MONTHLY, department: 'Admin' },
    { id: 'e3', date: '2023-01-15', description: 'Machine Insurance', amount: 2000, category: ExpenseType.ANNUAL, department: 'Production' },
  ];

  private taxInvoices: TaxInvoice[] = [];
  private quotations: Quotation[] = [
      {
          id: 'q1', quotationNumber: 'QT-1001', customerName: 'Abdullah Medical', customerCompany: 'Abdullah Medical Group',
          date: '2023-11-01', expiryDate: '2023-11-15', status: 'PENDING',
          items: [{id: 'i1', description: 'Scrubs', quantity: 100, unitPrice: 50, total: 5000}],
          subtotal: 5000, vatAmount: 750, totalAmount: 5750
      }
  ];
  private receipts: Receipt[] = [];

  private companySettings: CompanySettings = {
      legalName: 'Black Swan Factory',
      vatNumber: '300000000000003',
      crNumber: '1010000000',
      address: 'Industrial City 2, Riyadh',
      country: 'SA',
      logoUrl: ''
  };

  private orders: Order[] = [];

  // Mock Approvals Data
  private approvals: ApprovalRequest[] = [
    { 
      id: 'ap1', type: ApprovalType.CONTRACT, title: 'Approve Contract CN-23002', 
      description: 'Client signed the contract for Nurse Scrubs Batch.', 
      requesterName: 'Marketing Dept', date: '2023-10-26', status: 'PENDING', 
      relatedEntityId: '102', amount: 15000, priority: 'HIGH' 
    },
    { 
      id: 'ap2', type: ApprovalType.EXPENSE, title: 'New Sewing Machine Purchase', 
      description: 'Request to purchase 2 industrial Juki machines.', 
      requesterName: 'Ahmed Ali', date: '2023-10-25', status: 'PENDING', 
      amount: 4500, priority: 'MEDIUM' 
    },
    { 
      id: 'ap3', type: ApprovalType.HIRING, title: 'Hire Senior Tailor', 
      description: 'Need for specialized embroidery tailor.', 
      requesterName: 'HR Dept', date: '2023-10-24', status: 'PENDING', 
      priority: 'LOW' 
    }
  ];

  // --- DISBURSEMENTS ---
  async getDisbursements(): Promise<Disbursement[]> {
      return Promise.resolve(this.disbursements);
  }

  async addDisbursement(disbursement: Partial<Disbursement>): Promise<void> {
      const newDisbursement: Disbursement = {
          id: Math.random().toString(36).substr(2, 9),
          date: disbursement.date || new Date().toISOString().split('T')[0],
          category: disbursement.category || 'General',
          amount: disbursement.amount || 0,
          paymentMethod: disbursement.paymentMethod || 'Bank Transfer',
          description: disbursement.description || '',
          approvalStatus: 'PENDING',
          supplierId: disbursement.supplierId,
          contractId: disbursement.contractId,
          projectId: disbursement.projectId
      };
      
      // Resolve names for display
      if (newDisbursement.supplierId) {
          const s = this.suppliers.find(sup => sup.id === newDisbursement.supplierId);
          if (s) newDisbursement.supplierName = s.company;
      }
      if (newDisbursement.contractId) {
          const c = this.contracts.find(con => con.id === newDisbursement.contractId);
          if (c) newDisbursement.contractTitle = c.title;
      }
      if (newDisbursement.projectId) {
          const p = this.projects.find(proj => proj.id === newDisbursement.projectId);
          if (p) newDisbursement.projectName = p.name;
      }

      this.disbursements.push(newDisbursement);
      
      // Auto-create approval request
      this.approvals.unshift({
          id: `ap-d-${newDisbursement.id}`,
          type: ApprovalType.EXPENSE,
          title: `Expense: ${newDisbursement.category}`,
          description: `${newDisbursement.description} (${newDisbursement.amount})`,
          requesterName: 'System',
          date: newDisbursement.date,
          status: 'PENDING',
          relatedEntityId: newDisbursement.id,
          amount: newDisbursement.amount,
          priority: 'MEDIUM'
      });
  }

  // --- PRODUCTS MODULE ---
  async getProducts(): Promise<Product[]> {
      return Promise.resolve(this.products);
  }

  async addProduct(product: Product): Promise<void> {
      this.products.push(product);
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<void> {
      const idx = this.products.findIndex(p => p.id === id);
      if (idx !== -1) {
          this.products[idx] = { ...this.products[idx], ...updates };
      }
  }

  async deleteProduct(id: string): Promise<void> {
      this.products = this.products.filter(p => p.id !== id);
  }

  async getProductById(id: string): Promise<Product | undefined> {
      return this.products.find(p => p.id === id);
  }

  // --- Approvals ---
  async getApprovalRequests(): Promise<ApprovalRequest[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.approvals), 300));
  }

  async processApproval(id: string, action: 'APPROVE' | 'REJECT'): Promise<void> {
    const idx = this.approvals.findIndex(a => a.id === id);
    if (idx !== -1) {
      this.approvals[idx].status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      
      // Side Effects
      if (action === 'APPROVE') {
         const req = this.approvals[idx];
         if (req.type === ApprovalType.CONTRACT && req.relatedEntityId) {
             // If contract approval, move contract to AWAITING_PAYMENT_1 or IN_PRODUCTION
             await this.updateContractStatus(req.relatedEntityId, ContractStatus.AWAITING_PAYMENT_1);
         }
         
         if (req.type === ApprovalType.EXPENSE && req.relatedEntityId) {
             const dIdx = this.disbursements.findIndex(d => d.id === req.relatedEntityId);
             if (dIdx !== -1) {
                 this.disbursements[dIdx].approvalStatus = 'APPROVED';
                 // Create Ledger Entry
                 this.ledger.push({
                     id: `l-${Date.now()}`,
                     date: this.disbursements[dIdx].date,
                     documentNumber: `EXP-${this.disbursements[dIdx].id}`,
                     description: this.disbursements[dIdx].description,
                     amount: this.disbursements[dIdx].amount,
                     type: 'CREDIT',
                     department: 'General'
                 });
             }
         }
      } else if (action === 'REJECT' && this.approvals[idx].type === ApprovalType.EXPENSE) {
          const req = this.approvals[idx];
          if (req.relatedEntityId) {
              const dIdx = this.disbursements.findIndex(d => d.id === req.relatedEntityId);
              if (dIdx !== -1) this.disbursements[dIdx].approvalStatus = 'REJECTED';
          }
      }
    }
  }

  // --- Delivery Note ---
  async generateDeliveryNote(contractId: string): Promise<DeliveryNote | null> {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) return null;

    return {
      id: `dn-${Date.now()}`,
      contractId: contract.id,
      contractNumber: contract.contractNumber,
      clientName: contract.clientName,
      deliveryDate: new Date().toISOString().split('T')[0],
      items: contract.items.map(i => ({ productName: i.productName, quantity: i.quantity, notes: 'Good Condition' }))
    };
  }

  // --- Contracts ---
  async getContracts(): Promise<Contract[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.contracts), 300));
  }

  async addContract(contract: Contract): Promise<Contract> {
    // Normalize Payments before saving
    if (contract.paymentTerms) {
        contract.paymentTerms = this.normalizePaymentSchedule(contract.totalValue, contract.paymentTerms);
    }
    
    // Default Parties if missing
    if (!contract.partyA) {
        contract.partyA = { legalName: 'مصنع البجعة السوداء للملابس الطبية', representativeName: 'المدير العام', address: 'الرياض، المدينة الصناعية', phone: '0110000000', email: 'contracts@blackswan.com.sa' };
    }
    if (!contract.partyB) {
        contract.partyB = { legalName: contract.clientName || 'Client', representativeName: 'Representative', address: 'TBD' };
    }

    // Auto-save customer info
    if (contract.partyB) {
      await this.autoCreateOrUpdateCustomerFromContract(contract.partyB);
    }

    this.contracts.push(contract);
    return contract;
  }

  async updateContractStatus(id: string, status: ContractStatus): Promise<void> {
    const idx = this.contracts.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.contracts[idx] = { ...this.contracts[idx], status };
      
      // Auto-create project logic if moving to Production
      if (status === ContractStatus.IN_PRODUCTION && !this.projects.find(p => p.contractId === id)) {
        this.createProjectFromContract(this.contracts[idx]);
      }
    }
  }

  // --- Contract E-Signature ---
  async sendContractForSignature(id: string): Promise<void> {
      await this.updateContractStatus(id, ContractStatus.AWAITING_SIGNATURE);
  }

  async markContractSignedByClient(id: string, signatureData: string): Promise<void> {
      const idx = this.contracts.findIndex(c => c.id === id);
      if (idx !== -1) {
          this.contracts[idx].clientSignature = signatureData;
          this.contracts[idx].status = ContractStatus.SIGNED_CLIENT;
          
          // Add approval request for CEO
          this.approvals.unshift({
             id: `ap-${Date.now()}`,
             type: ApprovalType.CONTRACT,
             title: `Sign Contract ${this.contracts[idx].contractNumber}`,
             description: `Client ${this.contracts[idx].clientName} has signed. Waiting for CEO countersign.`,
             requesterName: 'System',
             date: new Date().toISOString().split('T')[0],
             status: 'PENDING',
             relatedEntityId: id,
             amount: this.contracts[idx].totalValue,
             priority: 'HIGH'
          });
      }
  }

  async markContractSignedByBoth(id: string): Promise<void> {
       await this.updateContractStatus(id, ContractStatus.IN_PRODUCTION); // Or Awaiting Payment
  }

  async payMilestone(milestoneId: string, contractId: string, amount: number, method: 'Cash' | 'Bank Transfer' | 'Check' | 'POS'): Promise<void> {
    const contract = this.contracts.find(c => c.id === contractId);
    if (!contract) return;
    
    // Update term status
    if (contract.paymentTerms) {
        const term = contract.paymentTerms.find(p => p.id === milestoneId);
        if (term) term.status = PaymentStatus.PAID;
    }

    // Create receipt
    const receipt: Receipt = {
        id: Math.random().toString(36).substr(2, 9),
        receiptNumber: `RCPT-${Date.now().toString().substr(-6)}`,
        contractId: contract.id,
        contractTitle: contract.title,
        customerName: contract.clientName,
        amount: amount,
        date: new Date().toISOString().split('T')[0],
        paymentMethod: method,
        notes: 'Milestone payment'
    };
    
    await this.addReceipt(receipt);
  }

  // --- Payment Schedule Logic ---
  normalizePaymentSchedule(totalAmount: number, payments: PaymentTerm[]): PaymentTerm[] {
      return payments.map(p => {
          let amount = 0;
          if (p.amountType === PaymentAmountType.PERCENTAGE) {
              amount = (totalAmount * p.value) / 100;
          } else {
              amount = p.value;
          }
          return { ...p, amount };
      });
  }

  // --- Company Settings ---
  async getCompanySettings(): Promise<CompanySettings> {
      return Promise.resolve(this.companySettings);
  }

  async updateCompanySettings(settings: CompanySettings): Promise<void> {
      this.companySettings = { ...this.companySettings, ...settings };
  }

  // --- Tax & ZATCA Integration ---
  calculateInvoiceTotals(items: TaxInvoiceItem[], vatRate: number = 0.15) {
      let subtotal = 0;
      let vatAmount = 0;
      
      const processedItems = items.map(item => {
          const lineNet = item.unitPrice * item.quantity;
          const lineVat = lineNet * vatRate;
          subtotal += lineNet;
          vatAmount += lineVat;
          return {
              ...item,
              netAmount: lineNet,
              vatRate: vatRate,
              vatAmount: lineVat,
              totalAmount: lineNet + lineVat
          };
      });

      return {
          items: processedItems,
          subtotal,
          vatAmount,
          totalAmount: subtotal + vatAmount
      };
  }

  async createTaxInvoice(invoiceInput: Partial<TaxInvoice>): Promise<TaxInvoice> {
      const { items, subtotal, vatAmount, totalAmount } = this.calculateInvoiceTotals(invoiceInput.items || []);
      
      const newInvoice: TaxInvoice = {
          id: Math.random().toString(36).substr(2, 9),
          invoiceNumber: `INV-${Date.now().toString().substr(-6)}`,
          type: InvoiceType.STANDARD,
          issueDate: new Date().toISOString(),
          seller: this.companySettings,
          buyer: invoiceInput.buyer || { name: 'Cash Client', isVatRegistered: false },
          items,
          subtotal,
          vatAmount,
          totalAmount,
          currency: 'SAR',
          status: 'DRAFT'
      };

      this.taxInvoices.push(newInvoice);

      // Auto-post to Ledger
      await this.addLedgerEntry({
          id: `led-${newInvoice.id}`,
          date: newInvoice.issueDate.split('T')[0],
          documentNumber: newInvoice.invoiceNumber,
          description: `Tax Invoice ${newInvoice.invoiceNumber}`,
          type: 'DEBIT',
          amount: totalAmount,
          department: 'Sales',
          isTaxRelated: true,
          taxType: 'VAT_OUTPUT',
          taxAmount: vatAmount
      });

      // Mock ZATCA generation
      await this.submitToZatca(newInvoice.id);

      return newInvoice;
  }

  async submitToZatca(invoiceId: string): Promise<void> {
      const idx = this.taxInvoices.findIndex(i => i.id === invoiceId);
      if (idx !== -1) {
          // Mocking XML and QR generation
          this.taxInvoices[idx].status = 'SENT_TO_ZATCA';
          this.taxInvoices[idx].zatcaUuid = 'uuid-' + Date.now();
          this.taxInvoices[idx].xmlPayload = '<Invoice>Mock XML Data</Invoice>';
          this.taxInvoices[idx].qrCodeData = 'Base64QRCodeData...';
      }
  }

  async getTaxInvoices(): Promise<TaxInvoice[]> {
      return Promise.resolve(this.taxInvoices);
  }

  async getVatReport(startDate: string, endDate: string) {
      // Mock calculation based on ledger entries in the date range
      // Real implementation would filter by date
      const outputVat = this.ledger
        .filter(l => l.taxType === 'VAT_OUTPUT' && l.taxAmount)
        .reduce((sum, l) => sum + (l.taxAmount || 0), 0);
      
      const inputVat = this.ledger
        .filter(l => l.taxType === 'VAT_INPUT' && l.taxAmount)
        .reduce((sum, l) => sum + (l.taxAmount || 0), 0);

      return {
          periodStart: startDate,
          periodEnd: endDate,
          totalTaxableSales: outputVat / 0.15,
          totalTaxablePurchases: inputVat / 0.15,
          totalOutputTax: outputVat,
          totalInputTax: inputVat,
          netTaxDue: outputVat - inputVat
      };
  }

  // --- Accounting: Ledger ---
  async getLedgerEntries(): Promise<LedgerEntry[]> {
    return new Promise((resolve) => setTimeout(() => resolve([...this.ledger].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())), 300));
  }

  async addLedgerEntry(entry: LedgerEntry): Promise<void> {
    this.ledger.push(entry);
  }

  // --- Accounting: Invoices ---
  async getInvoices(): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    // Legacy support
    return Promise.resolve(invoices);
  }

  // --- Accounting: Expenses ---
  async getExpenses(): Promise<Expense[]> {
    return Promise.resolve(this.expenses);
  }

  // --- Production Projects ---
  async getProjects(): Promise<Project[]> {
    return new Promise((resolve) => setTimeout(() => resolve(this.projects), 300));
  }

  private createProjectFromContract(contract: Contract) {
      const newProject: Project = {
          id: `p${contract.id}`,
          contractId: contract.id,
          contractNumber: contract.contractNumber,
          name: `${contract.partyB?.legalName || contract.clientName} Production`,
          status: 'Planned',
          progress: 0,
          stages: [
              { id: `s1_${contract.id}`, name: 'Cutting', status: ProjectStageStatus.PENDING },
              { id: `s2_${contract.id}`, name: 'Sewing', status: ProjectStageStatus.PENDING },
              { id: `s3_${contract.id}`, name: 'Embroidery', status: ProjectStageStatus.PENDING },
              { id: `s4_${contract.id}`, name: 'Ironing', status: ProjectStageStatus.PENDING },
              { id: `s5_${contract.id}`, name: 'Packing', status: ProjectStageStatus.PENDING },
          ]
      };
      this.projects.push(newProject);
  }

  async updateStageStatus(projectId: string, stageId: string, status: ProjectStageStatus): Promise<void> {
      const pIdx = this.projects.findIndex(p => p.id === projectId);
      if (pIdx === -1) return;

      const project = this.projects[pIdx];
      const sIdx = project.stages.findIndex(s => s.id === stageId);
      
      if (sIdx !== -1) {
          project.stages[sIdx].status = status;
          if (status === ProjectStageStatus.IN_PROGRESS) project.stages[sIdx].startDate = new Date().toISOString().split('T')[0];
          if (status === ProjectStageStatus.COMPLETED) project.stages[sIdx].endDate = new Date().toISOString().split('T')[0];
          
          // Recalculate Project Progress
          const completed = project.stages.filter(s => s.status === ProjectStageStatus.COMPLETED).length;
          project.progress = Math.round((completed / project.stages.length) * 100);

          if (project.progress === 100) {
              project.status = 'Completed';
          } else if (project.progress > 0) {
              project.status = 'In Progress';
          }
      }
  }

  // --- Inventory ---
  async getInventory(): Promise<InventoryItem[]> {
     return new Promise((resolve) => setTimeout(() => resolve(this.inventory), 300));
  }

  async updateInventory(itemId: string, quantity: number, type: InventoryTransactionType): Promise<void> {
      const idx = this.inventory.findIndex(i => i.id === itemId);
      if (idx === -1) return;

      if (type === 'IN') {
          this.inventory[idx].quantity += quantity;
      } else {
          if (this.inventory[idx].quantity < quantity) {
              throw new Error("Insufficient stock");
          }
          this.inventory[idx].quantity -= quantity;
      }
  }

  // --- E-Commerce ---
  async processOrder(cartItems: CartItem[], type: 'B2B' | 'B2C'): Promise<void> {
      const total = cartItems.reduce((acc, i) => acc + (i.price * i.quantity), 0);
      const orderId = `ord-${Date.now()}`;
      
      if (type === 'B2C') {
        this.ledger.push({
           id: `l-${Date.now()}`,
           date: new Date().toISOString().split('T')[0],
           documentNumber: orderId,
           description: 'E-commerce Sale (B2C)',
           type: 'DEBIT',
           amount: total,
           department: 'Sales'
        });
      } 
      
      this.orders.push({
        id: orderId,
        orderNumber: orderId.toUpperCase(),
        clientName: type === 'B2B' ? 'Online Business Client' : 'Online Customer',
        date: new Date().toISOString().split('T')[0],
        totalAmount: total,
        status: type === 'B2B' ? 'Draft' : 'Invoiced',
        items: cartItems
      });
  }

  // --- HR ---
  async getEmployees(): Promise<Employee[]> {
      return new Promise((resolve) => setTimeout(() => resolve(this.employees), 300));
  }
  
  async addEmployee(emp: Employee): Promise<void> {
    this.employees.push(emp);
  }

  // --- Analytics ---
  async getBreakEvenAnalysis() {
      const revenue = this.ledger.filter(l => l.type === 'DEBIT').reduce((s, l) => s + l.amount, 0);
      const expenses = this.ledger.filter(l => l.type === 'CREDIT').reduce((s, l) => s + l.amount, 0);
      
      return {
          fixedCosts: 15000, 
          variableCosts: expenses - 15000,
          revenue,
          breakEvenRevenue: 30000,
          netProfit: revenue - expenses
      };
  }

  // --- QUOTATIONS ---
  async getQuotations(): Promise<Quotation[]> {
      return Promise.resolve(this.quotations);
  }

  async addQuotation(quotation: Quotation): Promise<void> {
      // Auto-save customer
      if (quotation.customerName) {
        await this.autoCreateOrUpdateCustomerFromQuotation(quotation);
      }
      this.quotations.push(quotation);
  }

  async updateQuotationStatus(id: string, status: QuotationStatus): Promise<void> {
      const idx = this.quotations.findIndex(q => q.id === id);
      if (idx !== -1) {
          this.quotations[idx].status = status;
      }
  }

  async convertQuotationToContract(quotationId: string): Promise<Contract | null> {
      const quotation = this.quotations.find(q => q.id === quotationId);
      if (!quotation) return null;

      const newContract: Contract = {
          id: Math.random().toString(36).substr(2, 9),
          contractNumber: `CN-Q${quotation.quotationNumber.split('-')[1]}`,
          clientId: 'new',
          clientName: quotation.customerCompany || quotation.customerName,
          title: `Contract from ${quotation.quotationNumber}`,
          totalValue: quotation.totalAmount,
          status: ContractStatus.DRAFT,
          startDate: new Date().toISOString().split('T')[0],
          deliveryDate: '',
          items: quotation.items.map(i => ({
              id: i.id,
              productName: i.description,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              productId: i.productId,
              sizeId: i.sizeId
          })),
          payment1Status: PaymentStatus.PENDING,
          payment2Status: PaymentStatus.PENDING,
          createdAt: new Date().toISOString(),
          ownerId: 'u1',
          currency: 'SAR',
          partyB: {
              legalName: quotation.customerCompany || quotation.customerName,
              representativeName: quotation.customerName,
              email: quotation.customerEmail,
              phone: quotation.customerPhone
          }
      };

      await this.addContract(newContract);
      await this.updateQuotationStatus(quotationId, 'CONVERTED');
      return newContract;
  }

  // --- RECEIPTS ---
  async getReceipts(): Promise<Receipt[]> {
      return Promise.resolve(this.receipts);
  }

  async getReceiptsByContract(contractId: string): Promise<Receipt[]> {
      return Promise.resolve(this.receipts.filter(r => r.contractId === contractId));
  }

  async addReceipt(receipt: Receipt): Promise<void> {
      this.receipts.push(receipt);
      
      // Auto-Journal Entry
      await this.addLedgerEntry({
          id: `led-rcpt-${receipt.id}`,
          date: receipt.date,
          documentNumber: receipt.receiptNumber,
          description: `Receipt ${receipt.receiptNumber} - ${receipt.customerName}`,
          type: 'DEBIT',
          amount: receipt.amount,
          department: 'Sales',
          contractId: receipt.contractId
      });
  }

  // --- SUPPLIERS ---
  async getSuppliers(): Promise<Supplier[]> {
    return Promise.resolve(this.suppliers);
  }

  async addSupplier(supplier: Supplier): Promise<void> {
    this.suppliers.push(supplier);
  }

  async updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx !== -1) {
      this.suppliers[idx] = { ...this.suppliers[idx], ...updates };
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    this.suppliers = this.suppliers.filter(s => s.id !== id);
  }

  // --- CUSTOMERS ---
  async getCustomers(): Promise<Customer[]> {
    return Promise.resolve(this.customers);
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    return this.customers.find(c => c.id === id);
  }

  async addCustomer(customer: Customer): Promise<void> {
    this.customers.push(customer);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
    const idx = this.customers.findIndex(c => c.id === id);
    if (idx !== -1) {
      this.customers[idx] = { ...this.customers[idx], ...updates };
    }
  }

  async deleteCustomer(id: string): Promise<void> {
    this.customers = this.customers.filter(c => c.id !== id);
  }

  async autoCreateOrUpdateCustomerFromContract(partyB: ContractParty): Promise<void> {
    const existing = this.customers.find(c => 
      (c.email && c.email === partyB.email) || 
      (c.phone && c.phone === partyB.phone)
    );

    if (!existing) {
      const newCustomer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: partyB.representativeName || partyB.legalName,
        company: partyB.legalName,
        email: partyB.email || '',
        phone: partyB.phone || '',
        address: partyB.address,
        vatNumber: partyB.vatNumber
      };
      this.customers.push(newCustomer);
    }
  }

  async autoCreateOrUpdateCustomerFromQuotation(quotation: Quotation): Promise<void> {
    const existing = this.customers.find(c => 
      (c.email && c.email === quotation.customerEmail) || 
      (c.phone && c.phone === quotation.customerPhone)
    );

    if (!existing) {
      const newCustomer: Customer = {
        id: Math.random().toString(36).substr(2, 9),
        name: quotation.customerName,
        company: quotation.customerCompany || quotation.customerName,
        email: quotation.customerEmail || '',
        phone: quotation.customerPhone || '',
        address: ''
      };
      this.customers.push(newCustomer);
    }
  }
}

export const dataService = new DataService();