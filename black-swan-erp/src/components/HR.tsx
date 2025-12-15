
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Employee } from '../types';
import { 
  UserPlus, Users, DollarSign, Calendar, Briefcase, 
  MapPin, Phone, Mail, FileText, ChevronRight, ArrowLeft, 
  CheckCircle, User, CreditCard, Shield, Activity
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';

const HR: React.FC = () => {
  const { t, lang } = useTranslation();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await dataService.getEmployees();
    setEmployees(data);
  };

  const totalPayroll = employees.reduce((acc, curr) => 
    acc + curr.basicSalary + curr.housingAllowance + curr.transportAllowance + (curr.otherAllowances || 0), 0
  );

  const activeCount = employees.filter(e => e.status === 'Active').length;
  const leaveCount = employees.filter(e => e.status === 'On Leave').length;

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
        <PageHeader 
            title={t('hr.title')} 
            subtitle={t('hr.subtitle')}
            actions={
                <Button onClick={() => navigate('/hr/new')}>
                    <UserPlus size={18} className="mr-2" /> {t('hr.addEmployee')}
                </Button>
            }
        />

        {/* HR Dashboard Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl flex justify-between items-center relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-slate-400 mb-1 text-sm">{t('hr.totalPayroll')}</p>
                    <h2 className="text-3xl font-bold">{totalPayroll.toLocaleString()} {t('currency')}</h2>
                </div>
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center relative z-10">
                    <DollarSign size={24} className="text-[#D4A373]" />
                </div>
                <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-[#D4A373]/10 rounded-full blur-2xl"></div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <p className="text-slate-500 mb-1 text-sm">{t('hr.activeStaff')}</p>
                    <h2 className="text-3xl font-bold text-slate-800">{activeCount}</h2>
                </div>
                <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                    <Users size={24} />
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                    <p className="text-slate-500 mb-1 text-sm">{t('hr.onLeave')}</p>
                    <h2 className="text-3xl font-bold text-slate-800">{leaveCount}</h2>
                </div>
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Calendar size={24} />
                </div>
            </div>
        </div>

        {/* Employee Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {employees.map(emp => (
                <div 
                    key={emp.id} 
                    onClick={() => navigate(`/hr/${emp.id}/edit`)}
                    className="group bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-200 to-slate-100 group-hover:from-primary group-hover:to-primary transition-all duration-500"></div>
                    
                    <div className="flex items-start justify-between mb-4">
                        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xl border-2 border-white shadow-sm">
                            {getInitials(emp.name)}
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            emp.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                            {emp.status}
                        </span>
                    </div>
                    
                    <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-primary transition-colors">{emp.name}</h3>
                    <p className="text-slate-500 text-sm mb-4 flex items-center gap-1"><Briefcase size={14}/> {emp.role}</p>
                    
                    <div className="pt-4 border-t border-slate-100 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-slate-400">{t('hr.department')}</span>
                            <span className="font-medium text-slate-700">{emp.department}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">{t('hr.joined')}</span>
                            <span className="font-medium text-slate-700">{emp.joinDate}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default HR;
