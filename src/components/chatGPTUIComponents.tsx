import React, { ReactNode, forwardRef } from "react";

/* =====================
   Card
   ===================== */
export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }: CardProps) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

/* =====================
   Button
   ===================== */
export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  const base = "px-3 py-1.5 rounded-lg text-sm font-medium transition";
  const styles: Record<ButtonVariant, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 hover:bg-gray-200",
    outline: "border border-gray-300 hover:bg-gray-100",
    ghost: "text-gray-500 hover:text-red-600",
  };

  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* =====================
   Input
   ===================== */
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      {...props}
      className={`w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
});

/* =====================
   Select (native)
   ===================== */
export interface SelectProps {
  value?: string | number;
  onValueChange: (value: string) => void;
  children: ReactNode;
}

export function Select({ value, onValueChange, children }: SelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {children}
    </select>
  );
}

export function SelectTrigger({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function SelectValue() {
  return null;
}

export function SelectContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export interface SelectItemProps {
  value: string | number;
  children: ReactNode;
}

export function SelectItem({ value, children }: SelectItemProps) {
  return <option value={value}>{children}</option>;
}

/* =====================
   Dialog (Modal)
   ===================== */
export interface DialogProps {
  open: boolean;
  children: ReactNode;
}

export function Dialog({ open, children }: DialogProps) {
  if (!open) return null;
  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {children}
    </div>
  );
}

export function DialogContent({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 ${className}`}
      style={{ position: 'relative', zIndex: 10000 }}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 font-semibold text-lg">{children}</div>;
}

export function DialogTitle({ children }: { children: ReactNode }) {
  return <h3>{children}</h3>;
}
