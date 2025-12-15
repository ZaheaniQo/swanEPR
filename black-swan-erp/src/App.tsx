
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './AppContext';
import { ThemeProvider } from './theme/ThemeContext';
import Layout from './components/Layout';
import Login from './components/Login';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Role } from './types';

// Dashboards
import Dashboard from './components/Dashboard';
import ComplianceDashboard from './components/ComplianceDashboard';
import Approvals from './components/Approvals';

// Contracts
import Contracts from './components/Contracts';
import ContractBuilder from './components/contracts/ContractBuilder';

// Inventory
import Inventory from './components/Inventory';
import InventoryTransaction from './components/inventory/InventoryTransaction';

// Production
import Production from './components/Production';
import BOMForm from './components/production/BOMForm';
import WorkOrderForm from './components/production/WorkOrderForm';

// Accounting
import Accounting from './components/Accounting';
import JournalEntryForm from './components/accounting/JournalEntryForm';
import { TrialBalance } from './components/accounting/TrialBalance';
import Assets from './components/Assets';
import AssetForm from './components/assets/AssetForm';

// HR
import HR from './components/HR';
import EmployeeForm from './components/hr/EmployeeForm';
import Payroll from './components/Payroll';

// Partners
import Partners from './components/Partners';

// Settings
import Settings from './components/Settings';

// Sales & Procurement
import Quotations from './components/Quotations';
import QuotationForm from './components/quotations/QuotationForm';
import QuotationDetails from './components/quotations/QuotationDetails';

import Receipts from './components/Receipts';
import ReceiptForm from './components/receipts/ReceiptForm';

import Invoices from './components/Invoices';
import InvoiceDetails from './components/InvoiceDetails';
import InvoiceForm from './components/invoices/InvoiceForm';

import Disbursements from './components/Disbursements';
import DisbursementForm from './components/disbursements/DisbursementForm';

import Suppliers from './components/Suppliers';
import SupplierForm from './components/suppliers/SupplierForm';

import Customers from './components/Customers';
import CustomerForm from './components/customers/CustomerForm';

import Products from './components/Products';
import ProductForm from './components/products/ProductForm';

const NotFound = () => (
  <div className="flex flex-col items-center justify-center h-full text-text-muted p-10">
    <h1 className="text-6xl font-bold mb-4 text-primary">404</h1>
    <p className="text-xl">Page not found</p>
  </div>
);

const AppContent: React.FC = () => {
  const { isLoading, currentUser } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Login />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        {/* Dashboards */}
        <Route path="dashboard" element={<Dashboard />} />
        
        <Route path="approvals" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PARTNER]}>
            <Approvals />
          </ProtectedRoute>
        } />
        
        <Route path="compliance" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING, Role.PARTNER]}>
            <ComplianceDashboard />
          </ProtectedRoute>
        } />
        
        {/* Sales & Procurement */}
        <Route path="products" element={<Products />} />
        <Route path="products/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE]}>
            <ProductForm />
          </ProtectedRoute>
        } />
        <Route path="products/:id/edit" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE]}>
            <ProductForm />
          </ProtectedRoute>
        } />

        <Route path="quotations" element={<Quotations />} />
        <Route path="quotations/new" element={<QuotationForm />} />
        <Route path="quotations/:id" element={<QuotationDetails />} />

        <Route path="contracts" element={<Contracts />} />
        <Route path="contracts/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.MARKETING]}>
            <ContractBuilder />
          </ProtectedRoute>
        } />

        <Route path="receipts" element={<Receipts />} />
        <Route path="receipts/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <ReceiptForm />
          </ProtectedRoute>
        } />

        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <InvoiceForm />
          </ProtectedRoute>
        } />
        <Route path="invoices/:id" element={<InvoiceDetails />} />

        <Route path="disbursements" element={<Disbursements />} />
        <Route path="disbursements/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <DisbursementForm />
          </ProtectedRoute>
        } />

        <Route path="suppliers" element={<Suppliers />} />
        <Route path="suppliers/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING, Role.WAREHOUSE]}>
            <SupplierForm />
          </ProtectedRoute>
        } />
        <Route path="suppliers/:id/edit" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING, Role.WAREHOUSE]}>
            <SupplierForm />
          </ProtectedRoute>
        } />

        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.MARKETING, Role.ACCOUNTING]}>
            <CustomerForm />
          </ProtectedRoute>
        } />
        <Route path="customers/:id/edit" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.MARKETING, Role.ACCOUNTING]}>
            <CustomerForm />
          </ProtectedRoute>
        } />

        {/* Operations */}
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/transaction" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.WAREHOUSE, Role.PRODUCTION_MANAGER]}>
            <InventoryTransaction />
          </ProtectedRoute>
        } />
        
        <Route path="production" element={<Production />} />
        <Route path="production/boms/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PRODUCTION_MANAGER]}>
            <BOMForm />
          </ProtectedRoute>
        } />
        <Route path="production/work-orders/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PRODUCTION_MANAGER]}>
            <WorkOrderForm />
          </ProtectedRoute>
        } />

        {/* Admin & Finance */}
        <Route path="accounting" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING, Role.PARTNER]}>
            <Accounting />
          </ProtectedRoute>
        } />
        <Route path="accounting/entries/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <JournalEntryForm />
          </ProtectedRoute>
        } />
        <Route path="accounting/trial-balance" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING, Role.PARTNER]}>
            <TrialBalance />
          </ProtectedRoute>
        } />
        
        <Route path="assets" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <Assets />
          </ProtectedRoute>
        } />
        <Route path="assets/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <AssetForm />
          </ProtectedRoute>
        } />
        
        <Route path="hr" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.HR]}>
            <HR />
          </ProtectedRoute>
        } />
        <Route path="hr/new" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.HR]}>
            <EmployeeForm />
          </ProtectedRoute>
        } />
        <Route path="hr/:id/edit" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.HR]}>
            <EmployeeForm />
          </ProtectedRoute>
        } />

        <Route path="payroll" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.HR, Role.ACCOUNTING]}>
            <Payroll />
          </ProtectedRoute>
        } />

        <Route path="partners" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.PARTNER]}>
            <Partners />
          </ProtectedRoute>
        } />
        
        <Route path="settings" element={
          <ProtectedRoute allowedRoles={[Role.CEO, Role.ACCOUNTING]}>
            <Settings />
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<NotFound />} />
      </Route>
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
