import React from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  iconOnly?: boolean;
}

const variantClass: Record<Variant, string> = {
  primary: 'ui-btn-primary',
  secondary: 'ui-btn-secondary',
  ghost: 'ui-btn-ghost',
  danger: 'ui-btn-danger',
};

const sizeClass: Record<Size, string> = {
  sm: 'ui-btn-sm',
  md: '',
  lg: 'ui-btn-lg',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'primary',
  size = 'md',
  iconOnly,
  className,
  children,
  type = 'button',
  ...props
}, ref) => (
  <button
    ref={ref}
    type={type}
    className={cn('ui-btn', variantClass[variant], sizeClass[size], iconOnly && 'ui-btn-icon', className)}
    {...props}
  >
    {children}
  </button>
));

Button.displayName = 'Button';

export default Button;
