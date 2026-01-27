'use client';

import { useEffect, useRef } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

const iconMap = {
  success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' },
  error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' },
  warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-100' },
  info: { icon: Info, color: 'text-blue-500', bg: 'bg-blue-100' },
};

export function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  showCancel = false,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { icon: Icon, color, bg } = iconMap[type];

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-14 h-14 ${bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-7 h-7 ${color}`} />
        </div>

        {/* Title */}
        {title && (
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            {title}
          </h3>
        )}

        {/* Message */}
        <p className="text-gray-600 text-center mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className={`flex gap-3 ${showCancel ? 'justify-center' : 'justify-center'}`}>
          {showCancel && (
            <button
              onClick={onClose}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className={`px-6 py-2.5 font-medium rounded-xl transition-colors ${
              type === 'error'
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : type === 'warning'
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : type === 'success'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-teal-500 hover:bg-teal-600 text-white'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for easier modal usage
import { useState, useCallback } from 'react';

interface ModalState {
  isOpen: boolean;
  title?: string;
  message: string;
  type: ModalType;
  onConfirm?: () => void;
  showCancel?: boolean;
  confirmText?: string;
}

export function useModal() {
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showModal = useCallback((options: Omit<ModalState, 'isOpen'>) => {
    setModalState({ ...options, isOpen: true });
  }, []);

  const hideModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const showSuccess = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'success' });
  }, [showModal]);

  const showError = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'error' });
  }, [showModal]);

  const showWarning = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'warning' });
  }, [showModal]);

  const showInfo = useCallback((message: string, title?: string) => {
    showModal({ message, title, type: 'info' });
  }, [showModal]);

  const confirm = useCallback((message: string, onConfirm: () => void, title?: string) => {
    showModal({
      message,
      title,
      type: 'warning',
      onConfirm,
      showCancel: true,
      confirmText: 'Confirm'
    });
  }, [showModal]);

  return {
    modalState,
    showModal,
    hideModal,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    confirm,
    ModalComponent: (
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onConfirm={modalState.onConfirm}
        showCancel={modalState.showCancel}
        confirmText={modalState.confirmText}
      />
    ),
  };
}

