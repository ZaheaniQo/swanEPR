
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dataService } from '../services/dataService';
import { useApp, useTranslation } from '../AppContext';
import { Shield, Globe2, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { showToast } = useApp();
  const { t, toggleLang, lang, dir } = useTranslation();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const data = await dataService.signInWithPassword(email, password);
      const passwordChanged = !!data.session?.user?.user_metadata?.password_changed;

      showToast(t('auth.loggedIn'), 'success');
      navigate(passwordChanged ? '/dashboard' : '/change-password', { replace: true });
    } catch (err: any) {
      const message = err?.message || t('auth.failed');
      setErrorMsg(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4" dir={dir}>
      <div className="absolute top-6 right-6 flex items-center gap-3 text-white text-sm">
        <button onClick={toggleLang} className="flex items-center gap-2 border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/10 transition-colors">
          <Globe2 size={16} /> {lang === 'ar' ? 'English' : 'العربية'}
        </button>
      </div>

      <div className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-lg border border-white/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-500/30">
            <Shield size={28} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Black Swan</p>
            <h2 className="text-2xl font-bold text-slate-900">ERP Access</h2>
            <p className="text-slate-500 text-sm">Supabase Auth • Secure workspace</p>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.email')}</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth.password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white pr-12"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute top-1/2 -translate-y-1/2 right-3 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 border border-red-200 rounded-lg px-3 py-2 text-sm">
              <div className="mt-0.5">!</div>
              <div className="leading-tight">
                <p className="font-semibold">{t('auth.failed')}</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}
          
          <button 
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-teal-600 to-emerald-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-teal-500/30 transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-0.5'}`}
          >
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
          <p className="text-xs text-slate-500 text-center">{t('auth.note')}</p>
        </form>
      </div>
    </div>
  );
};

export default Login;
