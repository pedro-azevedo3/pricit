'use client';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export function DialogContent({children,className}: {children: React.ReactNode; className?: string}) {
 return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="dialog-overlay fixed inset-0 z-40 bg-[#1b2123]/60 backdrop-blur-sm"/><DialogPrimitive.Content className={cn('dialog-content fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-[var(--surface)] p-6 shadow-2xl',className)}>{children}<DialogPrimitive.Close aria-label="Fechar" className="absolute right-4 top-4 rounded-lg p-2 hover:bg-[var(--surface-soft)]"><X size={18}/></DialogPrimitive.Close></DialogPrimitive.Content></DialogPrimitive.Portal>
}
