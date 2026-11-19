import React, { useState } from 'react';
import { KeyRound, Mail, UserPlus, LogIn, X, ShieldAlert, Terminal, Sparkles } from 'lucide-react';
import { User } from '../types';
import { apiRegister, apiLogin } from '../lib/api';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: User, initialProgress?: any, labNotes?: any[]) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isSignUp) {
      if (!email.trim() || !password.trim() || !username.trim()) {
        setError('All credentials must be provided.');
        return;
      }

      if (password.length < 8) {
        setError('Operator passcode must be at least 8 characters.');
        return;
      }

      try {
        setSuccess('INITIALIZING SECURED CLEARANCES...');
        const data = await apiRegister(email.trim(), password, username.trim());
        
        setSuccess('PROFILE INITIALIZED! SECURING CREDENTIALS...');
        setTimeout(() => {
          onAuthSuccess(data.user, data.progress, []);
          onClose();
          setEmail('');
          setPassword('');
          setUsername('');
          setSuccess(null);
        }, 1200);
      } catch (err: any) {
        setError(err.message || 'Registration failed');
        setSuccess(null);
      }

    } else {
      if (!email.trim() || !password.trim()) {
        setError('Please insert both email and passcode.');
        return;
      }

      try {
        setSuccess('DECRYPTING DEPLOYMENT PROTOCOLS...');
        const data = await apiLogin(email.trim(), password);

        setSuccess('ACCESS GRANTED. SYNCING TERMINAL...');
        setTimeout(() => {
          onAuthSuccess(data.user, data.progress, data.labNotes);
          onClose();
          setEmail('');
          setPassword('');
          setSuccess(null);
        }, 1000);
      } catch (err: any) {
        setError(err.message || 'Access Denied: credentials mismatch.');
        setSuccess(null);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md transition-opacity">
      <div 
        id="auth-modal-card"
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.15)] flex flex-col relative"
      >
        {/* Aesthetic Scanlines Indicator */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500" />

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute right-4 top-4 p-1 rounded-full text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header Block */}
        <div className="p-6 border-b border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded bg-blue-950 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Terminal className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
                CYBERCORE AUTHENTICATION
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </h3>
              <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-wider">
                {isSignUp ? 'Initialize Operator Clearances' : 'Validate Security Node Signature'}
              </p>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleAction} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-500/20 rounded text-red-400 text-xs font-mono flex items-start gap-2 animate-bounce">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider">Exception Blocked</p>
                <p className="text-[11px] text-red-300/90 leading-tight mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-950/30 border border-emerald-500/20 rounded text-emerald-400 text-xs font-mono flex items-start gap-2 animate-pulse">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
              <div>
                <p className="font-bold uppercase tracking-wider">Protocol Approved</p>
                <p className="text-[11px] text-emerald-300 mt-0.5">{success}</p>
              </div>
            </div>
          )}

          {isSignUp && (
            <div className="space-y-1.5 font-mono">
              <label className="text-slate-400 text-[10px] uppercase">Unique Operator Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-blue-400 text-xs">@</span>
                <input
                  type="text"
                  required
                  value={username.startsWith('@') ? username.substring(1) : username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="NetRunner_Zero"
                  className="w-full pl-7 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:border-blue-500/50 outline-none text-xs text-slate-200"
                />
              </div>
              <p className="text-[9px] text-slate-500 italic mt-0.5 leading-none">Choose a unique name handle for forum feeds & socials.</p>
            </div>
          )}

          <div className="space-y-1.5 font-mono">
            <label className="text-slate-400 text-[10px] uppercase">Operational Mailbox</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:border-blue-500/50 outline-none text-xs text-slate-200"
              />
            </div>
          </div>

          <div className="space-y-1.5 font-mono">
            <label className="text-slate-400 text-[10px] uppercase">Passcode Hash</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-600" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:border-blue-500/50 outline-none text-xs text-slate-200"
              />
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(59,130,246,0.15)] transition-all active:scale-[0.98]"
            >
              {isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
              {isSignUp ? 'INITIALIZE NEW CLEARANCE' : 'ESTABLISH CONNECT SECURE'}
            </button>

            {/* Toggle Signin/Signup */}
            <div className="text-center pt-2 border-t border-slate-800/50">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-[10px] font-mono text-blue-400 hover:text-blue-300 hover:underline transition-colors"
              >
                {isSignUp 
                  ? 'Existing Operator? Access Active Terminals' 
                  : 'New Cadet? Create Cryptographic Profile'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
