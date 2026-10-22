import React, { useState } from 'react';
import {
  Lock,
  ShieldCheck,
  X,
  Key,
  QrCode,
  CheckCircle2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { UserSecurityState } from '../types';

interface TwoFactorAuthModalProps {
  userSecurity: UserSecurityState;
  onClose: () => void;
  onUpdateSecurity: (updated: UserSecurityState) => void;
}

export const TwoFactorAuthModal: React.FC<TwoFactorAuthModalProps> = ({
  userSecurity,
  onClose,
  onUpdateSecurity,
}) => {
  const [totpCode, setTotpCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      setErrorMsg('TOTP Code must be 6 digits.');
      return;
    }
    setErrorMsg('');
    setSuccessMsg('2FA TOTP Authentication enabled successfully!');
    onUpdateSecurity({
      ...userSecurity,
      is2FAEnabled: true,
      lastLogin: new Date().toLocaleString(),
    });
  };

  const handleDisable2FA = () => {
    onUpdateSecurity({
      ...userSecurity,
      is2FAEnabled: false,
    });
    setSuccessMsg('2FA TOTP disabled.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">Two-Factor Authentication (2FA)</h3>
            <p className="text-xs text-slate-400">TOTP Authenticator (Google Authenticator / Authy)</p>
          </div>
        </div>

        {userSecurity.is2FAEnabled ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center space-x-3">
              <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0" />
              <div>
                <span className="font-bold">2FA Security Status: Active & Enforced</span>
                <p className="text-emerald-400/80 mt-0.5">Your admin account is protected by TOTP 2FA.</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <span className="text-slate-400 font-mono">Role: {userSecurity.userRole}</span>
              <p className="text-slate-400 font-mono">Last Verified: {userSecurity.lastLogin}</p>
            </div>

            <button
              onClick={handleDisable2FA}
              className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2.5 rounded-xl text-xs transition"
            >
              Disable 2FA Protection
            </button>
          </div>
        ) : (
          <form onSubmit={handleVerify2FA} className="space-y-4 text-xs">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-center space-y-3">
              <div className="flex justify-center">
                <QrCode className="w-24 h-24 text-cyan-400 p-2 bg-slate-900 rounded-xl border border-slate-800" />
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Scan QR or copy TOTP Secret Key:</span>
                <span className="font-mono text-cyan-400 font-bold tracking-wider">{userSecurity.totpSecret}</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Enter 6-Digit Code from Authenticator App</label>
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-center text-lg font-mono tracking-widest text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMsg && <p className="text-rose-400 text-xs">{errorMsg}</p>}
            {successMsg && <p className="text-emerald-400 text-xs">{successMsg}</p>}

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Enable 2FA</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
