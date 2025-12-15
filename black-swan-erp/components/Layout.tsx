
import React, { useState, useEffect } from 'react';
import { useApp, useTranslation } from '../AppContext';
import { Role } from '../types';
import { 
  LayoutDashboard, 
  FileText, 
  Package, 
  DollarSign, 
  Users, 
  Menu, 
  Globe, 
  Shield, 
  Factory, 
  Briefcase,
  X,
  CheckCircle,
  AlertCircle,
  Info,
  Search,
  Bell,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  CheckSquare,
  FileBadge,
  Receipt,
  FileCheck,
  Truck,
  UserCheck,
  Tag,
  Wallet
} from 'lucide-react';
import { dataService } from '../services/dataService';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { currentUserRole, setRole, toasts, removeToast } = useApp();
  const { t, lang, toggleLang, dir } = useTranslation();
  
  // State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);

  // Handle Screen Resize
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Closed by default on mobile
      } else {
        setIsSidebarOpen(true); // Open by default on desktop
      }
    };

    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check pending approvals
  useEffect(() => {
      if (currentUserRole === Role.CEO) {
          dataService.getApprovalRequests().then(reqs => {
              setPendingApprovals(reqs.filter(r => r.status === 'PENDING').length);
          });
      }
  }, [currentUserRole, currentPage]);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'menu.dashboard', roles: [Role.CEO, Role.PARTNER, Role.ACCOUNTING, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'approvals', icon: CheckSquare, label: 'menu.approvals', roles: [Role.CEO], badge: pendingApprovals },
    { id: 'products', icon: Tag, label: 'menu.products', roles: [Role.CEO, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'quotations', icon: FileBadge, label: 'menu.quotations', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING] },
    { id: 'contracts', icon: FileText, label: 'menu.contracts', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING, Role.PRODUCTION_MANAGER] },
    { id: 'receipts', icon: Receipt, label: 'menu.receipts', roles: [Role.CEO, Role.ACCOUNTING] },
    { id: 'invoices', icon: FileCheck, label: 'menu.invoices', roles: [Role.CEO, Role.ACCOUNTING, Role.PARTNER] },
    { id: 'disbursements', icon: Wallet, label: 'menu.disbursements', roles: [Role.CEO, Role.ACCOUNTING] },
    { id: 'production', icon: Factory, label: 'menu.production', roles: [Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE] },
    { id: 'inventory', icon: Package, label: 'menu.inventory', roles: [Role.CEO, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'suppliers', icon: Truck, label: 'menu.suppliers', roles: [Role.CEO, Role.WAREHOUSE, Role.ACCOUNTING, Role.PRODUCTION_MANAGER] },
    { id: 'customers', icon: UserCheck, label: 'menu.customers', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING] },
    { id: 'accounting', icon: DollarSign, label: 'menu.accounting', roles: [Role.CEO, Role.ACCOUNTING, Role.PARTNER] },
    { id: 'hr', icon: Users, label: 'menu.hr', roles: [Role.CEO, Role.HR] },
    { id: 'partners', icon: Briefcase, label: 'menu.partners', roles: [Role.CEO, Role.PARTNER] },
    { id: 'settings', icon: Settings, label: 'menu.settings', roles: [Role.CEO, Role.ACCOUNTING] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUserRole));

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const handleNavigation = (id: string) => {
    onNavigate(id);
    if (isMobile) setIsSidebarOpen(false);
  };

  // Logic for mobile sidebar position based on direction
  const sidebarMobilePosition = isMobile 
    ? (isSidebarOpen 
        ? 'translate-x-0' 
        : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full'))
    : 'translate-x-0';
    
  // On desktop, width changes. On mobile, it's fixed width but off-canvas.
  const sidebarWidth = isMobile ? 'w-72' : (isSidebarOpen ? 'w-72' : 'w-20');

  // Load Settings for Branding (Mock)
  const [companyName, setCompanyName] = useState('BLACK SWAN');
  useEffect(() => {
    dataService.getCompanySettings().then(s => {
        if (s.legalName) setCompanyName(s.legalName);
    });
  }, []);

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`} dir={dir}>
      
      {/* Toast Notifications */}
      <div className={`fixed top-20 z-[60] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 md:px-0 ${lang === 'ar' ? 'left-4' : 'right-4'}`}>
        {toasts.map((toast) => (
          <div 
            key={toast.id} 
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-2xl backdrop-blur-md border animate-slide-in
              ${toast.type === 'success' ? 'bg-emerald-900/95 border-emerald-500 text-white' : 
                toast.type === 'error' ? 'bg-red-900/95 border-red-500 text-white' : 
                'bg-slate-800/95 border-slate-600 text-white'}`}
          >
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-400 shrink-0" />}
              {toast.type === 'info' && <Info size={20} className="text-blue-400 shrink-0" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-white/60 hover:text-white mx-2">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside 
        className={`
          fixed lg:static inset-y-0 z-50 bg-slate-900 text-white shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col
          ${lang === 'ar' ? 'right-0 border-l border-r-0' : 'left-0 border-r'}
          ${sidebarWidth}
          ${sidebarMobilePosition}
        `}
      >
        {/* Sidebar Header */}
        <div className="h-18 flex items-center justify-center border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0 py-4">
          {!isMobile && !isSidebarOpen ? (
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
              B
            </div>
          ) : (
             <div className="flex items-center gap-3 px-6 w-full">
                <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20 shrink-0">
                  <span className="text-xl">B</span>
                </div>
                <div className="overflow-hidden whitespace-nowrap">
                  <h1 className="font-bold text-lg tracking-wider text-white truncate max-w-[150px]">{companyName}</h1>
                  <p className="text-[10px] text-teal-400 font-medium tracking-widest uppercase">ERP SYSTEM</p>
                </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.id)}
              className={`w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all duration-200 group relative
                ${currentPage === item.id 
                  ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-900/40' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
              `}
              title={(!isSidebarOpen && !isMobile) ? t(item.label) : ''}
            >
              <div className="relative">
                  <item.icon size={22} className={`${currentPage === item.id ? 'text-white' : 'text-slate-500 group-hover:text-teal-400'} transition-colors shrink-0`} />
                  {item.badge && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">
                          {item.badge}
                      </span>
                  )}
              </div>
              
              <span className={`text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-200 
                  ${(!isSidebarOpen && !isMobile) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
                {t(item.label)}
              </span>
              
              {/* Active Indicator Strip */}
              {currentPage === item.id && (
                <div className={`absolute top-0 bottom-0 w-1 bg-teal-300 rounded-r-full ${lang === 'ar' ? 'right-0 rounded-l-full rounded-r-none' : 'left-0'}`}></div>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div className={`flex items-center gap-3 ${(!isSidebarOpen && !isMobile) ? 'justify-center' : ''} bg-slate-800/50 p-2 rounded-xl border border-slate-700/50`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shrink-0">
               <Shield size={18} />
            </div>
            { (isSidebarOpen || isMobile) && (
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-xs font-medium text-slate-400 truncate">{t('welcome') || 'Welcome'}</p>
                <select 
                    className="w-full bg-transparent text-sm font-bold text-white border-none focus:ring-0 p-0 cursor-pointer appearance-none hover:text-teal-400 transition-colors truncate"
                    value={currentUserRole}
                    onChange={(e) => setRole(e.target.value as Role)}
                >
                    {Object.values(Role).map(r => (
                        <option key={r} value={r} className="bg-slate-900 text-slate-300">{t(`role.${r.toLowerCase()}`)}</option>
                    ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        
        {/* PROFESSIONAL STICKY HEADER */}
        <header className="sticky top-0 z-30 h-18 bg-white/80 backdrop-blur-xl border-b border-slate-200 shadow-sm flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSidebar} 
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors focus:outline-none"
                >
                    {isMobile ? <Menu size={22} /> : (
                       lang === 'ar' ? (isSidebarOpen ? <ChevronRight size={20} /> : <Menu size={20} />) 
                                     : (isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />)
                    )}
                </button>

                {/* Global Search Bar */}
                <div className="hidden md:flex items-center relative w-64 lg:w-96 group">
                   <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} text-slate-400 group-focus-within:text-teal-600 transition-colors`} />
                   <input 
                      type="text" 
                      placeholder={t('search.placeholder') || 'Search...'} 
                      className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-slate-100 border-none rounded-full text-sm font-medium text-slate-700 focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all placeholder:text-slate-400`}
                   />
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-5">
                {/* Language Toggle */}
                <button 
                    onClick={toggleLang}
                    className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs md:text-sm font-medium text-slate-600 transition-all hover:shadow-sm"
                >
                    <Globe size={14} className="text-teal-600" />
                    <span className="hidden md:inline">{lang === 'en' ? 'Arabic' : 'English'}</span>
                    <span className="md:hidden">{lang === 'en' ? 'AR' : 'EN'}</span>
                </button>

                {/* Notifications & Profile */}
                <div className={`flex items-center gap-3 ${lang === 'ar' ? 'pr-2 md:pr-4 border-r' : 'pl-2 md:pl-4 border-l'} border-slate-200`}>
                  <button className="p-2 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-full transition-colors relative">
                      <Bell size={20} />
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                  </button>
                  
                  <div className="flex items-center gap-3">
                      <div className={`text-${lang === 'ar' ? 'left' : 'right'} hidden md:block leading-tight`}>
                        <p className="text-sm font-bold text-slate-800">{currentUserRole}</p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wide">{t(`role.${currentUserRole.toLowerCase()}`)}</p>
                      </div>
                      <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center text-sm font-bold ring-2 md:ring-4 ring-teal-50 shadow-md cursor-pointer hover:scale-105 transition-transform">
                          {currentUserRole.charAt(0)}
                      </div>
                  </div>
                </div>
            </div>
        </header>

        {/* Scrollable Page Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 relative custom-scrollbar">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-slate-200/50 to-transparent pointer-events-none z-0"></div>
            
            <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                {children}
            </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
