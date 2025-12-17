import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { Button } from './ui/Button';
import { ShieldCheck } from 'lucide-react';

const Pending: React.FC = () => {
  const { lang } = useTranslation();
  const { signOut } = useApp();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-lg p-8 border border-slate-200 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
          <ShieldCheck size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">{lang === 'ar' ? 'بانتظار الموافقة' : 'Awaiting approval'}</h1>
        <p className="text-slate-600">
          {lang === 'ar'
            ? 'تم إنشاء حسابك، وسيقوم المسؤول بتفعيل وصولك قريبًا.'
            : 'Your account is created. An administrator will activate your access shortly.'}
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Button variant="secondary" onClick={() => navigate('/login')}>
            {lang === 'ar' ? 'عودة لتسجيل الدخول' : 'Back to login'}
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            {lang === 'ar' ? 'تسجيل الخروج' : 'Sign out'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Pending;
