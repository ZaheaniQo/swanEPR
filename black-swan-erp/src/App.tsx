
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { ThemeProvider } from './theme/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Role } from './types';
import { FEATURE_ROLES } from './constants';

// Dashboards
import Dashboard from './pages/Dashboard';
import ComplianceDashboard from './pages/ComplianceDashboard';
import Approvals from './pages/Approvals';

// Contracts
import Contracts from './pages/Contracts';
import ContractBuilder from './pages/contracts/ContractBuilder';

// Inventory
import Inventory from './pages/Inventory';
import InventoryTransaction from './pages/inventory/InventoryTransaction';

// Production
import Production from './pages/Production';
import BOMForm from './pages/production/BOMForm';
import WorkOrderForm from './pages/production/WorkOrderForm';

// Accounting
import Accounting from './pages/Accounting';
import JournalEntryForm from './pages/accounting/JournalEntryForm';
import { TrialBalance } from './pages/accounting/TrialBalance';
import Assets from './pages/Assets';
import AssetForm from './pages/assets/AssetForm';

// HR
import HR from './pages/HR';
import EmployeeForm from './pages/hr/EmployeeForm';
import Payroll from './pages/Payroll';

// Partners
import Partners from './pages/Partners';

// Settings
import Settings from './pages/Settings';

// Sales & Procurement
import Quotations from './pages/Quotations';
import QuotationForm from './pages/quotations/QuotationForm';
import QuotationDetails from './pages/quotations/QuotationDetails';

import Receipts from './pages/Receipts';
import ReceiptForm from './pages/receipts/ReceiptForm';

import Invoices from './pages/Invoices';
import InvoiceDetails from './pages/InvoiceDetails';
import InvoiceForm from './pages/invoices/InvoiceForm';

import Disbursements from './pages/Disbursements';
import DisbursementForm from './pages/disbursements/DisbursementForm';

import Suppliers from './pages/Suppliers';
import SupplierForm from './pages/suppliers/SupplierForm';

import Customers from './pages/Customers';
import CustomerForm from './pages/customers/CustomerForm';

import Products from './pages/Products';
import ProductForm from './pages/products/ProductForm';
import EmployeeProfile from './pages/EmployeeProfile';
import ChangePassword from './pages/ChangePassword';

const getDefaultPath = (role: Role) => {
  switch (role) {
    case Role.MARKETING:
      return '/quotations';
    case Role.ACCOUNTING:
      return '/invoices';
    case Role.WAREHOUSE:
      return '/inventory';
    case Role.PRODUCTION_MANAGER:
      return '/production';
    case Role.HR:
      return '/hr';
    default:
      return '/dashboard';
  }
};

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-full text-text-muted p-10">
    <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
    <p className="text-xl">Page not found</p>
  </div>
);

const AppContent: React.FC = () => {
  const { isLoading, currentUser, currentUserRole, passwordChanged } = useApp();
  const defaultPath = getDefaultPath(currentUserRole);
  const mustChangePassword = !!currentUser && !passwordChanged;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {currentUser ? (
        mustChangePassword ? (
          <>
            <Route
              path="/change-password"
              element={
                <ProtectedRoute allowedRoles={[Role.EMPLOYEE, Role.PARTNER, Role.HR, Role.CEO, Role.SUPER_ADMIN, Role.MARKETING, Role.WAREHOUSE, Role.ACCOUNTING, Role.PRODUCTION_MANAGER]}>
                  <ChangePassword forceMode />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/change-password" replace />} />
          </>
        ) : (
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to={defaultPath} replace />} />
          
          {/* Dashboards */}
          <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.dashboard}>
              <Dashboard />
            </ProtectedRoute>
          } />
          
          <Route path="approvals" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.approvals}>
              <Approvals />
            </ProtectedRoute>
          } />
          
          <Route path="compliance" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.compliance}>
              <ComplianceDashboard />
            </ProtectedRoute>
          } />
          
          {/* Sales & Procurement */}
          <Route path="products" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.products_view}>
              <Products />
            </ProtectedRoute>
          } />
          <Route path="products/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.products_write}>
              <ProductForm />
            </ProtectedRoute>
          } />
          <Route path="products/:id/edit" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.products_write}>
              <ProductForm />
            </ProtectedRoute>
          } />

          <Route path="quotations" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.quotations_view}>
              <Quotations />
            </ProtectedRoute>
          } />
          <Route path="quotations/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.quotations_write}>
              <QuotationForm />
            </ProtectedRoute>
          } />
          <Route path="quotations/:id" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.quotations_view}>
              <QuotationDetails />
            </ProtectedRoute>
          } />

          <Route path="contracts" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.contracts_view}>
              <Contracts />
            </ProtectedRoute>
          } />
          <Route path="contracts/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.contracts_write}>
              <ContractBuilder />
            </ProtectedRoute>
          } />

          <Route path="receipts" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.receipts_view}>
              <Receipts />
            </ProtectedRoute>
          } />
          <Route path="receipts/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.receipts_write}>
              <ReceiptForm />
            </ProtectedRoute>
          } />

          <Route path="invoices" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.invoices_view}>
              <Invoices />
            </ProtectedRoute>
          } />
          <Route path="invoices/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.invoices_write}>
              <InvoiceForm />
            </ProtectedRoute>
          } />
          <Route path="invoices/:id" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.invoices_view}>
              <InvoiceDetails />
            </ProtectedRoute>
          } />

          <Route path="disbursements" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.disbursements_view}>
              <Disbursements />
            </ProtectedRoute>
          } />
          <Route path="disbursements/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.disbursements_write}>
              <DisbursementForm />
            </ProtectedRoute>
          } />

          <Route path="suppliers" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.suppliers_view}>
              <Suppliers />
            </ProtectedRoute>
          } />
          <Route path="suppliers/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.suppliers_write}>
              <SupplierForm />
            </ProtectedRoute>
          } />
          <Route path="suppliers/:id/edit" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.suppliers_write}>
              <SupplierForm />
            </ProtectedRoute>
          } />

          <Route path="customers" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.customers_view}>
              <Customers />
            </ProtectedRoute>
          } />
          <Route path="customers/new" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.customers_write}>
              <CustomerForm />
            </ProtectedRoute>
          } />
          <Route path="customers/:id/edit" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.customers_write}>
              <CustomerForm />
            </ProtectedRoute>
          } />

          <Route path="my-profile" element={
            <ProtectedRoute>
              <EmployeeProfile />
            </ProtectedRoute>
          } />

          <Route path="change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />

          {/* Operations */}
          <Route path="settings" element={
            <ProtectedRoute allowedRoles={FEATURE_ROLES.settings}>
              <Settings />
            </ProtectedRoute>
          } />
        
            {/* HR */}
            <Route path="hr" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.hr_view}>
                <HR />
              </ProtectedRoute>
            } />
            <Route path="hr/new" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.hr_write}>
                <EmployeeForm />
              </ProtectedRoute>
            } />
            <Route path="hr/:id/edit" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.hr_write}>
                <EmployeeForm />
              </ProtectedRoute>
            } />
            <Route path="payroll" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.payroll_view}>
                <Payroll />
              </ProtectedRoute>
            } />
        
            {/* Partners */}
            <Route path="partners" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.partners_view}>
                <Partners />
              </ProtectedRoute>
            } />
        
            {/* Production */}
            <Route path="production" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.production_view}>
                <Production />
              </ProtectedRoute>
            } />
            <Route path="production/bom" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.production_write}>
                <BOMForm />
              </ProtectedRoute>
            } />
            <Route path="production/boms/new" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.production_write}>
                <BOMForm />
              </ProtectedRoute>
            } />
            <Route path="production/work-order" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.production_write}>
                <WorkOrderForm />
              </ProtectedRoute>
            } />
            <Route path="production/work-orders/new" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.production_write}>
                <WorkOrderForm />
              </ProtectedRoute>
            } />
        
            {/* Inventory */}
            <Route path="inventory" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.inventory_view}>
                <Inventory />
              </ProtectedRoute>
            } />
            <Route path="inventory/transaction" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.inventory_write}>
                <InventoryTransaction />
              </ProtectedRoute>
            } />
        
            {/* Accounting */}
            <Route path="accounting" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.accounting_view}>
                <Accounting />
              </ProtectedRoute>
            } />
            <Route path="journal" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.accounting_write}>
                <JournalEntryForm />
              </ProtectedRoute>
            } />
            <Route path="trial-balance" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.accounting_view}>
                <TrialBalance />
              </ProtectedRoute>
            } />
            <Route path="assets" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.assets_view}>
                <Assets />
              </ProtectedRoute>
            } />
            <Route path="assets/new" element={
              <ProtectedRoute allowedRoles={FEATURE_ROLES.assets_write}>
                <AssetForm />
              </ProtectedRoute>
            } />
        
            <Route path="*" element={<NotFound />} />
          </Route>
        )
      ) : (
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}

    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
};

export default App;
