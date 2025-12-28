import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const Signup: React.FC = () => {
  const { t, lang } = useTranslation();
  const { showToast } = useApp();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      showToast(lang === 'ar' ? 'املأ كل الحقول' : 'Fill all fields', 'error');
      return;
    }
    setLoading(true);
    try {
      await dataService.signUpAndRequestAccess({ fullName, email, password });
      showToast(lang === 'ar' ? 'تم التسجيل، في انتظار الموافقة' : 'Signed up, awaiting approval');
      navigate('/pending');
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'فشل التسجيل' : 'Signup failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md p-8 border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{lang === 'ar' ? 'إنشاء حساب' : 'Create account'}</h1>
        <p className="text-slate-500 mb-6 text-sm">{lang === 'ar' ? 'سيتم تفعيل الحساب بعد الموافقة' : 'Your account will be activated after approval.'}</p>

        <form className="space-y-4" onSubmit={handleSignup}>
          <Input label={lang === 'ar' ? 'الاسم الكامل' : 'Full name'} value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label={lang === 'ar' ? 'البريد الإلكتروني' : 'Email'} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={lang === 'ar' ? 'كلمة المرور' : 'Password'} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <Button type="submit" className="w-full" loading={loading} disabled={loading}>
            {lang === 'ar' ? 'تسجيل' : 'Sign up'}
          </Button>
        </form>

        <div className="text-sm text-slate-500 mt-4 text-center">
          {lang === 'ar' ? 'لديك حساب؟' : 'Already have an account?'}{' '}
          <Link to="/login" className="text-primary font-semibold">{lang === 'ar' ? 'تسجيل الدخول' : 'Log in'}</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
