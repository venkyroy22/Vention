import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { useTheme } from '../context/ThemeContext';

interface ClerkAuthProps {
  isSignUp?: boolean;
  setIsSignUp?: (val: boolean) => void;
}

const ClerkAuth: React.FC<ClerkAuthProps> = ({ isSignUp = false, setIsSignUp }) => {
  const { theme } = useTheme();

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      theme === 'dark' ? 'bg-black' : 'bg-white'
    }`}>
      <div className="absolute inset-0 overflow-hidden">
        <div className={`absolute -top-40 -right-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob ${
          theme === 'dark' ? 'bg-purple-600' : 'bg-purple-400'
        }`}></div>
        <div className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000 ${
          theme === 'dark' ? 'bg-indigo-600' : 'bg-indigo-400'
        }`}></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center gap-8">
        <div className="text-center">
          <h1 className={`text-5xl font-black font-outfit tracking-tight mb-2 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>VENTION</h1>
          <p className={`text-lg font-medium ${
            theme === 'dark' ? 'text-zinc-400' : 'text-slate-600'
          }`}>Unified Workspace Platform</p>
        </div>

        <div className={`w-full max-w-sm rounded-2xl shadow-2xl ${
          theme === 'dark' ? 'bg-zinc-900' : 'bg-white'
        }`}>
          {isSignUp ? <SignUp /> : <SignIn />}
        </div>

        {setIsSignUp && (
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className={`text-sm font-medium transition-colors ${
              theme === 'dark'
                ? 'text-zinc-400 hover:text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ClerkAuth;
