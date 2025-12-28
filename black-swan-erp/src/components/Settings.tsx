
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { useTheme } from '../theme/ThemeContext';
import { CompanySettings } from '../types';
import { 
  Save, Building2, Palette, ShieldCheck, Globe, 
  Upload, Monitor, Moon, Sun, Type, Layout, Check
} from 'lucide-react';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { PageHeader } from './ui/PageHeader';

const Settings: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const { updateBranding, primaryColor, accentColor, mode, fontFamily } = useTheme();
  
  const [activeTab, setActiveTab] = useState<'company' | 'branding' | 'compliance'>('company');
  const [isLoading, setIsLoading] = useState(false);
  
  // Local state for form data
  const [formData, setFormData] = useState<CompanySettings>({
    legalName: '',
    vatNumber: '',
    crNumber: '',
    address: '',
    country: 'SA',
    logoUrl: '',
    zakatEntityType: 'Enterprise',
    calendarType: 'Gregorian'
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await dataService.getCompanySettings();
    setFormData(prev => ({ ...prev, ...s }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
        await dataService.updateCompanySettings(formData);
        // Also persist branding preferences to DB via context
        await updateBranding({ 
            primaryColor,
            accentColor,
            mode,
            fontFamily,
            logoUrl: formData.logoUrl
        });
        showToast(t('msg.saved'), 'success');
    } catch (e) {
        showToast('Error saving settings', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  // --- Live Preview Handlers ---
  const handleColorChange = (key: 'primaryColor' | 'accentColor', value: string) => {
      // Immediate visual feedback
      updateBranding({ [key]: value });
  };

  const handleModeChange = (newMode: 'light' | 'dark' | 'system') => {
      updateBranding({ mode: newMode });
  };

  const handleFontChange = (newFont: string) => {
      updateBranding({ fontFamily: newFont });
  };

  // --- Renderers ---

  const renderTabs = () => (
      <div className="flex overflow-x-auto space-x-1 border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'company' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
          >
              <Building2 size={18} /> {lang === 'ar' ? 'البيانات الأساسية' : 'Company Profile'}
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'compliance' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
          >
              <ShieldCheck size={18} /> {lang === 'ar' ? 'الامتثال الضريبي' : 'Tax & Compliance'}
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'branding' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
          >
              <Palette size={18} /> {lang === 'ar' ? 'المظهر والهوية' : 'Look & Feel'}
          </button>
      </div>
  );

  const renderCompanyForm = () => (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
              <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'معلومات المنشأة' : 'Organization Details'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3 mb-4">
                      <Building2 className="text-blue-600 mt-1" size={20} />
                      <div>
                          <h3 className="font-bold text-blue-800 text-sm">{lang === 'ar' ? 'متطلبات الفاتورة الإلكترونية' : 'ZATCA E-Invoicing Requirements'}</h3>
                          <p className="text-xs text-blue-600 mt-1">
                              {lang === 'ar' 
                                ? 'هذه البيانات إلزامية وستظهر في الفواتير الضريبية ورمز الاستجابة السريعة (QR).' 
                                : 'These details are mandatory and will appear on Tax Invoices and QR Codes.'}
                          </p>
                      </div>
                  </div>

                  <Input 
                    label={lang === 'ar' ? 'الاسم القانوني' : 'Legal Name'} 
                    value={formData.legalName} 
                    onChange={e => setFormData({...formData, legalName: e.target.value})} 
                  />
                  <div className="grid grid-cols-2 gap-4">
                      <Input 
                        label={lang === 'ar' ? 'رقم السجل التجاري' : 'CR Number'} 
                        value={formData.crNumber} 
                        onChange={e => setFormData({...formData, crNumber: e.target.value})} 
                      />
                      <Input 
                        label={lang === 'ar' ? 'الرقم الضريبي' : 'VAT Number'} 
                        value={formData.vatNumber} 
                        onChange={e => setFormData({...formData, vatNumber: e.target.value})} 
                      />
                  </div>
                  <Textarea 
                    label={lang === 'ar' ? 'العنوان الوطني' : 'National Address'} 
                    value={formData.address} 
                    onChange={e => setFormData({...formData, address: e.target.value})} 
                  />
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الشعار' : 'Logo'}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                  <div className="w-40 h-40 rounded-full border-4 border-dashed border-border flex items-center justify-center overflow-hidden bg-secondary/20 relative group">
                      {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                          <Building2 size={48} className="text-text-muted" />
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                          <Upload className="text-white" />
                      </div>
                  </div>
                  <div className="w-full">
                      <Input 
                        label={lang === 'ar' ? 'رابط الشعار' : 'Logo URL'} 
                        value={formData.logoUrl} 
                        onChange={e => {
                            setFormData({...formData, logoUrl: e.target.value});
                            updateBranding({ logoUrl: e.target.value });
                        }} 
                        placeholder="https://..."
                      />
                      <p className="text-xs text-text-muted mt-2 text-center">
                          {lang === 'ar' ? 'يفضل استخدام صورة مربعة بخلفية شفافة' : 'Recommended: Square PNG with transparent background'}
                      </p>
                  </div>
              </CardContent>
          </Card>
      </div>
  );

  const renderBrandingForm = () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Theme Mode */}
          <Card className="lg:col-span-1">
              <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الوضع' : 'Theme Mode'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={() => handleModeChange('light')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                      >
                          <Sun size={24} />
                          <span className="text-xs font-bold">Light</span>
                      </button>
                      <button 
                        onClick={() => handleModeChange('dark')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                      >
                          <Moon size={24} />
                          <span className="text-xs font-bold">Dark</span>
                      </button>
                      <button 
                        onClick={() => handleModeChange('system')}
                        className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${mode === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                      >
                          <Monitor size={24} />
                          <span className="text-xs font-bold">System</span>
                      </button>
                  </div>
              </CardContent>
          </Card>

          {/* Colors */}
          <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'ألوان الهوية' : 'Brand Colors'}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                      <label className="block text-sm font-medium mb-2">{lang === 'ar' ? 'اللون الأساسي' : 'Primary Color'}</label>
                      <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={primaryColor}
                            onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                            className="h-12 w-12 rounded-lg cursor-pointer border-none"
                          />
                          <div className="flex-1">
                              <Input 
                                value={primaryColor} 
                                onChange={(e) => handleColorChange('primaryColor', e.target.value)}
                              />
                          </div>
                      </div>
                      <p className="text-xs text-text-muted mt-2">Used for buttons, links, and active states.</p>
                  </div>

                  <div>
                      <label className="block text-sm font-medium mb-2">{lang === 'ar' ? 'اللون الثانوي' : 'Accent Color'}</label>
                      <div className="flex items-center gap-4">
                          <input 
                            type="color" 
                            value={accentColor}
                            onChange={(e) => handleColorChange('accentColor', e.target.value)}
                            className="h-12 w-12 rounded-lg cursor-pointer border-none"
                          />
                          <div className="flex-1">
                              <Input 
                                value={accentColor} 
                                onChange={(e) => handleColorChange('accentColor', e.target.value)}
                              />
                          </div>
                      </div>
                      <p className="text-xs text-text-muted mt-2">Used for highlights, badges, and secondary actions.</p>
                  </div>
              </CardContent>
          </Card>

          {/* Typography */}
          <Card className="lg:col-span-3">
              <CardHeader>
                  <CardTitle>{lang === 'ar' ? 'الخطوط' : 'Typography'}</CardTitle>
              </CardHeader>
              <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button 
                        onClick={() => handleFontChange('Inter')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${fontFamily === 'Inter' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                      >
                          <div className="font-sans text-2xl mb-2">Aa</div>
                          <div className="font-bold">Inter (Default)</div>
                          <div className="text-xs text-text-muted">Clean, modern sans-serif</div>
                      </button>
                      <button 
                        onClick={() => handleFontChange('Cairo')}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${fontFamily === 'Cairo' ? 'border-primary bg-primary/5' : 'border-border hover:bg-secondary'}`}
                        style={{ fontFamily: 'Cairo' }}
                      >
                          <div className="text-2xl mb-2">أب</div>
                          <div className="font-bold">Cairo</div>
                          <div className="text-xs text-text-muted">Modern Arabic typography</div>
                      </button>
                  </div>
              </CardContent>
          </Card>
      </div>
  );

  const renderComplianceForm = () => (
      <Card>
          <CardHeader>
              <CardTitle>{lang === 'ar' ? 'إعدادات الزكاة والضريبة' : 'ZATCA & Tax Settings'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Select 
                    label={lang === 'ar' ? 'نوع الكيان' : 'Entity Type'}
                    value={formData.zakatEntityType}
                    onChange={e => setFormData({...formData, zakatEntityType: e.target.value as CompanySettings['zakatEntityType']})}
                  >
                      <option value="Enterprise">Enterprise (Individual)</option>
                      <option value="Company">Company (LLC/JSC)</option>
                      <option value="NonProfit">Non-Profit</option>
                  </Select>
                  <Select 
                    label={lang === 'ar' ? 'التقويم المالي' : 'Fiscal Calendar'}
                    value={formData.calendarType}
                    onChange={e => setFormData({...formData, calendarType: e.target.value as CompanySettings['calendarType']})}
                  >
                      <option value="Gregorian">Gregorian (Miladi)</option>
                      <option value="Hijri">Hijri</option>
                  </Select>
              </div>
              
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
                  <div className="font-bold flex items-center gap-2 mb-2">
                      <ShieldCheck size={16} />
                      {lang === 'ar' ? 'تنبيه الامتثال' : 'Compliance Notice'}
                  </div>
                  {lang === 'ar' 
                    ? 'تأكد من صحة الرقم الضريبي والعنوان الوطني لتجنب رفض الفواتير من هيئة الزكاة والضريبة والجمارك.' 
                    : 'Ensure VAT Number and National Address are correct to avoid rejection of invoices by ZATCA.'}
              </div>
          </CardContent>
      </Card>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <PageHeader 
        title={t('menu.settings')} 
        subtitle={t('settings.subtitle') || 'Manage your organization profile and preferences'}
        actions={
            <Button onClick={handleSave} loading={isLoading}>
                <Save size={18} className="mr-2" /> {t('btn.saveChanges')}
            </Button>
        }
      />

      {renderTabs()}

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'company' && renderCompanyForm()}
          {activeTab === 'branding' && renderBrandingForm()}
          {activeTab === 'compliance' && renderComplianceForm()}
      </div>
    </div>
  );
};

export default Settings;
