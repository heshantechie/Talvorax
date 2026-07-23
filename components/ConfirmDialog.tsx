import React from 'react';
import { createPortal } from 'react-dom';

interface ConfirmDialogProps {
  open: boolean;
  icon?: string;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string; // omit for a single-button notice dialog
  onConfirm: () => void;
  onCancel?: () => void;
}

// App-styled replacement for window.alert / window.confirm.
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open, icon, title, message, confirmLabel, cancelLabel, onConfirm, onCancel,
}) => {
  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onCancel || onConfirm}
    >
      <div
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {icon && (
          <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl">
            {icon}
          </div>
        )}
        <h3 className="text-xl font-[800] text-slate-900 tracking-tight">{title}</h3>
        <div className="text-sm text-slate-600 font-medium leading-relaxed">{message}</div>
        <div className="flex gap-3 pt-2">
          {cancelLabel && (
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              {cancelLabel}
            </button>
          )}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 transition-colors shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
