import React from 'react';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import ReceiptForm from '../components/receipts/ReceiptForm';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Role } from '../types';
import { dataService } from '../services/dataService';
import { simulateMissingTenant } from './tenantHelpers';

function stubComponent(label: string) {
  return { default: () => <div>{label}</div> };
}

// --- Mocks ---
const mockShowToast = vi.fn();
const mockSetRole = vi.fn();
const mockSetPasswordChanged = vi.fn();
const mockSetLang = vi.fn();
const mockRemoveToast = vi.fn();
const mockSignOut = vi.fn();

const baseState = {
  currentUser: null,
  currentUserRole: Role.PARTNER,
  setRole: mockSetRole,
  profileStatus: 'ACTIVE' as const,
  passwordChanged: true,
  setPasswordChanged: mockSetPasswordChanged,
  lang: 'en' as const,
  dir: 'ltr' as const,
  isLoading: false,
  toasts: [] as any[],
  setLang: mockSetLang,
  showToast: mockShowToast,
  removeToast: mockRemoveToast,
  signOut: mockSignOut,
};

let mockAppState = { ...baseState };
const resetAppState = (overrides: Partial<typeof baseState> = {}) => {
  mockAppState = { ...baseState, ...overrides };
};

vi.mock('../AppContext', () => ({
  useApp: () => mockAppState,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTranslation: () => ({ t: (key: string) => key, lang: 'en', toggleLang: vi.fn(), dir: 'ltr' as const })
}));

vi.mock('../theme/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useTheme: () => ({ mode: 'light', setMode: vi.fn(), logoUrl: '' })
}));

vi.mock('../services/dataService', () => {
  const mockFns = {
    getApprovalRequests: vi.fn().mockResolvedValue([]),
    getCompanySettings: vi.fn().mockResolvedValue({ legalName: 'Black Swan', vatNumber: '', crNumber: '', address: '', country: 'SA', logoUrl: '' }),
    getContracts: vi.fn().mockResolvedValue({ items: [], hasMore: false, lastId: null }),
    addReceipt: vi.fn().mockResolvedValue(undefined),
  };
  return { dataService: mockFns };
});

vi.mock('../components/Dashboard', () => stubComponent('Dashboard Screen'));
vi.mock('../components/ComplianceDashboard', () => stubComponent('Compliance Screen'));
vi.mock('../components/Approvals', () => stubComponent('Approvals Screen'));
vi.mock('../components/Contracts', () => stubComponent('Contracts Screen'));
vi.mock('../components/contracts/ContractBuilder', () => stubComponent('Contract Builder'));
vi.mock('../components/Inventory', () => stubComponent('Inventory Screen'));
vi.mock('../components/inventory/InventoryTransaction', () => stubComponent('Inventory Transaction'));
vi.mock('../components/Production', () => stubComponent('Production Screen'));
vi.mock('../components/production/BOMForm', () => stubComponent('BOM Form'));
vi.mock('../components/production/WorkOrderForm', () => stubComponent('Work Order Form'));
vi.mock('../components/Accounting', () => stubComponent('Accounting Screen'));
vi.mock('../components/accounting/JournalEntryForm', () => stubComponent('Journal Entry Form'));
vi.mock('../components/accounting/TrialBalance', () => ({ TrialBalance: stubComponent('Trial Balance').default }));
vi.mock('../components/Assets', () => stubComponent('Assets Screen'));
vi.mock('../components/assets/AssetForm', () => stubComponent('Asset Form'));
vi.mock('../components/HR', () => stubComponent('HR Screen'));
vi.mock('../components/hr/EmployeeForm', () => stubComponent('Employee Form'));
vi.mock('../components/Payroll', () => stubComponent('Payroll Screen'));
vi.mock('../components/Partners', () => stubComponent('Partners Screen'));
vi.mock('../components/Settings', () => stubComponent('Settings Screen'));
vi.mock('../components/Quotations', () => stubComponent('Quotations Screen'));
vi.mock('../components/quotations/QuotationForm', () => stubComponent('Quotation Form'));
vi.mock('../components/quotations/QuotationDetails', () => stubComponent('Quotation Details'));
vi.mock('../components/Receipts', () => stubComponent('Receipts Screen'));
vi.mock('../components/invoices/InvoiceForm', () => stubComponent('Invoice Form'));
vi.mock('../components/InvoiceDetails', () => stubComponent('Invoice Details'));
vi.mock('../components/Invoices', () => stubComponent('Invoices Screen'));
vi.mock('../components/Disbursements', () => stubComponent('Disbursements Screen'));
vi.mock('../components/disbursements/DisbursementForm', () => stubComponent('Disbursement Form'));
vi.mock('../components/Suppliers', () => stubComponent('Suppliers Screen'));
vi.mock('../components/suppliers/SupplierForm', () => stubComponent('Supplier Form'));
vi.mock('../components/Customers', () => stubComponent('Customers Screen'));
vi.mock('../components/customers/CustomerForm', () => stubComponent('Customer Form'));
vi.mock('../components/Products', () => stubComponent('Products Screen'));
vi.mock('../components/products/ProductForm', () => stubComponent('Product Form'));
vi.mock('../components/EmployeeProfile', () => stubComponent('Employee Profile'));
vi.mock('../components/ChangePassword', () => stubComponent('Change Password'));

const renderWithRouter = (ui: React.ReactElement, path = '/') =>
  render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      {ui}
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  resetAppState();
});

describe('Smoke navigation', () => {
  it('renders login screen', async () => {
    resetAppState({ currentUser: null, passwordChanged: true });
    renderWithRouter(<App />, '/login');
    expect(await screen.findByText(/ERP Access/i)).toBeInTheDocument();
  });

  it('redirects unauthenticated users to login', async () => {
    resetAppState({ currentUser: null, passwordChanged: true });
    renderWithRouter(<App />, '/dashboard');
    expect(await screen.findByText(/ERP Access/i)).toBeInTheDocument();
  });

  it('renders dashboard when authenticated', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.CEO, passwordChanged: true });
    renderWithRouter(<App />, '/dashboard');
    expect(await screen.findByText('Dashboard Screen')).toBeInTheDocument();
  });

  it('navigates to Accounting page', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.ACCOUNTING, passwordChanged: true });
    renderWithRouter(<App />, '/dashboard');
    fireEvent.click(await screen.findByText('menu.accounting'));
    expect(await screen.findByText('Accounting Screen')).toBeInTheDocument();
  });

  it('navigates to HR page', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.HR, passwordChanged: true });
    renderWithRouter(<App />, '/dashboard');
    fireEvent.click(await screen.findByText('menu.hr'));
    expect(await screen.findByText('HR Screen')).toBeInTheDocument();
  });

  it('navigates to Inventory page', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.WAREHOUSE, passwordChanged: true });
    renderWithRouter(<App />, '/dashboard');
    fireEvent.click(await screen.findByText('menu.inventory'));
    expect(await screen.findByText('Inventory Screen')).toBeInTheDocument();
  });

  it('redirects unauthorized role away from accounting', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.HR, passwordChanged: true });
    renderWithRouter(<App />, '/accounting');
    expect(await screen.findByText('Dashboard Screen')).toBeInTheDocument();
  });
});

describe('Tenant guard helper', () => {
  it('surfaces a friendly toast when tenant is missing', () => {
    const { message } = simulateMissingTenant(mockShowToast);
    expect(message).toContain('tenant');
    expect(mockShowToast).toHaveBeenCalledWith(message, 'error');
  });
});

describe('Receipt flow', () => {
  it('submits a receipt with tenant-aware payload', async () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.ACCOUNTING, passwordChanged: true });
    (dataService.getContracts as Mock).mockResolvedValueOnce({
      items: [
        { id: 'c1', contractNumber: 'C-001', clientName: 'Client A', title: 'Alpha', totalValue: 1000, status: 'Draft', startDate: '', deliveryDate: '', items: [] }
      ],
      hasMore: false,
      lastId: null
    });

    renderWithRouter(<ReceiptForm />, '/receipts/new');

    const selects = await screen.findAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'c1' } });

    const amountInput = screen.getByRole('spinbutton');
    fireEvent.change(amountInput, { target: { value: '250' } });

    const saveButton = screen.getByText('btn.save');
    fireEvent.click(saveButton);

    await waitFor(() => expect((dataService.addReceipt as Mock)).toHaveBeenCalled());
    expect(mockShowToast).toHaveBeenCalledWith('msg.receiptCreated', 'success');
  });
});

describe('ProtectedRoute', () => {
  it('allows SUPER_ADMIN to bypass role checks', () => {
    resetAppState({ currentUser: { id: 'u1' }, currentUserRole: Role.SUPER_ADMIN, passwordChanged: true, isLoading: false });
    renderWithRouter(
      <ProtectedRoute allowedRoles={[Role.ACCOUNTING]}>
        <div>Secret Content</div>
      </ProtectedRoute>,
      '/accounting'
    );
    expect(screen.getByText('Secret Content')).toBeInTheDocument();
  });
});
