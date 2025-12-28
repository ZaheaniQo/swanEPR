import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation, useApp } from '../AppContext';
import { dataService } from '../services/dataService';
import { Employee, LeaveRecord } from '../types';
import { PageHeader } from './ui/PageHeader';
import { Button } from './ui/Button';
import { Input, Select, Textarea } from './ui/Input';
import { Calendar, Phone, Mail, CreditCard, Upload, ClipboardList, ShieldCheck, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

const EmployeeProfile: React.FC = () => {
  const { lang } = useTranslation();
  const { showToast, currentUser, setPasswordChanged } = useApp();

  const [profile, setProfile] = useState<Employee | null>(null);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [leaveType, setLeaveType] = useState<'Annual' | 'Sick' | 'Unpaid'>('Annual');
  const [leaveFrom, setLeaveFrom] = useState('');
  const [leaveTo, setLeaveTo] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  const [reqTitle, setReqTitle] = useState('');
  const [reqDesc, setReqDesc] = useState('');
  const [reqPriority, setReqPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const me = await dataService.getMyProfile();
        setProfile(me);
        if (me?.id) {
          const l = await dataService.getEmployeeLeaves(me.id);
          setLeaves(l);
        }
      } catch (e: any) {
        showToast(e?.message || 'تعذر تحميل الملف الشخصي', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [showToast]);

  const contractMeta = useMemo(() => {
    if (!profile?.joinDate || !profile.contractDurationDays) return { end: '', daysLeft: undefined as number | undefined };
    const start = new Date(profile.joinDate);
    const end = new Date(start);
    end.setDate(end.getDate() + Number(profile.contractDurationDays));
    const today = new Date();
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return { end: end.toISOString().split('T')[0], daysLeft: diff };
  }, [profile?.joinDate, profile?.contractDurationDays]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await dataService.updateMyProfile({
        phone: profile.phone,
        email: profile.email,
        iban: profile.iban,
        avatarUrl: profile.avatarUrl,
        adminNotes: profile.adminNotes
      });
      showToast(lang === 'ar' ? 'تم الحفظ' : 'Saved');
    } catch (e: any) {
      showToast(e?.message || 'تعذر الحفظ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUploadAvatar = async (file?: File | null) => {
    if (!file || !profile) return;
    try {
      const url = await dataService.uploadEmployeeFile(profile.id, file);
      setProfile(prev => prev ? { ...prev, avatarUrl: url } : prev);
      await dataService.updateMyProfile({ avatarUrl: url });
      showToast(lang === 'ar' ? 'تم تحديث الصورة' : 'Avatar updated');
    } catch (e: any) {
      showToast(e?.message || 'تعذر رفع الصورة', 'error');
    }
  };

  const submitLeave = async () => {
    if (!profile || !leaveFrom || !leaveTo) {
      showToast('أدخل التواريخ', 'error');
      return;
    }
    try {
      await dataService.requestLeaveApproval({
        employeeId: profile.id,
        employeeName: profile.name,
        from: leaveFrom,
        to: leaveTo,
        reason: leaveReason || leaveType
      });
      const l = await dataService.getEmployeeLeaves(profile.id);
      setLeaves(l);
      setLeaveReason(''); setLeaveFrom(''); setLeaveTo('');
      showToast(lang === 'ar' ? 'تم إرسال الطلب' : 'Request sent');
    } catch (e: any) {
      showToast(e?.message || 'تعذر إرسال الطلب', 'error');
    }
  };

  const submitOtherRequest = async () => {
    if (!reqTitle) { showToast('أدخل عنوان الطلب', 'error'); return; }
    try {
      await dataService.requestGeneralApproval({
        title: reqTitle,
        description: reqDesc,
        priority: reqPriority
      });
      setReqTitle(''); setReqDesc(''); setReqPriority('MEDIUM');
      showToast(lang === 'ar' ? 'تم إرسال الطلب' : 'Request submitted');
    } catch (e: any) {
      showToast(e?.message || 'تعذر الإرسال', 'error');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
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
    setPwdLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPwd, data: { password_changed: true } });
      if (error) throw error;
      setPasswordChanged(true);
      showToast(lang === 'ar' ? 'تم تحديث كلمة المرور' : 'Password updated');
      setNewPwd('');
      setConfirmPwd('');
    } catch (err: any) {
      showToast(err?.message || (lang === 'ar' ? 'تعذر تحديث كلمة المرور' : 'Failed to update password'), 'error');
    } finally {
      setPwdLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center">...{lang === 'ar' ? 'جار التحميل' : 'Loading'}...</div>;
  if (!profile) return <div className="p-10 text-center text-red-600">{lang === 'ar' ? 'لم يتم العثور على ملف موظف مرتبط بهذا الحساب' : 'No employee profile linked to this account.'}</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === 'ar' ? 'ملفي الشخصي' : 'My Employee Profile'}
        subtitle={currentUser?.email || ''}
        actions={
          <Button onClick={handleSave} disabled={saving}>{saving ? (lang === 'ar' ? 'جار الحفظ...' : 'Saving...') : (lang === 'ar' ? 'حفظ' : 'Save')}</Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex gap-4 items-center">
            <div className="relative">
              <img src={profile.avatarUrl || 'https://placehold.co/96x96'} alt="avatar" className="w-24 h-24 rounded-full object-cover border" />
              <label className="absolute bottom-0 right-0 bg-slate-900 text-white rounded-full p-2 cursor-pointer hover:bg-slate-800">
                <Upload size={16} />
                <input type="file" className="hidden" accept="image/*" onChange={e => handleUploadAvatar(e.target.files?.[0] || null)} />
              </label>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{profile.name}</h2>
              <p className="text-slate-500 text-sm">{profile.department} • {profile.role}</p>
              <p className="text-xs text-slate-400 mt-1">{lang === 'ar' ? 'الدور النظامي' : 'System role'}: {profile.systemRole || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={lang === 'ar' ? 'الجوال' : 'Phone'} value={profile.phone || ''} onChange={e => setProfile({ ...profile, phone: e.target.value })} icon={<Phone size={16} />} />
            <Input label={lang === 'ar' ? 'البريد' : 'Email'} value={profile.email || ''} onChange={e => setProfile({ ...profile, email: e.target.value })} icon={<Mail size={16} />} />
            <Input label={lang === 'ar' ? 'رقم الآيبان' : 'IBAN'} value={profile.iban || ''} onChange={e => setProfile({ ...profile, iban: e.target.value })} icon={<CreditCard size={16} />} />
            <Input label={lang === 'ar' ? 'ملاحظات (داخلية)' : 'Notes'} value={profile.adminNotes || ''} onChange={e => setProfile({ ...profile, adminNotes: e.target.value })} />
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl shadow-lg p-6 space-y-3">
          <div className="flex items-center gap-2 text-slate-200 text-sm"><ShieldCheck size={16}/> {lang === 'ar' ? 'حالة' : 'Status'}: <span className="font-bold">{profile.status}</span></div>
          <div className="flex items-center gap-2 text-slate-200 text-sm"><Calendar size={16}/> {lang === 'ar' ? 'تاريخ الانضمام' : 'Joined'}: {profile.joinDate}</div>
          <div className="text-slate-200 text-sm">{lang === 'ar' ? 'ينتهي العقد' : 'Contract ends'}: <span className="font-semibold">{contractMeta.end || '—'}</span></div>
          {contractMeta.daysLeft !== undefined && (
            <div className={`text-sm ${contractMeta.daysLeft <= 30 ? 'text-amber-200' : 'text-emerald-200'}`}>
              {lang === 'ar' ? 'أيام متبقية: ' : 'Days left: '}{contractMeta.daysLeft}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold"><Calendar size={18}/> {lang === 'ar' ? 'طلب إجازة' : 'Leave Request'}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select value={leaveType} onChange={e => setLeaveType(e.target.value as any)} label={lang === 'ar' ? 'نوع الإجازة' : 'Type'}>
              <option value="Annual">Annual</option>
              <option value="Sick">Sick</option>
              <option value="Unpaid">Unpaid</option>
            </Select>
            <Input type="date" label={lang === 'ar' ? 'من' : 'From'} value={leaveFrom} onChange={e => setLeaveFrom(e.target.value)} />
            <Input type="date" label={lang === 'ar' ? 'إلى' : 'To'} value={leaveTo} onChange={e => setLeaveTo(e.target.value)} />
            <Textarea rows={3} label={lang === 'ar' ? 'السبب' : 'Reason'} value={leaveReason} onChange={e => setLeaveReason(e.target.value)} />
          </div>
          <div className="flex justify-end"><Button onClick={submitLeave}>{lang === 'ar' ? 'إرسال للموافقة' : 'Submit'}</Button></div>
          <div className="border-t pt-3 space-y-2 max-h-60 overflow-auto">
            {leaves.length === 0 && <div className="text-slate-500 text-sm">{lang === 'ar' ? 'لا توجد طلبات' : 'No requests yet'}</div>}
            {leaves.map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm border border-slate-100 rounded-lg p-2">
                <div>
                  <div className="font-semibold text-slate-800">{l.type}</div>
                  <div className="text-slate-500 text-xs">{l.startDate} → {l.endDate}</div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${l.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : l.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold"><ClipboardList size={18}/> {lang === 'ar' ? 'طلب آخر' : 'Other Request'}</div>
          <Input label={lang === 'ar' ? 'العنوان' : 'Title'} value={reqTitle} onChange={e => setReqTitle(e.target.value)} />
          <Textarea label={lang === 'ar' ? 'الوصف' : 'Description'} rows={3} value={reqDesc} onChange={e => setReqDesc(e.target.value)} />
          <Select label={lang === 'ar' ? 'الأولوية' : 'Priority'} value={reqPriority} onChange={e => setReqPriority(e.target.value as any)}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </Select>
          <div className="flex justify-end"><Button onClick={submitOtherRequest}>{lang === 'ar' ? 'إرسال' : 'Submit'}</Button></div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <AlertCircle size={14}/> {lang === 'ar' ? 'تذهب إلى فريق الموارد البشرية للموافقة' : 'Sent to HR/approver queue'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 text-slate-700 font-bold"><ShieldCheck size={18}/> {lang === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</div>
          <form onSubmit={handlePasswordChange} className="space-y-3">
            <Input type="password" label={lang === 'ar' ? 'كلمة المرور الجديدة' : 'New password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
            <Input type="password" label={lang === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} />
            <div className="flex justify-end">
              <Button type="submit" loading={pwdLoading} disabled={pwdLoading}>{lang === 'ar' ? 'حفظ' : 'Save'}</Button>
            </div>
          </form>
          <p className="text-xs text-slate-500">{lang === 'ar' ? 'يمكنك تحديث كلمة المرور الخاصة بك في أي وقت من هنا.' : 'You can change your password anytime from your profile.'}</p>
        </div>
      </div>
    </div>
  );
};

export default EmployeeProfile;
