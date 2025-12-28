
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">{label}</label>}
    <input 
      className={`w-full bg-surface border border-input rounded-lg px-4 py-2 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/50 ${className}`}
      {...props} 
    />
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }> = ({ label, children, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">{label}</label>}
    <select 
      className={`w-full bg-surface border border-input rounded-lg px-4 py-2 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all ${className}`}
      {...props}
    >
      {children}
    </select>
  </div>
);

export const Textarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }> = ({ label, className = '', ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-bold text-text-muted uppercase tracking-wider mb-1.5">{label}</label>}
    <textarea 
      className={`w-full bg-surface border border-input rounded-lg px-4 py-2 text-sm text-text focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted/50 ${className}`}
      {...props} 
    />
  </div>
);
