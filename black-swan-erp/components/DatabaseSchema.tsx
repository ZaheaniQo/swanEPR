import React from 'react';
import { useTranslation } from '../AppContext';
import { SQL_SCHEMA } from '../constants';
import { Database, Code } from 'lucide-react';

const DatabaseSchema: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('menu.database')}</h1>
            <p className="text-slate-500">Generated SQL Schema based on the ERP requirements.</p>
        </div>
        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <Database size={24} />
        </div>
      </div>

      <div className="bg-slate-900 rounded-xl overflow-hidden shadow-lg border border-slate-700">
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-2">
              <Code size={18} className="text-teal-400" />
              <span className="text-slate-300 font-mono text-sm">schema.sql</span>
          </div>
          <div className="p-6 overflow-auto max-h-[600px]">
              <pre className="font-mono text-sm text-teal-50">
                  {SQL_SCHEMA}
              </pre>
          </div>
      </div>
    </div>
  );
};

export default DatabaseSchema;