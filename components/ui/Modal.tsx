import React, { useEffect, useId, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )) as HTMLElement[];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      <div ref={dialogRef} className={cn('ui-modal', sizeClass[size], className)}>
        <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)]">
          <div>
            <h2 id={titleId} className="ui-h1">{title}</h2>
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
