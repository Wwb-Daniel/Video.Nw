import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, fullWidth = false, ...props }, ref) => {
    const widthClass = fullWidth ? 'w-full' : '';
    
    return (
      <div className={`${widthClass}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          className={`
            px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-white
            placeholder-gray-400
            focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
            ${widthClass}
            ${className}
          `}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;