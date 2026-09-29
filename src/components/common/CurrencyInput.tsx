import React from 'react';

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number | string;
  onChange: (value: number) => void;
  prefix?: string;
  allowZero?: boolean;
  wrapperClassName?: string;
  prefixClassName?: string;
}

export const formatCurrencyDisplay = (val: number | string, allowZero = false): string => {
  if (val === '' || val === null || val === undefined) return '';
  const num = typeof val === 'string' ? Number(val.replace(/\D/g, '')) : Number(val);
  if (isNaN(num)) return '';
  if (num === 0 && !allowZero) return '';
  return num.toLocaleString('id-ID');
};

export const parseCurrencyInput = (raw: string): number => {
  const digitsOnly = raw.replace(/\D/g, '');
  return digitsOnly ? parseInt(digitsOnly, 10) : 0;
};

export const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  prefix,
  className = '',
  placeholder = '0',
  disabled = false,
  readOnly = false,
  allowZero = false,
  wrapperClassName,
  prefixClassName,
  ...restProps
}) => {
  const displayVal = formatCurrencyDisplay(value, allowZero);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || readOnly) return;
    const raw = e.target.value;
    const parsed = parseCurrencyInput(raw);
    onChange(parsed);
  };

  // If explicit wrapperClassName is supplied (e.g. flex container with prefix)
  if (wrapperClassName) {
    return (
      <div className={wrapperClassName}>
        {prefix && (
          <span className={prefixClassName || "text-xs font-semibold text-slate-400 select-none mr-1.5"}>
            {prefix}
          </span>
        )}
        <input
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={className}
          {...restProps}
        />
      </div>
    );
  }

  // Default prefix handling (relative container)
  if (prefix) {
    const isFull = className.includes('w-full');
    return (
      <div className={`relative ${isFull ? 'w-full' : 'inline-flex items-center shrink-0'}`}>
        <input
          type="text"
          inputMode="numeric"
          value={displayVal}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`${className} ${isFull ? 'pl-10.5' : 'pl-8.5'} font-sans font-bold tracking-tight`}
          {...restProps}
        />
        <span className={`absolute ${isFull ? 'left-3.5' : 'left-2.5'} top-1/2 -translate-y-1/2 text-xs font-medium text-slate-500 pointer-events-none select-none`}>
          {prefix}
        </span>
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayVal}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      className={`${className} font-sans font-bold tracking-tight`}
      {...restProps}
    />
  );
};

export default CurrencyInput;
