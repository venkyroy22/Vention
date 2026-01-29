
import React, { useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/clerk-react';
import { useTheme } from '../context/ThemeContext';

interface AuthProps {
  onLogin?: (payload: { email: string; password: string; name?: string; mode: 'login' | 'signup'; avatar?: string }) => Promise<void> | void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const { theme } = useTheme();
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (mode === 'login' && signIn) {
        await signIn.create({
          identifier: email,
          password
        });
      } else if (mode === 'signup' && signUp) {
        await signUp.create({
          emailAddress: email,
          password,
          firstName: name
        });
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[200] flex items-center justify-center overflow-hidden font-inter transition-colors ${
      theme === 'dark' ? 'bg-[#050507]' : 'bg-white'
    }`}>
      {/* Dynamic Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {theme === 'dark' && (
          <>
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/20 blur-[160px] rounded-full animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-purple-600/20 blur-[160px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
          </>
        )}
      </div>

      <div className="relative w-full max-w-[440px] px-6 animate-slide-in">
        <div className={`rounded-[48px] p-8 md:p-12 shadow-3xl backdrop-blur-3xl transition-colors ${
          theme === 'dark'
            ? 'glass-dark border border-white/10'
            : 'bg-white border border-slate-200'
        }`}>
          <div className="text-center space-y-2 mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-indigo-500 shadow-xl shadow-indigo-500/20 mb-4">
              <span className="text-2xl font-black text-white">V</span>
            </div>
            <h1 className={`text-3xl font-outfit font-black tracking-tighter ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              {mode === 'login' ? 'Welcome Back' : 'Join Vention'}
            </h1>
            <p className={`text-sm font-medium ${
              theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
            }`}>
              {mode === 'login' ? 'Enter your details to continue' : 'The unified productivity workspace'}
            </p>
          </div>

          <div className="space-y-4">
            {error && (
              <div className={`w-full p-3 rounded-2xl border text-sm text-center transition-colors ${
                theme === 'dark'
                  ? 'bg-red-500/10 border-red-500/30 text-red-200'
                  : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                  }`}>Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={`w-full border rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 transition-all text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/5 text-white placeholder:text-zinc-700'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500'
                    }`}
                    placeholder="Enter your name"
                  />
                </div>
              )}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                    theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                  }`}>Avatar URL (optional)</label>
                  <input
                    type="url"
                    value={avatar}
                    onChange={(e) => setAvatar(e.target.value)}
                    className={`w-full border rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 transition-all text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/5 text-white placeholder:text-zinc-700'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500'
                    }`}
                    placeholder="https://..."
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                }`}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`w-full border rounded-2xl px-5 py-3.5 outline-none focus:border-indigo-500 transition-all text-sm font-medium ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/5 text-white placeholder:text-zinc-700'
                      : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500'
                  }`}
                  placeholder="name@gmail.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className={`text-[10px] font-black uppercase tracking-widest ml-1 ${
                  theme === 'dark' ? 'text-zinc-500' : 'text-slate-600'
                }`}>Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className={`w-full border rounded-2xl px-5 py-3.5 pr-12 outline-none focus:border-indigo-500 transition-all text-sm font-medium ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/5 text-white placeholder:text-zinc-700'
                        : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-500'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors p-1 ${
                      theme === 'dark'
                        ? 'text-zinc-400 hover:text-indigo-400'
                        : 'text-slate-500 hover:text-indigo-600'
                    }`}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 001 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm5.31-7.78l3.15 3.15.02-.02c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16c.59-.05 1.17-.1 1.76-.1 1.4 0 2.74.25 3.98.7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="relative w-full bg-indigo-500 hover:bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/20 disabled:opacity-50 mt-4 overflow-hidden"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span>{mode === 'login' ? 'Login to Workspace' : 'Create Account'}</span>
                )}
              </button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className={`text-sm font-bold transition-colors ${
                theme === 'dark'
                  ? 'text-zinc-500 hover:text-indigo-400'
                  : 'text-slate-600 hover:text-indigo-600'
              }`}
            >
              {mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Log in"}
            </button>
          </div>
        </div>

        <p className={`mt-8 text-center text-xs font-medium max-w-[300px] mx-auto leading-relaxed ${
          theme === 'dark' ? 'text-zinc-600' : 'text-slate-500'
        }`}>
          By continuing, you agree to Vention's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default Auth;
