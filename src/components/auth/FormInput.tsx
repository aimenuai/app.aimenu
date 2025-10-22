import React, { useState } from 'react';
import { Eye, EyeOff, LucideIcon } from 'lucide-react';

interface FormInputProps {
  id: string;
  name: string;
  type: 'text' | 'email' | 'password' | 'tel';
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  icon?: LucideIcon;
  autoComplete?: string;
  error?: string;
}

export function FormInput({
  id,
  name,
  type,
  label,
  value,
  onChange,
  required = false,
  placeholder,
  icon: Icon,
  autoComplete,
  error,
}: FormInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const inputType = type === 'password' && showPassword ? 'text' : type;
  const hasValue = value.length > 0;

  return (
    <div className="space-y-1">
      <div className="relative">
        {/* Floating label */}
        <label
          htmlFor={id}
          className={`absolute left-12 transition-all duration-200 pointer-events-none ${
            isFocused || hasValue
              ? 'top-2 text-xs text-[#092033] font-medium'
              : 'top-4 text-base text-gray-500'
          }`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>

        {/* Icon */}
        {Icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className={`w-5 h-5 transition-colors ${
              isFocused ? 'text-[#092033]' : 'text-gray-400'
            }`} />
          </div>
        )}

        {/* Input field */}
        <input
          id={id}
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`w-full pl-12 pr-12 pt-6 pb-2 border-2 rounded-lg transition-all duration-200 bg-white ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100'
              : isFocused
              ? 'border-[#092033] ring-4 ring-[#092033]/10'
              : 'border-gray-300 hover:border-gray-400'
          } outline-none`}
        />

        {/* Password toggle */}
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#092033] transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 ml-1 animate-in fade-in slide-in-from-top-1 duration-200">
          {error}
        </p>
      )}
    </div>
  );
}
