import React from 'react';

export default function CurrencyInput({ value, defaultValue, onChange, ...props }) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const activeValue = isControlled ? value : internalValue;

  const format = (val) => {
    if (val === '' || val === null || val === undefined) return '';
    const str = String(val).replace(/,/g, '');
    const parts = str.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/,/g, '');
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      if (!isControlled) setInternalValue(raw);
      if (onChange) onChange({ ...e, target: { ...e.target, value: raw } });
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={format(activeValue)}
      onChange={handleChange}
      {...props}
    />
  );
}
