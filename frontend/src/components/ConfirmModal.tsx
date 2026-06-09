import React from 'react';
import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  const { t } = useTranslation();
  const finalTitle = title || t('common.confirmAction', 'Confirm action');
  const finalConfirm = confirmLabel || t('common.confirm', 'Confirm');
  const finalCancel = cancelLabel || t('common.cancel', 'Cancel');
  const processingText = t('common.processing', 'Processing...');

  return (
    <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-xl font-bold text-slate-950">{finalTitle}</h2>
        <p className="text-slate-500 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-ghost"
            disabled={isProcessing}
          >
            {finalCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 btn-danger disabled:opacity-50"
            disabled={isProcessing}
          >
            {isProcessing ? processingText : finalConfirm}
          </button>
        </div>
      </div>
    </div>
  );
};





