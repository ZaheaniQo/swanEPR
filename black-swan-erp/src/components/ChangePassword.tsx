import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation, useApp } from '../AppContext';
import { supabase } from '../services/supabaseClient';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { PageHeader } from './ui/PageHeader';

type ChangePasswordProps = {
  forceMode?: boolean;
};

const ChangePassword: React.FC<ChangePasswordProps> = ({ forceMode }) => {
  const { lang } = useTranslation();
  const { showToast, setPasswordChanged } = useApp();
  const navigate = useNavigate();

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPwd || !confirmPwd) {
      showToast(lang === 'ar' ? 'أدخل كلمة المرور' : 'Enter password', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      showToast(lang === 'ar' ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match', 'error');
      return;
    }
    if (newPwd.length < 6) {
      showToast(lang === 'ar' ? 'الحد الأدنى 6 أحرف' : 'Minimum 6 characters', 'error');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd, data: { password_changed: true } });
      if (error) throw error;
      setPasswordChanged(true);
      showToast(lang === 'ar' ? 'تم تحديث كلمة المرور' : 'Password updated');
      setNewPwd('');
      setConfirmPwd('');
      if (forceMode) {
        navigate('/');
      }
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'تعذر تحديث كلمة المرور' : 'Failed to update password'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'} subtitle={lang === 'ar' ? 'الرجاء تعيين كلمة مرور قوية' : 'Please set a strong password'} />
      <form onSubmit={handleChange} className="max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <Input type="password" label={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
        <Input type="password" label={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
        <div className="flex justify-end">
          <Button type="submit" loading={loading} disabled={loading}>{lang === 'ar' ? 'حفظ' : 'Save'}</Button>
        </div>
      </form>
    </div>
  );
};

export default ChangePassword;
