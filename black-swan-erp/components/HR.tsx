
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../AppContext';
import { dataService } from '../services/dataService';
import { Employee } from '../types';
import { UserPlus, CreditCard } from 'lucide-react';

const HR: React.FC = () => {
  const { t } = useTranslation();
  const [employees, setEmployees] = useState<Employee[]>([]);

  useEffect(() => {
    dataService.getEmployees().then(setEmployees);
  }, []);

    const totalPayroll = employees.reduce((acc, curr) => acc + (curr.basicSalary || 0) + (curr.housingAllowance || 0) + (curr.transportAllowance || 0) + (curr.otherAllowances || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('hr.title')}</h1>
            <p className="text-slate-500">{t('hr.subtitle')}</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            <UserPlus size={18} /> {t('hr.addEmployee')}
        </button>
      </div>

      <div className="bg-indigo-900 text-white p-6 rounded-xl shadow-lg flex justify-between items-center">
          <div>
              <p className="text-indigo-200 mb-1">{t('hr.totalPayroll')}</p>
              <h2 className="text-3xl font-bold">${totalPayroll.toLocaleString()}</h2>
          </div>
          <div className="h-12 w-12 bg-white/10 rounded-lg flex items-center justify-center">
              <CreditCard size={24} />
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map(emp => (
              <div key={emp.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold text-lg">
                              {emp.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="font-bold text-slate-800">{emp.name}</h3>
                              <p className="text-sm text-slate-500">{emp.role}</p>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-2 text-sm">
                      <div className="flex justify-between text-slate-600">
                          <span>{t('hr.department')}:</span>
                          <span className="font-medium text-slate-800">{emp.department}</span>
                      </div>
                       <div className="flex justify-between text-slate-600">
                          <span>{t('hr.salary')}:</span>
                          <span className="font-medium text-slate-800">${emp.salary.toLocaleString()}</span>
                      </div>
                       <div className="flex justify-between text-slate-600">
                          <span>{t('hr.joined')}:</span>
                          <span className="font-medium text-slate-800">{emp.joinDate}</span>
                      </div>
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};

export default HR;
