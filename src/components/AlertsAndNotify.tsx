import React, { useState } from 'react';
import {
  Bell,
  Send,
  Mail,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Sliders,
  ShieldAlert,
  Clock,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { NotificationConfig, SystemAlert } from '../types';

interface AlertsAndNotifyProps {
  config: NotificationConfig;
  onSaveConfig: (updated: NotificationConfig) => void;
  alerts: SystemAlert[];
  onResolveAlert: (id: string) => void;
  onSendTestTelegramAlert: () => void;
  isTestingTelegram: boolean;
}

export const AlertsAndNotify: React.FC<AlertsAndNotifyProps> = ({
  config,
  onSaveConfig,
  alerts,
  onResolveAlert,
  onSendTestTelegramAlert,
  isTestingTelegram,
}) => {
  const [formData, setFormData] = useState<NotificationConfig>(config);
  const [testResultMsg, setTestResultMsg] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);

  const handleChange = (field: keyof NotificationConfig, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onSaveConfig(updated);
  };

  const handleTestEmail = async () => {
    setIsTestingEmail(true);
    try {
      const response = await fetch('/api/alerts/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpHost: formData.smtpHost,
          smtpUser: formData.smtpUser,
          recipientEmail: formData.recipientEmail,
        }),
      });
      const data = await response.json();
      setTestResultMsg(data.message || 'Email test dispatched successfully.');
    } catch (err: any) {
      setTestResultMsg('Error dispatching test email.');
    } finally {
      setIsTestingEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">Real-Time Telegram & Email Alert Engine</h2>
            <p className="text-xs text-slate-400">Instant notification webhooks for system threshold violations and security events</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onSendTestTelegramAlert}
            disabled={isTestingTelegram}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-medium flex items-center space-x-1.5 transition disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isTestingTelegram ? 'Sending Telegram...' : 'Test Telegram Bot Now'}</span>
          </button>
        </div>
      </div>

      {testResultMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center space-x-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{testResultMsg}</span>
        </div>
      )}

      {/* Integration Setup Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telegram Configuration Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>Telegram Bot Notification Setup</span>
            </h3>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.telegramEnabled}
                onChange={(e) => handleChange('telegramEnabled', e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0"
              />
              <span className="text-xs text-slate-300 font-mono">Enabled</span>
            </label>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Telegram Bot Token (from @BotFather)</label>
              <input
                type="text"
                value={formData.telegramBotToken}
                onChange={(e) => handleChange('telegramBotToken', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Telegram Chat ID / Channel ID</label>
              <input
                type="text"
                value={formData.telegramChatId}
                onChange={(e) => handleChange('telegramChatId', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Tip: Send a message to your bot in Telegram or add it to a group channel then paste the Chat ID here.
            </p>
          </div>
        </div>

        {/* Email SMTP Configuration Box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span>Email SMTP Server Setup</span>
            </h3>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.emailEnabled}
                onChange={(e) => handleChange('emailEnabled', e.target.checked)}
                className="rounded bg-slate-950 border-slate-800 text-blue-500 focus:ring-0"
              />
              <span className="text-xs text-slate-300 font-mono">Enabled</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">SMTP Host</label>
              <input
                type="text"
                value={formData.smtpHost}
                onChange={(e) => handleChange('smtpHost', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Port</label>
              <input
                type="number"
                value={formData.smtpPort}
                onChange={(e) => handleChange('smtpPort', Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 font-mono"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-400 mb-1">Recipient Alert Email</label>
              <input
                type="email"
                value={formData.recipientEmail}
                onChange={(e) => handleChange('recipientEmail', e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleTestEmail}
            disabled={isTestingEmail}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 text-xs font-medium transition"
          >
            {isTestingEmail ? 'Sending Test Email...' : 'Send Test SMTP Email'}
          </button>
        </div>
      </div>

      {/* System Alerts History Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-100 flex items-center space-x-2 pb-2 border-b border-slate-800">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Active & Historical System Alerts</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800 bg-slate-950/60">
                <th className="p-3">Timestamp</th>
                <th className="p-3">Severity</th>
                <th className="p-3">Target Device</th>
                <th className="p-3">Alert Title</th>
                <th className="p-3">Alert Message</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {alerts.map((alt) => (
                <tr key={alt.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 text-slate-400 whitespace-nowrap">{alt.timestamp}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alt.severity === 'critical'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {alt.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3 text-slate-200 font-semibold">{alt.nodeName}</td>
                  <td className="p-3 text-cyan-300">{alt.title}</td>
                  <td className="p-3 text-slate-300 max-w-xs truncate">{alt.message}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        alt.status === 'active' ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {alt.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-3">
                    {alt.status === 'active' && (
                      <button
                        onClick={() => onResolveAlert(alt.id)}
                        className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded-lg text-[10px] transition"
                      >
                        Acknowledge
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
