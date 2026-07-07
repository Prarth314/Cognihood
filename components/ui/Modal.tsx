import React, { useEffect, useRef } from 'react';
import { cn } from '../../lib/cn';
import Button from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
};

const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'lg',
  className,
}) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div className={cn('ui-modal', sizeClass[size], className)}>
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)]">
          <div>
            <h2 id="modal-title" className="ui-h1">{title}</h2>
            {description && <p className="ui-caption mt-1">{description}</p>}
          </div>
          <Button ref={closeRef} variant="ghost" iconOnly onClick={onClose} aria-label="Close dialog">
            <i className="fas fa-times" aria-hidden="true" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--border)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
