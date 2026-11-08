import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-text)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer', {
  variants: { variant: { default: 'bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-hover)]', outline: 'border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--accent)] hover:text-[#1b2123] text-[var(--foreground)]', ghost: 'hover:bg-[var(--accent)] hover:text-[#1b2123] text-[var(--foreground)]', destructive: 'bg-red-700 text-white hover:bg-red-800' }, size: { default: 'h-11 px-4 py-2', sm: 'h-9 px-3 text-xs', icon: 'h-9 w-9' } }, defaultVariants: { variant: 'default', size: 'default' }
});
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> { asChild?: boolean }
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({className, variant, size, asChild = false, type='button', ...props}, ref) => {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({variant,size,className}))} ref={ref} type={asChild ? undefined : type} {...props}/>;
});
Button.displayName = 'Button';
