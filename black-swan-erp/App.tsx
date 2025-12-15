
import React, { useState } from 'react';
import { AppProvider, useApp } from './AppContext';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Contracts from './components/Contracts';
import Inventory from './components/Inventory';
import Production from './components/Production';
import Accounting from './components/Accounting';
import HR from './components/HR';
import Partners from './components/Partners';
import Settings from './components/Settings';
import Approvals from './components/Approvals';
import Quotations from './components/Quotations';
import Receipts from './components/Receipts';
import Invoices from './components/Invoices';
import Suppliers from './components/Suppliers';
import Customers from './components/Customers';
import Products from './components/Products';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { isLoading } = useApp();

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <Dashboard />;
      case 'approvals': return <Approvals />;
      case 'products': return <Products />;
      case 'quotations': return <Quotations />;
      case 'receipts': return <Receipts />;
      case 'invoices': return <Invoices />;
      case 'contracts': return <Contracts />;
      case 'inventory': return <Inventory />;
      case 'production': return <Production />;
      case 'accounting': return <Accounting />;
      case 'hr': return <HR />;
      case 'partners': return <Partners />;
      case 'settings': return <Settings />;
      case 'suppliers': return <Suppliers />;
      case 'customers': return <Customers />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {isLoading ? (
          <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          </div>
      ) : (
          renderPage()
      )}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;