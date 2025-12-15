
import React, { useEffect, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { CompanySettings } from '../types';
import { Save, Building2, Palette } from 'lucide-react';

const Settings: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'company' | 'branding'>('company');
  const [settings, setSettings] = useState<CompanySettings>({
    legalName: '',
    vatNumber: '',
    crNumber: '',
    address: '',
    country: '',
    logoUrl: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await dataService.getCompanySettings();
    setSettings(s);
  };

  const handleSave = async () => {
    await dataService.updateCompanySettings(settings);
    showToast(lang === 'ar' ? 'تم حفظ الإعدادات بنجاح' : 'Settings saved successfully', 'success');
    // Force reload to apply branding changes if needed
    // window.location.reload(); 
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{lang === 'ar' ? 'الإعدادات' : 'Settings'}</h1>
            <p className="text-slate-500">{lang === 'ar' ? 'إدارة بيانات الشركة والمظهر' : 'Manage company details and appearance'}</p>
        </div>
        <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-teal-700 shadow-lg shadow-teal-200 transition-all"
        >
            <Save size={18} /> {lang === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button 
            onClick={() => setActiveTab('company')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'company' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Building2 size={18} /> {lang === 'ar' ? 'بيانات الشركة (الضريبة)' : 'Company Info (Tax)'}
        </button>
        <button 
            onClick={() => setActiveTab('branding')}
            className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'branding' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
            <Palette size={18} /> {lang === 'ar' ? 'العلامة التجارية' : 'Branding'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 min-h-[500px]">
          
          {/* Company Settings */}
          {activeTab === 'company' && (
              <div className="max-w-2xl space-y-6 animate-slide-in">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-start gap-3">
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

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'اسم الشركة القانوني' : 'Legal Company Name'}</label>
                      <input 
                        type="text" 
                        className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                        value={settings.legalName}
                        onChange={e => setSettings({...settings, legalName: e.target.value})}
                      />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'الرقم الضريبي (VAT)' : 'VAT Registration Number'}</label>
                          <input 
                            type="text" 
                            className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-mono"
                            placeholder="3xxxxxxxxxxxxxx"
                            value={settings.vatNumber}
                            onChange={e => setSettings({...settings, vatNumber: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'رقم السجل التجاري' : 'CR Number'}</label>
                          <input 
                            type="text" 
                            className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 font-mono"
                            value={settings.crNumber}
                            onChange={e => setSettings({...settings, crNumber: e.target.value})}
                          />
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'العنوان الوطني' : 'National Address'}</label>
                      <input 
                        type="text" 
                        className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Building No, Street Name, District..."
                        value={settings.address}
                        onChange={e => setSettings({...settings, address: e.target.value})}
                      />
                  </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'المدينة' : 'City'}</label>
                          <input 
                            type="text" 
                            className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                            value={'Riyadh'} // Mocked for simplicity or added to type later
                            disabled
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'الدولة' : 'Country'}</label>
                          <select 
                            className="w-full border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                            value={settings.country}
                            onChange={e => setSettings({...settings, country: e.target.value})}
                          >
                              <option value="SA">Saudi Arabia</option>
                              <option value="AE">UAE</option>
                          </select>
                      </div>
                  </div>
              </div>
          )}

          {/* Branding Settings */}
          {activeTab === 'branding' && (
               <div className="max-w-2xl space-y-6 animate-slide-in">
                   <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">{lang === 'ar' ? 'رابط الشعار' : 'Logo URL'}</label>
                      <div className="flex gap-4 items-center">
                          <input 
                            type="text" 
                            className="flex-1 border-slate-300 rounded-lg focus:ring-teal-500 focus:border-teal-500"
                            placeholder="https://example.com/logo.png"
                            value={settings.logoUrl}
                            onChange={e => setSettings({...settings, logoUrl: e.target.value})}
                          />
                          {settings.logoUrl && (
                              <div className="w-12 h-12 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center p-1">
                                  <img src={settings.logoUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
                              </div>
                          )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                          {lang === 'ar' ? 'يظهر الشعار في أعلى القائمة الجانبية وفي الفواتير المطبوعة.' : 'Logo appears on the sidebar and printed invoices.'}
                      </p>
                  </div>
               </div>
          )}
      </div>
    </div>
  );
};

export default Settings;
