import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  isSubmitting?: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'DESTROY & PURGE',
  isSubmitting = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono animate-in fade-in duration-150">
      <div className="bg-[#161B22] border border-[#F85149] w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 bg-[#0D1117] border-b border-[#F85149]/50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#F85149]">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8B949E] hover:text-white hover:bg-[#30363D] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs text-[#E0E0E0] space-y-3">
          <p className="leading-relaxed">{message}</p>
          <div className="p-3 bg-[#F85149]/10 border border-[#F85149]/40 text-[#F85149] text-[11px]">
            ⚠️ <strong>WARNING:</strong> This action cannot be reversed. Metrics and virtual allocation will be purged from the cluster state.
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-[#0D1117] border-t border-[#30363D] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#161B22] border border-[#30363D] text-[#8B949E] hover:text-white uppercase font-bold text-[11px] transition-colors"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="px-5 py-2 bg-[#DA3633] hover:bg-[#F85149] text-white uppercase font-bold text-[11px] transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {isSubmitting ? 'PROCESSING...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
