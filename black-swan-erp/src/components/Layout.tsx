
import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp, useTranslation } from '../AppContext';
import { useTheme } from '../theme/ThemeContext';
import { Role } from '../types';
import { 
  LayoutDashboard, FileText, Package, DollarSign, Users, Menu, Globe, Shield, 
  Factory, Briefcase, X, CheckCircle, AlertCircle, Info, Search, Bell, 
  ChevronLeft, ChevronRight, Settings, CheckSquare, FileBadge, Receipt, 
  FileCheck, Truck, UserCheck, Tag, Wallet, ShieldCheck, Moon, Sun,
  Building, Banknote
} from 'lucide-react';
import { dataService } from '../services/dataService';
import AIChatbot from './AIChatbot';

const Layout: React.FC = () => {
  const { currentUserRole, toasts, removeToast, setRole } = useApp();
  const { t, lang, toggleLang, dir } = useTranslation();
  const { mode, setMode, logoUrl } = useTheme();
  const location = useLocation();
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const [companyName, setCompanyName] = useState('BLACK SWAN');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setIsSidebarOpen(false);
      else setIsSidebarOpen(true);
    };
    handleResize(); 
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentUserRole === Role.CEO) {
        dataService.getApprovalRequests().then(reqs => {
            setPendingApprovals(reqs.filter(r => r.status === 'PENDING').length);
        });
    }
    // Subscribe to settings changes or just load once
    const loadSettings = async () => {
        const s = await dataService.getCompanySettings();
        if (s.legalName) setCompanyName(s.legalName);
    };
    loadSettings();
    
    // Optional: Poll for settings changes if needed, or use a context for real-time updates
    const interval = setInterval(loadSettings, 30000); 
    return () => clearInterval(interval);
  }, [currentUserRole, location.pathname]);

  const menuItems = [
    { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'menu.dashboard', roles: [Role.CEO, Role.PARTNER, Role.ACCOUNTING, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'approvals', path: '/approvals', icon: CheckSquare, label: 'menu.approvals', roles: [Role.CEO], badge: pendingApprovals },
    { id: 'compliance', path: '/compliance', icon: ShieldCheck, label: 'menu.compliance', roles: [Role.CEO, Role.ACCOUNTING, Role.PARTNER] },
    { id: 'products', path: '/products', icon: Tag, label: 'menu.products', roles: [Role.CEO, Role.MARKETING, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'quotations', path: '/quotations', icon: FileBadge, label: 'menu.quotations', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING] },
    { id: 'contracts', path: '/contracts', icon: FileText, label: 'menu.contracts', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING, Role.PRODUCTION_MANAGER] },
    { id: 'receipts', path: '/receipts', icon: Receipt, label: 'menu.receipts', roles: [Role.CEO, Role.ACCOUNTING] },
    { id: 'invoices', path: '/invoices', icon: FileCheck, label: 'menu.invoices', roles: [Role.CEO, Role.ACCOUNTING, Role.PARTNER] },
    { id: 'disbursements', path: '/disbursements', icon: Wallet, label: 'menu.disbursements', roles: [Role.CEO, Role.ACCOUNTING] },
    { id: 'production', path: '/production', icon: Factory, label: 'menu.production', roles: [Role.CEO, Role.PRODUCTION_MANAGER, Role.WAREHOUSE] },
    { id: 'inventory', path: '/inventory', icon: Package, label: 'menu.inventory', roles: [Role.CEO, Role.WAREHOUSE, Role.PRODUCTION_MANAGER] },
    { id: 'suppliers', path: '/suppliers', icon: Truck, label: 'menu.suppliers', roles: [Role.CEO, Role.WAREHOUSE, Role.ACCOUNTING, Role.PRODUCTION_MANAGER] },
    { id: 'customers', path: '/customers', icon: UserCheck, label: 'menu.customers', roles: [Role.CEO, Role.MARKETING, Role.ACCOUNTING] },
    { id: 'accounting', path: '/accounting', icon: DollarSign, label: 'menu.accounting', roles: [Role.CEO, Role.ACCOUNTING, Role.PARTNER] },
    { id: 'assets', path: '/assets', icon: Building, label: 'menu.assets', roles: [Role.CEO, Role.ACCOUNTING] },
    { id: 'hr', path: '/hr', icon: Users, label: 'menu.hr', roles: [Role.CEO, Role.HR] },
    { id: 'payroll', path: '/payroll', icon: Banknote, label: 'menu.payroll', roles: [Role.CEO, Role.HR, Role.ACCOUNTING] },
    { id: 'partners', path: '/partners', icon: Briefcase, label: 'menu.partners', roles: [Role.CEO, Role.PARTNER] },
    { id: 'settings', path: '/settings', icon: Settings, label: 'menu.settings', roles: [Role.CEO, Role.ACCOUNTING] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(currentUserRole));
  const sidebarWidth = isMobile ? 'w-72' : (isSidebarOpen ? 'w-72' : 'w-20');
  const sidebarMobilePosition = isMobile ? (isSidebarOpen ? 'translate-x-0' : (lang === 'ar' ? 'translate-x-full' : '-translate-x-full')) : 'translate-x-0';

  const toggleTheme = () => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className={`flex h-screen bg-background overflow-hidden ${lang === 'ar' ? 'font-cairo' : 'font-inter'}`} dir={dir}>
      
      {/* Toasts */}
      <div className={`fixed top-20 z-[60] flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4 md:px-0 ${lang === 'ar' ? 'left-4' : 'right-4'}`}>
        {toasts.map((toast) => (
          <div key={toast.id} className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl shadow-2xl backdrop-blur-md border animate-slide-in ${toast.type === 'success' ? 'bg-emerald-900/95 border-emerald-500 text-white' : toast.type === 'error' ? 'bg-red-900/95 border-red-500 text-white' : 'bg-slate-800/95 border-slate-600 text-white'}`}>
            <div className="flex items-center gap-3">
              {toast.type === 'success' && <CheckCircle size={20} className="text-emerald-400 shrink-0" />}
              {toast.type === 'error' && <AlertCircle size={20} className="text-red-400 shrink-0" />}
              {toast.type === 'info' && <Info size={20} className="text-blue-400 shrink-0" />}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-white/60 hover:text-white mx-2"><X size={16} /></button>
          </div>
        ))}
      </div>

      {isMobile && isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 transition-opacity" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`fixed lg:static inset-y-0 z-50 bg-slate-900 text-white shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-800 flex flex-col ${lang === 'ar' ? 'right-0 border-l border-r-0' : 'left-0 border-r'} ${sidebarWidth} ${sidebarMobilePosition}`}>
        <div className="h-18 flex items-center justify-center border-b border-slate-800/50 bg-gradient-to-r from-slate-900 to-slate-800 shrink-0 py-4">
          {!isMobile && !isSidebarOpen ? (
            logoUrl ? <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" /> : <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-primary">B</div>
          ) : (
             <div className="flex items-center gap-3 px-6 w-full">
                {logoUrl ? <img src={logoUrl} alt="Logo" className="w-10 h-10 object-contain" /> : (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white bg-primary shrink-0">
                    <span className="text-xl">B</span>
                  </div>
                )}
                <div className="overflow-hidden whitespace-nowrap">
                  <h1 className="font-bold text-lg tracking-wider text-white truncate max-w-[150px]">{companyName}</h1>
                  <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase">ERP SYSTEM</p>
                </div>
            </div>
          )}
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filteredMenu.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={() => isMobile && setIsSidebarOpen(false)}
              className={({ isActive }) => `w-full flex items-center gap-4 px-3.5 py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}`}
              title={(!isSidebarOpen && !isMobile) ? t(item.label) : ''}
            >
              <div className="relative">
                  <item.icon size={22} className={`transition-colors shrink-0`} />
                  {item.badge && item.badge > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center border border-slate-900">{item.badge}</span>
                  )}
              </div>
              <span className={`text-sm font-medium tracking-wide whitespace-nowrap transition-all duration-200 ${(!isSidebarOpen && !isMobile) ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>{t(item.label)}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm shrink-0">
          <div className={`flex items-center gap-3 ${(!isSidebarOpen && !isMobile) ? 'justify-center' : ''} bg-slate-800/50 p-2 rounded-xl border border-slate-700/50`}>
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-text shadow-md shrink-0"><Shield size={18} /></div>
            { (isSidebarOpen || isMobile) && (
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="text-xs font-medium text-slate-400 truncate">{t('welcome')}</p>
                <div className="w-full bg-transparent text-sm font-bold text-white border-none focus:ring-0 p-0 truncate">
                    {t(`role.${currentUserRole.toLowerCase()}`)}
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
        <header className="sticky top-0 z-30 h-18 bg-surface/80 backdrop-blur-xl border-b border-border shadow-sm flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-secondary rounded-lg text-text-muted transition-colors focus:outline-none">
                    {isMobile ? <Menu size={22} /> : (lang === 'ar' ? (isSidebarOpen ? <ChevronRight size={20} /> : <Menu size={20} />) : (isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />))}
                </button>
                <div className="hidden md:flex items-center relative w-64 lg:w-96 group">
                   <Search size={18} className={`absolute ${lang === 'ar' ? 'right-3' : 'left-3'} text-text-muted group-focus-within:text-primary transition-colors`} />
                   <input type="text" placeholder={t('search.placeholder')} className={`w-full ${lang === 'ar' ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 bg-secondary border-none rounded-full text-sm font-medium text-text focus:ring-2 focus:ring-primary/20 focus:bg-surface transition-all placeholder:text-text-muted`} />
                </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
                {/* Theme Toggle */}
                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-full border border-border bg-surface hover:bg-secondary text-text-muted transition-all hover:shadow-sm"
                    title="Toggle Theme"
                >
                    {mode === 'dark' ? <Sun size={18} className="text-accent" /> : <Moon size={18} className="text-primary" />}
                </button>

                {/* Language Toggle */}
                <button onClick={toggleLang} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-border bg-surface hover:bg-secondary text-xs md:text-sm font-medium text-text-muted transition-all hover:shadow-sm">
                    <Globe size={14} className="text-primary" />
                    <span className="hidden md:inline">{lang === 'en' ? 'Arabic' : 'English'}</span>
                    <span className="md:hidden">{lang === 'en' ? 'AR' : 'EN'}</span>
                </button>
                {/* Dev role switcher (localhost only) */}
                {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                  <select
                    aria-label="Role switcher"
                    value={currentUserRole}
                    onChange={(e) => setRole(e.target.value as any)}
                    className="hidden md:inline-block bg-surface border border-border rounded-md text-sm px-2 py-1 ml-2"
                    title="Dev: switch role"
                  >
                    <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                    <option value="CEO">CEO</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="WAREHOUSE">WAREHOUSE</option>
                    <option value="ACCOUNTING">ACCOUNTING</option>
                    <option value="HR">HR</option>
                    <option value="PRODUCTION_MANAGER">PRODUCTION_MANAGER</option>
                    <option value="PARTNER">PARTNER</option>
                  </select>
                )}
                
                <div className={`flex items-center gap-3 ${lang === 'ar' ? 'pr-2 md:pr-4 border-r' : 'pl-2 md:pl-4 border-l'} border-border`}>
                  <button className="p-2 text-text-muted hover:text-primary hover:bg-secondary rounded-full transition-colors relative"><Bell size={20} /><span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span></button>
                  <div className="flex items-center gap-3">
                      <div className={`text-${lang === 'ar' ? 'left' : 'right'} hidden md:block leading-tight`}>
                        <p className="text-sm font-bold text-text">{currentUserRole}</p>
                        <p className="text-[10px] text-text-muted uppercase tracking-wide">{t(`role.${currentUserRole.toLowerCase()}`)}</p>
                      </div>
                      <div className="h-9 w-9 md:h-10 md:w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold shadow-md cursor-pointer hover:scale-105 transition-transform">{currentUserRole.charAt(0)}</div>
                  </div>
                </div>
            </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background relative custom-scrollbar">
            <div className="relative z-10 p-4 md:p-8 max-w-7xl mx-auto">
                <Outlet />
            </div>
        </main>
        <AIChatbot />
      </div>
    </div>
  );
};

export default Layout;
