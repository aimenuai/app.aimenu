import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export function Button({
  type = 'button',
  variant = 'primary',
  loading = false,
  disabled = false,
  children,
  onClick,
  className = '',
}: ButtonProps) {
  const baseStyles = 'w-full py-3.5 px-6 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-4 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[#092033] text-white hover:bg-[#0d2d47] active:bg-[#061620] focus:ring-[#092033]/20 disabled:bg-gray-300 disabled:text-gray-500 shadow-lg hover:shadow-xl',
    secondary: 'bg-gray-200 text-[#092033] hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-300/50 disabled:bg-gray-100 disabled:text-gray-400',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading && <Loader2 className="w-5 h-5 animate-spin" />}
      {children}
    </button>
  );
}
